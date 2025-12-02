import jwt from "jsonwebtoken";
import Room from "../models/Room.model.js";
import Match from "../models/Match.model.js";
import User from "../models/User.model.js";
import GameEngine from "../services/gameEngine.service.js";
import matchmakingService from "../services/matchmaking.service.js";
import logger from "../config/logger.js";
import { bingoHandler } from "./bingoHandler.js";
import memoryManager from "../utils/memoryManager.js";

// Use memory manager for efficient connection handling
const activeConnections = memoryManager.activeConnections;
const roomTimers = memoryManager.roomTimers;

// Helper function to start room deletion timer
function startRoomTimer(io, roomId, timeoutMinutes, reason) {
  const timer = setTimeout(async () => {
    try {
      const room = await Room.findOne({ roomId });
      if (room) {
        // Notify all players
        io.to(roomId).emit("room_disbanded", {
          reason,
          message:
            reason === "timeout_no_start"
              ? "Room disbanded: Game not started within 15 minutes"
              : "Room disbanded: Maximum room duration (30 minutes) reached",
        });

        // Remove all players from the room
        await Room.deleteOne({ roomId });
        memoryManager.clearRoomTimer(roomId);
        logger.info(`Room ${roomId} auto-deleted: ${reason}`);
      }
    } catch (error) {
      logger.error(`Failed to auto-delete room ${roomId}:`, error);
    }
  }, timeoutMinutes * 60 * 1000);

  memoryManager.setRoomTimer(roomId, timer);
  logger.info(
    `Room timer started for ${roomId}: ${timeoutMinutes} minutes (${reason})`
  );
}

// Helper function to clear room timer
function clearRoomTimer(roomId) {
  memoryManager.clearRoomTimer(roomId);
  logger.info(`Room timer cleared for ${roomId}`);
}

export const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return next(new Error("User not found"));
      }

      if (user.isBanned) {
        return next(new Error("User is banned"));
      }

      socket.userId = user._id.toString();
      socket.username = user.username;
      socket.user = user;

      next();
    } catch (error) {
      logger.error("Socket authentication error:", error);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`User connected: ${socket.username} (${socket.id})`);

    // Track connection with memory manager
    memoryManager.addConnection(socket.userId, socket.id);

    // Initialize Bingo handlers with error boundary
    try {
      bingoHandler(io, socket);
    } catch (error) {
      logger.error(
        `Error initializing bingo handler for ${socket.username}:`,
        error
      );
    }

    // Handle reconnection - restore player's game state
    socket.on("request_reconnect", async ({ roomId }) => {
      try {
        logger.info(
          `${socket.username} requesting reconnect to room ${roomId}`
        );

        // Clear reconnection timer if exists
        memoryManager.clearReconnectTimer(socket.userId);

        const room = await Room.findOne({ roomId });
        if (!room) {
          return socket.emit("error", { message: "Room not found" });
        }

        const playerIndex = room.players.findIndex(
          (p) => p.userId.toString() === socket.userId
        );

        if (playerIndex === -1) {
          return socket.emit("error", { message: "You are not in this room" });
        }

        // Update player connection status
        room.players[playerIndex].connected = true;
        room.players[playerIndex].socketId = socket.id;
        room.players[playerIndex].lastActivity = new Date();
        await room.save();

        // Rejoin socket room and track connection
        socket.join(roomId);
        memoryManager.addConnection(socket.userId, socket.id, roomId);

        // Send current room state
        socket.emit("reconnect_success", {
          room: room.toObject(),
          message: "Reconnected successfully",
        });

        // Notify others
        socket.to(roomId).emit("player_reconnected", {
          userId: socket.userId,
          username: socket.username,
        });

        // If Bingo game, restore game state
        if (room.gameType === "bingo") {
          const BingoGame = (await import("../models/BingoGame.model.js"))
            .default;
          const game = await BingoGame.findOne({ roomId: room._id });
          if (game) {
            const playerGameIndex = game.players.findIndex(
              (p) => p.userId === socket.userId
            );
            if (playerGameIndex !== -1) {
              game.players[playerGameIndex].connected = true;
              game.players[playerGameIndex].socketId = socket.id;
              game.players[playerGameIndex].lastActivity = new Date();
              await game.save();
            }
            socket.emit("bingo:game_state", game);
          }
        }

        logger.info(`${socket.username} successfully reconnected to ${roomId}`);
      } catch (error) {
        logger.error("Reconnect error:", error);
        socket.emit("error", { message: "Reconnection failed" });
      }
    });

    socket.on("join_room", async ({ roomId, passkey }) => {
      try {
        // Ensure activeConnections has the latest socket ID
        activeConnections.set(socket.userId, socket.id);
        logger.info(
          `${socket.username} joining room ${roomId}, socket ID: ${socket.id}`
        );

        // Fetch room WITH passkey field for validation
        const room = await Room.findOne({ roomId }).select("+passkey");

        if (!room) {
          return socket.emit("error", { message: "Room not found" });
        }

        const playerExists = room.players.some(
          (p) => p.userId.toString() === socket.userId
        );

        // If player already exists, this is a reconnection
        if (playerExists) {
          const playerIndex = room.players.findIndex(
            (p) => p.userId.toString() === socket.userId
          );
          room.players[playerIndex].connected = true;
          room.players[playerIndex].socketId = socket.id;
          room.players[playerIndex].lastActivity = new Date();
          await room.save();

          socket.join(roomId);
          socket.currentRoom = roomId;

          const sanitizedRoom = await Room.findOne({ roomId }).select(
            "-passkey"
          );
          socket.emit("joined_room", {
            room: sanitizedRoom,
            reconnected: true,
          });
          io.to(roomId).emit("room_updated", sanitizedRoom);

          logger.info(`${socket.username} reconnected to room ${roomId}`);
          return;
        }

        // Check if room has a passkey (only if player not already in room)
        if (!playerExists && room.passkey) {
          // Passkey is required - check if provided
          if (!passkey) {
            return socket.emit("error", { message: "Passkey required" });
          }

          // Validate the provided passkey
          const isValid = await room.comparePasskey(passkey);
          if (!isValid) {
            return socket.emit("error", { message: "Invalid passkey" });
          }
        }

        if (!playerExists && !room.isFull()) {
          await room.addPlayer({
            userId: socket.userId,
            username: socket.username,
            displayName: socket.user.displayName,
            avatar: socket.user.avatar,
            isReady: false,
          });
        }

        socket.join(roomId);
        socket.currentRoom = roomId;

        const sanitizedRoom = await Room.findOne({ roomId }).select("-passkey");

        io.to(roomId).emit("room_updated", sanitizedRoom);

        socket.emit("joined_room", { room: sanitizedRoom });

        // Start timers for new rooms
        if (!roomTimers.has(roomId)) {
          // 15-minute timer for no game start
          startRoomTimer(io, roomId, 15, "timeout_no_start");
          // 30-minute absolute timer
          startRoomTimer(io, roomId, 30, "max_duration");
        }

        logger.info(`${socket.username} joined room ${roomId}`);
      } catch (error) {
        logger.error("Join room error:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    socket.on("leave_room", async ({ roomId }) => {
      try {
        const room = await Room.findOne({ roomId });

        if (!room) {
          return socket.emit("error", { message: "Room not found" });
        }

        // If game is in progress, end the game and declare winner
        if (room.status === "playing") {
          logger.info(
            `Player ${socket.username} left during active game in room ${roomId}`
          );

          // Find the winner (highest score)
          const scores = room.gameState?.scores || {};
          let highestScore = -1;
          let winnerId = null;
          let winnerName = null;

          Object.entries(scores).forEach(([userId, score]) => {
            if (score > highestScore) {
              highestScore = score;
              winnerId = userId;
            }
          });

          // Get winner details
          if (winnerId) {
            const winnerPlayer = room.players.find(
              (p) => p.userId.toString() === winnerId
            );
            winnerName =
              winnerPlayer?.displayName || winnerPlayer?.username || "Unknown";
          }

          // End the game
          room.status = "finished";
          await room.save();

          // Complete Match document
          if (room.gameState && room.gameState.matchId) {
            try {
              const match = await Match.findById(room.gameState.matchId);
              if (match) {
                const sortedPlayers = room.players
                  .map((p) => ({
                    ...p,
                    finalScore: scores[p.userId.toString()] || 0,
                  }))
                  .sort((a, b) => b.finalScore - a.finalScore);

                match.players = sortedPlayers.map((player, index) => ({
                  userId: player.userId,
                  username: player.username,
                  displayName: player.displayName,
                  finalScore: player.finalScore,
                  placement: index + 1,
                }));

                match.winner = winnerId
                  ? {
                      userId: winnerId,
                      username: winnerName,
                      displayName: winnerName,
                      finalScore: highestScore,
                    }
                  : null;

                match.status = "abandoned";
                match.endTime = new Date();
                match.duration = Math.floor(
                  (match.endTime - match.startTime) / 1000
                );

                await match.save();
                logger.info(
                  `Match ${match._id} marked as abandoned due to player leave`
                );
              }
            } catch (matchErr) {
              logger.error("Failed to save match on player leave:", matchErr);
            }
          }

          // Notify all players that game ended
          io.to(roomId).emit("game_finished", {
            reason: "player_left",
            winner: winnerId
              ? {
                  userId: winnerId,
                  username: winnerName,
                  score: highestScore,
                }
              : null,
            finalScores: scores,
            message: `Game ended because ${socket.username} left the room`,
          });

          logger.info(
            `Game ended in room ${roomId}. Winner: ${winnerName} with ${highestScore} points`
          );
        }

        // Check if leaving player is the host
        const isHost = room.host.toString() === socket.userId;

        await room.removePlayer(socket.userId);

        socket.leave(roomId);
        socket.currentRoom = null;

        if (isHost && room.players.length > 0) {
          // Host left - disband the room
          io.to(roomId).emit("room_disbanded", {
            reason: "host_left",
            message: "Room disbanded: Host has left the game",
          });
          await Room.deleteOne({ roomId });
          clearRoomTimer(roomId);
          logger.info(`Room ${roomId} disbanded because host left`);
        } else if (room.players.length === 0) {
          await Room.deleteOne({ roomId });
          clearRoomTimer(roomId);
          logger.info(`Room ${roomId} deleted (empty)`);
        } else {
          const updatedRoom = await Room.findOne({ roomId }).select("-passkey");
          io.to(roomId).emit("room_updated", updatedRoom);
        }

        socket.emit("left_room", { roomId });

        logger.info(`${socket.username} left room ${roomId}`);
      } catch (error) {
        logger.error("Leave room error:", error);
        socket.emit("error", { message: "Failed to leave room" });
      }
    });

    socket.on("player_ready", async ({ roomId, isReady }) => {
      try {
        const room = await Room.findOne({ roomId });

        if (!room) {
          return socket.emit("error", { message: "Room not found" });
        }

        const player = room.players.find(
          (p) => p.userId.toString() === socket.userId
        );

        if (!player) {
          return socket.emit("error", { message: "Not in room" });
        }

        player.isReady = isReady;
        await room.save();

        const updatedRoom = await Room.findOne({ roomId }).select("-passkey");
        io.to(roomId).emit("room_updated", updatedRoom);

        // Check if all 4 players are ready
        const allReady = room.players.every((p) => p.isReady);
        const hasEnoughPlayers = room.players.length === 4;

        if (allReady && hasEnoughPlayers) {
          // Notify host that game can be started
          const hostSocketId = activeConnections.get(room.host.toString());
          if (hostSocketId) {
            io.to(hostSocketId).emit("can_start_game", { roomId });
          }
        }

        logger.info(
          `${socket.username} ready status: ${isReady} in room ${roomId}`
        );
      } catch (error) {
        logger.error("Player ready error:", error);
        socket.emit("error", { message: "Failed to update ready status" });
      }
    });

    socket.on("start_round", async ({ roomId }) => {
      try {
        const room = await Room.findOne({ roomId });

        if (!room) {
          return socket.emit("error", { message: "Room not found" });
        }

        if (room.host.toString() !== socket.userId) {
          return socket.emit("error", { message: "Only host can start game" });
        }

        // Validate: must have exactly 4 players
        if (room.players.length !== 4) {
          return socket.emit("error", {
            message: "Need exactly 4 players to start",
          });
        }

        // Validate: all players must be ready
        const allReady = room.players.every((p) => p.isReady);
        if (!allReady) {
          return socket.emit("error", { message: "All players must be ready" });
        }

        // Update room status
        room.status = "playing";
        room.currentRound = 1;
        room.gameStartedAt = new Date();

        // Clear the 15-minute "no start" timer since game has started
        // Keep the 30-minute max duration timer running
        clearRoomTimer(roomId);
        startRoomTimer(io, roomId, 30, "max_duration");

        // Initialize scores
        if (!room.gameState) {
          room.gameState = {};
        }
        room.gameState.scores = {};
        room.players.forEach((player) => {
          room.gameState.scores[player.userId.toString()] = 0;
        });

        // Select random player to shuffle
        const randomPlayerIndex = Math.floor(
          Math.random() * room.players.length
        );
        const shufflePlayer = room.players[randomPlayerIndex];
        const shufflerIdString = shufflePlayer.userId.toString();
        room.gameState.currentShuffler = shufflerIdString;

        // Create Match document for history tracking
        const match = new Match({
          roomId: room.roomId,
          mode: room.mode,
          players: room.players.map((p) => ({
            userId: p.userId,
            username: p.username,
            displayName: p.displayName,
            finalScore: 0,
            placement: 0,
          })),
          rounds: [],
          status: "in-progress",
          startTime: new Date(),
        });
        await match.save();

        // Store matchId in room for reference
        room.gameState.matchId = match._id.toString();

        // Save everything at once
        await room.save();

        logger.info(
          `Shuffler selected: ${shufflerIdString} (${
            shufflePlayer.displayName || shufflePlayer.username
          })`
        );
        logger.info(`Room gameState after save:`, room.gameState);

        // Notify all players that game is starting
        io.to(roomId).emit("game_started", {
          roomId,
          shufflerUserId: shufflerIdString,
          shufflerName: shufflePlayer.displayName || shufflePlayer.username,
          round: 1,
        });

        // Also emit room_updated with full room data for anyone who joins late
        io.to(roomId).emit("room_updated", room);

        logger.info(
          `Game started in room ${roomId} by host ${socket.username}`
        );
      } catch (error) {
        logger.error("Start round error:", error);
        socket.emit("error", { message: "Failed to start game" });
      }
    });

    socket.on("shuffle_roles", async ({ roomId }) => {
      try {
        const room = await Room.findOne({ roomId });

        if (!room) {
          return socket.emit("error", { message: "Room not found" });
        }

        logger.info(
          `Shuffle request from ${socket.username} (${socket.userId})`
        );
        logger.info(
          `Current shuffler in room: ${room.gameState.currentShuffler}`
        );
        logger.info(
          `Comparison: "${socket.userId}" === "${
            room.gameState.currentShuffler
          }" = ${socket.userId === room.gameState.currentShuffler}`
        );

        // Verify this is the designated shuffler
        if (room.gameState.currentShuffler !== socket.userId) {
          logger.warn(`Shuffle rejected: ${socket.userId} is not the shuffler`);
          return socket.emit("error", { message: "You are not the shuffler" });
        }

        // Assign roles randomly
        const roles = ["Raja", "Mantri", "Sipahi", "Chor"];
        const shuffledRoles = roles.sort(() => Math.random() - 0.5);

        // Create role assignments
        room.gameState.roles = {};
        let sipahiUserId = null;
        let chorUserId = null;

        room.players.forEach((player, index) => {
          const userId = player.userId.toString();
          const role = shuffledRoles[index];
          room.gameState.roles[userId] = role;

          if (role === "Sipahi") {
            sipahiUserId = userId;
          }
          if (role === "Chor") {
            chorUserId = userId;
          }
        });

        room.gameState.currentSipahi = sipahiUserId;
        room.gameState.chorUserId = chorUserId;
        room.gameState.roundStartTime = new Date();

        await room.save();

        logger.info(`Roles assigned:`, room.gameState.roles);
        logger.info(
          `Active connections:`,
          Array.from(activeConnections.keys())
        );

        // Send each player their role privately
        let rolesAssigned = 0;
        room.players.forEach((player) => {
          const userId = player.userId.toString();
          const socketId = activeConnections.get(userId);
          const role = room.gameState.roles[userId];

          logger.info(
            `Assigning role to ${player.username} (${userId}): ${role}, socketId: ${socketId}`
          );

          if (socketId) {
            io.to(socketId).emit("role_assigned", {
              role,
              roomId,
              isSipahi: role === "Sipahi",
            });
            rolesAssigned++;
          } else {
            logger.warn(
              `No socket connection found for user ${userId} (${player.username})`
            );
          }
        });

        logger.info(
          `Total roles assigned: ${rolesAssigned} out of ${room.players.length}`
        );

        // Notify all players that roles have been assigned
        io.to(roomId).emit("roles_shuffled", {
          roomId,
          sipahiUserId,
          round: room.currentRound,
        });

        logger.info(`Roles shuffled in room ${roomId} by ${socket.username}`);
      } catch (error) {
        logger.error("Shuffle roles error:", error);
        socket.emit("error", { message: "Failed to shuffle roles" });
      }
    });

    socket.on("guess_chor", async ({ roomId, guessedUserId }) => {
      try {
        const room = await Room.findOne({ roomId });

        if (!room) {
          return socket.emit("error", { message: "Room not found" });
        }

        // Verify this is the Sipahi
        const playerRole = room.gameState.roles[socket.userId];
        if (playerRole !== "Sipahi") {
          return socket.emit("error", { message: "Only Sipahi can guess" });
        }

        // Verify guess hasn't been made yet
        if (room.gameState.guessedUserId) {
          return socket.emit("error", { message: "Already guessed" });
        }

        // Get the actual Chor
        const actualChorUserId = room.gameState.chorUserId;
        const isCorrect = actualChorUserId === guessedUserId;

        // Calculate points for all players
        const pointsDistribution = {};
        room.players.forEach((player) => {
          const userId = player.userId.toString();
          const role = room.gameState.roles[userId];
          let points = 0;

          if (role === "Raja") {
            // Raja always gets 1000 points regardless of guess result
            points = 1000;
          } else if (role === "Mantri") {
            // Mantri always gets 500 points regardless of guess result
            points = 500;
          } else if (role === "Sipahi") {
            // Sipahi gets 300 points only if guess is correct
            points = isCorrect ? 300 : 0;
          } else if (role === "Chor") {
            // Chor gets 300 points only if guess is wrong
            points = isCorrect ? 0 : 300;
          }

          pointsDistribution[userId] = points;

          // Update total scores
          if (!room.gameState.scores[userId]) {
            room.gameState.scores[userId] = 0;
          }
          room.gameState.scores[userId] += points;
        });

        // Mark gameState as modified so MongoDB saves the changes
        room.markModified("gameState");

        // Save guess result
        room.gameState.guessedUserId = guessedUserId;
        room.gameState.isCorrectGuess = isCorrect;
        room.gameState.pointsDistribution = pointsDistribution;

        await room.save();

        // Save round data to Match document
        if (room.gameState.matchId) {
          try {
            const match = await Match.findById(room.gameState.matchId);
            if (match) {
              const sipahiPlayer = room.players.find(
                (p) => p.userId.toString() === socket.userId
              );
              const chorPlayer = room.players.find(
                (p) => p.userId.toString() === actualChorUserId
              );
              const guessedPlayerData = room.players.find(
                (p) => p.userId.toString() === guessedUserId
              );

              match.rounds.push({
                roundNumber: room.currentRound,
                roles: room.gameState.roles,
                sipahi: {
                  userId: socket.userId,
                  username: socket.username,
                },
                chor: {
                  userId: actualChorUserId,
                  username: chorPlayer.username,
                },
                guessedPlayer: {
                  userId: guessedUserId,
                  username: guessedPlayerData.username,
                },
                correctGuess: isCorrect,
                roundScores: pointsDistribution,
                startTime: new Date(),
                endTime: new Date(),
              });
              await match.save();
              logger.info(
                `Round ${room.currentRound} data saved to match ${match._id}`
              );
            }
          } catch (matchErr) {
            logger.error("Failed to save round data to match:", matchErr);
          }
        }

        logger.info(`Points distribution for round:`, pointsDistribution);
        logger.info(`Total scores after round:`, room.gameState.scores);

        // Get guessed player name
        const guessedPlayer = room.players.find(
          (p) => p.userId.toString() === guessedUserId
        );
        const chorPlayer = room.players.find(
          (p) => p.userId.toString() === actualChorUserId
        );

        // Reveal results to all players
        logger.info(
          `Sending guess_result with totalScores:`,
          room.gameState.scores
        );
        io.to(roomId).emit("guess_result", {
          roomId,
          sipahiUserId: socket.userId,
          sipahiName: socket.user.displayName || socket.username,
          guessedUserId,
          guessedName: guessedPlayer.displayName || guessedPlayer.username,
          actualChorUserId,
          chorName: chorPlayer.displayName || chorPlayer.username,
          isCorrect,
          pointsDistribution,
          totalScores: room.gameState.scores,
          roles: room.gameState.roles,
        });

        logger.info(
          `${socket.username} guessed ${
            isCorrect ? "correctly" : "incorrectly"
          } in room ${roomId}`
        );

        // Move to next round after 5 seconds
        setTimeout(async () => {
          try {
            const updatedRoom = await Room.findOne({ roomId });

            if (
              updatedRoom &&
              updatedRoom.currentRound < updatedRoom.totalRounds
            ) {
              // Start next round
              updatedRoom.currentRound += 1;
              updatedRoom.gameState.roles = null;
              updatedRoom.gameState.guessedUserId = null;
              updatedRoom.gameState.isCorrectGuess = null;
              updatedRoom.gameState.pointsDistribution = null;

              // Select new random shuffler
              const randomIndex = Math.floor(
                Math.random() * updatedRoom.players.length
              );
              const newShuffler = updatedRoom.players[randomIndex];
              updatedRoom.gameState.currentShuffler =
                newShuffler.userId.toString();

              await updatedRoom.save();

              logger.info(
                `Sending next_round with totalScores:`,
                updatedRoom.gameState.scores
              );
              io.to(roomId).emit("next_round", {
                roomId,
                round: updatedRoom.currentRound,
                shufflerUserId: newShuffler.userId.toString(),
                shufflerName: newShuffler.displayName || newShuffler.username,
                totalScores: updatedRoom.gameState.scores,
              });
            } else if (updatedRoom) {
              // Game finished
              updatedRoom.status = "finished";
              await updatedRoom.save();

              // Determine winner
              let winnerId = null;
              let maxScore = -1;
              Object.entries(updatedRoom.gameState.scores).forEach(
                ([userId, score]) => {
                  if (score > maxScore) {
                    maxScore = score;
                    winnerId = userId;
                  }
                }
              );

              const winner = updatedRoom.players.find(
                (p) => p.userId.toString() === winnerId
              );

              // Complete Match document
              if (updatedRoom.gameState.matchId) {
                try {
                  const match = await Match.findById(
                    updatedRoom.gameState.matchId
                  );
                  if (match) {
                    // Update players with final scores and placements
                    const sortedPlayers = updatedRoom.players
                      .map((p) => ({
                        ...p,
                        finalScore:
                          updatedRoom.gameState.scores[p.userId.toString()] ||
                          0,
                      }))
                      .sort((a, b) => b.finalScore - a.finalScore);

                    match.players = sortedPlayers.map((player, index) => ({
                      userId: player.userId,
                      username: player.username,
                      displayName: player.displayName,
                      finalScore: player.finalScore,
                      placement: index + 1,
                    }));

                    match.winner = {
                      userId: winnerId,
                      username: winner.username,
                      displayName: winner.displayName,
                      finalScore: maxScore,
                    };
                    match.status = "completed";
                    match.endTime = new Date();
                    match.duration = Math.floor(
                      (match.endTime - match.startTime) / 1000
                    );

                    await match.save();
                    logger.info(
                      `Match ${match._id} completed and saved to history`
                    );
                  }
                } catch (matchErr) {
                  logger.error("Failed to complete match document:", matchErr);
                }
              }

              // Update leaderboard stats for all players
              for (const player of updatedRoom.players) {
                try {
                  const userId = player.userId.toString();
                  const playerScore = updatedRoom.gameState.scores[userId] || 0;
                  const isWinner = userId === winnerId;

                  await User.findByIdAndUpdate(userId, {
                    $inc: {
                      "stats.matchesPlayed": 1,
                      "stats.totalPoints": playerScore,
                      ...(isWinner && { "stats.wins": 1 }),
                    },
                  });

                  logger.info(
                    `Updated stats for ${player.username}: +${playerScore} points, isWinner: ${isWinner}`
                  );
                } catch (err) {
                  logger.error(
                    `Failed to update stats for player ${player.userId}:`,
                    err
                  );
                }
              }

              io.to(roomId).emit("game_finished", {
                roomId,
                winnerId,
                winnerName: winner.displayName || winner.username,
                winnerScore: maxScore,
                finalScores: updatedRoom.gameState.scores,
              });

              logger.info(
                `Game finished in room ${roomId}, winner: ${winner.username} with ${maxScore} points`
              );
            }
          } catch (err) {
            logger.error("Next round error:", err);
          }
        }, 5000);
      } catch (error) {
        logger.error("Guess chor error:", error);
        socket.emit("error", { message: "Failed to process guess" });
      }
    });

    socket.on("send_message", async ({ roomId, message }) => {
      try {
        const room = await Room.findOne({ roomId });

        if (!room) {
          return socket.emit("error", { message: "Room not found" });
        }

        const playerInRoom = room.players.some(
          (p) => p.userId.toString() === socket.userId
        );

        if (!playerInRoom) {
          return socket.emit("error", { message: "Not in room" });
        }

        const messageData = {
          userId: socket.userId,
          username: socket.username,
          displayName: socket.user.displayName,
          avatar: socket.user.avatar,
          message,
          timestamp: Date.now(),
        };

        io.to(roomId).emit("new_message", messageData);

        logger.info(`${socket.username} sent message in room ${roomId}`);
      } catch (error) {
        logger.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("join_matchmaking", async ({ mode }) => {
      try {
        const result = matchmakingService.addToQueue(
          socket.userId,
          socket.username,
          socket.user.displayName,
          socket.user.avatar,
          mode
        );

        if (!result.success) {
          return socket.emit("error", { message: result.message });
        }

        socket.emit("matchmaking_joined", {
          mode,
          position: result.position,
        });

        const room = await matchmakingService.tryMatchmaking(mode);

        if (room) {
          const playerIds = room.players.map((p) => p.userId.toString());

          playerIds.forEach((userId) => {
            const socketId = activeConnections.get(userId);
            if (socketId) {
              io.to(socketId).emit("match_found", {
                roomId: room.roomId,
                room,
              });
            }
          });
        }

        logger.info(`${socket.username} joined ${mode} matchmaking`);
      } catch (error) {
        logger.error("Join matchmaking error:", error);
        socket.emit("error", { message: "Failed to join matchmaking" });
      }
    });

    socket.on("leave_matchmaking", () => {
      try {
        const result = matchmakingService.removeFromQueue(socket.userId);

        socket.emit("matchmaking_left", { success: result.success });

        logger.info(`${socket.username} left matchmaking`);
      } catch (error) {
        logger.error("Leave matchmaking error:", error);
      }
    });

    socket.on("webrtc_signal", ({ roomId, targetUserId, signal }) => {
      const targetSocketId = activeConnections.get(targetUserId);

      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc_signal", {
          fromUserId: socket.userId,
          signal,
        });

        logger.info(`WebRTC signal from ${socket.username} to ${targetUserId}`);
      }
    });

    socket.on("disconnect", async () => {
      try {
        logger.info(`User disconnected: ${socket.username} (${socket.id})`);

        // Remove connection tracking
        memoryManager.removeConnection(socket.userId);
        matchmakingService.removeFromQueue(socket.userId);

        if (socket.currentRoom) {
          const room = await Room.findOne({ roomId: socket.currentRoom });

          if (room) {
            // Mark player as disconnected but don't remove them yet
            const playerIndex = room.players.findIndex(
              (p) => p.userId.toString() === socket.userId
            );

            if (playerIndex !== -1) {
              room.players[playerIndex].connected = false;
              room.players[playerIndex].lastActivity = new Date();
              await room.save();

              // Notify others about disconnection
              socket.to(socket.currentRoom).emit("player_disconnected", {
                userId: socket.userId,
                username: socket.username,
                temporary: true, // Indicate this might be temporary
              });

              logger.info(
                `${socket.username} marked as disconnected in room ${socket.currentRoom}`
              );
            }

            // For Bingo games, mark player as disconnected
            if (room.gameType === "bingo") {
              const BingoGame = (await import("../models/BingoGame.model.js"))
                .default;
              const game = await BingoGame.findOne({ roomId: room._id });
              if (game) {
                const gamePlayerIndex = game.players.findIndex(
                  (p) => p.userId === socket.userId
                );
                if (gamePlayerIndex !== -1) {
                  game.players[gamePlayerIndex].connected = false;
                  game.players[gamePlayerIndex].lastActivity = new Date();
                  await game.save();
                }
              }
            }

            // Set timeout to actually remove player if they don't reconnect
            // Give them 2 minutes to reconnect
            const reconnectTimer = setTimeout(async () => {
              try {
                const updatedRoom = await Room.findOne({
                  roomId: socket.currentRoom,
                });
                if (!updatedRoom) return;

                const player = updatedRoom.players.find(
                  (p) => p.userId.toString() === socket.userId
                );

                // If player is still disconnected after timeout
                if (player && !player.connected) {
                  logger.info(
                    `${socket.username} did not reconnect, ending game in room ${socket.currentRoom}`
                  );

                  // If game is in progress, end it and declare winner
                  if (updatedRoom.status === "playing") {
                    logger.info(
                      `Player ${socket.username} disconnected during active game in room ${socket.currentRoom}`
                    );

                    // Find the winner (highest score)
                    const scores = room.gameState?.scores || {};
                    let highestScore = -1;
                    let winnerId = null;
                    let winnerName = null;

                    Object.entries(scores).forEach(([userId, score]) => {
                      if (score > highestScore) {
                        highestScore = score;
                        winnerId = userId;
                      }
                    });

                    // Get winner details
                    if (winnerId) {
                      const winnerPlayer = room.players.find(
                        (p) => p.userId.toString() === winnerId
                      );
                      winnerName =
                        winnerPlayer?.displayName ||
                        winnerPlayer?.username ||
                        "Unknown";
                    }

                    // End the game
                    room.status = "finished";
                    await room.save();

                    // Complete Match document
                    if (room.gameState && room.gameState.matchId) {
                      try {
                        const match = await Match.findById(
                          room.gameState.matchId
                        );
                        if (match) {
                          const sortedPlayers = room.players
                            .map((p) => ({
                              ...p,
                              finalScore: scores[p.userId.toString()] || 0,
                            }))
                            .sort((a, b) => b.finalScore - a.finalScore);

                          match.players = sortedPlayers.map(
                            (player, index) => ({
                              userId: player.userId,
                              username: player.username,
                              displayName: player.displayName,
                              finalScore: player.finalScore,
                              placement: index + 1,
                            })
                          );

                          match.winner = winnerId
                            ? {
                                userId: winnerId,
                                username: winnerName,
                                displayName: winnerName,
                                finalScore: highestScore,
                              }
                            : null;

                          match.status = "abandoned";
                          match.endTime = new Date();
                          match.duration = Math.floor(
                            (match.endTime - match.startTime) / 1000
                          );

                          await match.save();
                          logger.info(
                            `Match ${match._id} marked as abandoned due to disconnect`
                          );
                        }
                      } catch (matchErr) {
                        logger.error(
                          "Failed to save match on disconnect:",
                          matchErr
                        );
                      }
                    }

                    // Notify all players that game ended
                    io.to(socket.currentRoom).emit("game_finished", {
                      reason: "player_disconnected",
                      winner: winnerId
                        ? {
                            userId: winnerId,
                            username: winnerName,
                            score: highestScore,
                          }
                        : null,
                      finalScores: scores,
                      message: `Game ended because ${socket.username} left the room`,
                    });

                    logger.info(
                      `Game ended in room ${socket.currentRoom}. Winner: ${winnerName} with ${highestScore} points`
                    );
                  }

                  await room.removePlayer(socket.userId);

                  if (room.players.length === 0) {
                    await Room.deleteOne({ roomId: socket.currentRoom });
                    clearRoomTimer(socket.currentRoom);
                    logger.info(
                      `Room ${socket.currentRoom} deleted (empty after disconnect)`
                    );
                  } else {
                    // Check if disconnected player was the host
                    const isHost = room.host.toString() === socket.userId;

                    if (isHost) {
                      // Host disconnected - disband room
                      io.to(socket.currentRoom).emit("room_disbanded", {
                        reason: "host_disconnected",
                        message: "Room disbanded: Host has disconnected",
                      });
                      await Room.deleteOne({ roomId: socket.currentRoom });
                      clearRoomTimer(socket.currentRoom);
                      logger.info(
                        `Room ${socket.currentRoom} disbanded because host disconnected`
                      );
                    } else {
                      const updatedRoom = await Room.findOne({
                        roomId: socket.currentRoom,
                      }).select("-passkey");
                      if (updatedRoom) {
                        io.to(socket.currentRoom).emit(
                          "room_updated",
                          updatedRoom
                        );
                      }
                    }
                  }
                }
              } catch (timeoutError) {
                logger.error(
                  "Error in reconnect timeout handler:",
                  timeoutError
                );
              }
            }, 2 * 60 * 1000); // 2 minutes

            // Track reconnection timer with memory manager
            memoryManager.setReconnectTimer(socket.userId, reconnectTimer);
          }
        }

        logger.info(`User disconnected: ${socket.username} (${socket.id})`);
      } catch (error) {
        logger.error("Disconnect error:", error);
      }
    });
  });

  logger.info("Socket.IO initialized successfully");
};

async function startGame(io, roomId) {
  try {
    const room = await Room.findOne({ roomId });

    if (!room) return;

    room.status = "in-game";
    room.currentRound = 1;
    room.gameState = {
      matchId: null,
      currentRoles: new Map(),
      roundScores: new Map(),
      sipahiGuessed: false,
      guessedChor: null,
    };

    const roles = GameEngine.assignRoles(room.players.length);
    room.gameState.currentRoles = new Map(
      room.players.map((p, i) => [p.userId.toString(), roles[i]])
    );

    await room.save();

    io.to(roomId).emit("game_started", {
      roundNumber: 1,
      totalRounds: room.totalRounds,
    });

    logger.info(`Game started in room ${roomId}`);
  } catch (error) {
    logger.error("Start game error:", error);
  }
}

async function endGame(io, roomId) {
  try {
    const room = await Room.findOne({ roomId });
    const match = await Match.findOne({ matchId: room.gameState.matchId });

    if (!room || !match) return;

    const finalResults = GameEngine.calculateFinalResults(
      match.rounds,
      room.players
    );

    match.players = finalResults.results.map((result, index) => ({
      userId: result.userId,
      username: result.username,
      displayName: result.displayName,
      finalScore: result.totalScore,
      placement: index + 1,
      roleStats: result.roleStats,
    }));

    match.winner = finalResults.winner;
    match.status = "completed";
    match.endedAt = Date.now();

    await match.save();

    for (let i = 0; i < match.players.length; i++) {
      const player = match.players[i];
      const user = await User.findById(player.userId);

      if (!user) continue;

      user.stats.totalPoints += player.finalScore;

      if (i === 0) {
        user.stats.wins += 1;
      } else {
        user.stats.losses += 1;
      }

      Object.keys(player.roleStats).forEach((role) => {
        user.stats.roles[role].timesPlayed += player.roleStats[role].played;
        user.stats.roles[role].points += player.roleStats[role].points;

        if (i === 0 && player.roleStats[role].played > 0) {
          user.stats.roles[role].wins += 1;
        }
      });

      for (let j = 0; j < match.players.length; j++) {
        if (i === j) continue;

        const opponent = match.players[j];

        if (i < j) {
          if (!user.defeated.includes(opponent.userId)) {
            user.defeated.push(opponent.userId);
          }
        } else {
          if (!user.defeatedBy.includes(opponent.userId)) {
            user.defeatedBy.push(opponent.userId);
          }
        }
      }

      await user.save();
    }

    room.status = "finished";
    await room.save();

    io.to(roomId).emit("game_ended", {
      matchId: match.matchId,
      results: finalResults.results,
      winner: finalResults.winner,
    });

    logger.info(`Game ended in room ${roomId}, winner: ${finalResults.winner}`);

    setTimeout(async () => {
      await Room.deleteOne({ roomId });
      clearRoomTimer(roomId);
      logger.info(`Room ${roomId} deleted after game completion`);
    }, 30000);
  } catch (error) {
    logger.error("End game error:", error);
  }
}

export default initializeSocket;
