import jwt from "jsonwebtoken";
import Room from "../models/Room.model.js";
import Match from "../models/Match.model.js";
import User from "../models/User.model.js";
import GameEngine from "../services/gameEngine.service.js";
import matchmakingService from "../services/matchmaking.service.js";
import logger from "../config/logger.js";

const activeConnections = new Map();
const roomTimers = new Map();

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

    activeConnections.set(socket.userId, socket.id);

    socket.on("join_room", async ({ roomId, passkey }) => {
      try {
        const room = await Room.findOne({ roomId }).select("+passkey");

        if (!room) {
          return socket.emit("error", { message: "Room not found" });
        }

        if (room.passkey && passkey) {
          const isValid = await room.comparePasskey(passkey);
          if (!isValid) {
            return socket.emit("error", { message: "Invalid passkey" });
          }
        }

        const playerExists = room.players.some(
          (p) => p.userId.toString() === socket.userId
        );

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

        await room.removePlayer(socket.userId);

        socket.leave(roomId);
        socket.currentRoom = null;

        if (room.players.length === 0) {
          await Room.deleteOne({ roomId });
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

        const allReady = room.players.every((p) => p.isReady);
        if (allReady && room.players.length >= 2) {
          setTimeout(() => {
            socket.emit("game_start_countdown", { seconds: 3 });
          }, 500);

          setTimeout(async () => {
            await startGame(io, roomId);
          }, 3500);
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

        const validation = GameEngine.validateGameState(room);
        if (!validation.valid) {
          return socket.emit("error", { message: validation.error });
        }

        await startGame(io, roomId);
      } catch (error) {
        logger.error("Start round error:", error);
        socket.emit("error", { message: "Failed to start game" });
      }
    });

    socket.on("reveal_role", async ({ roomId }) => {
      try {
        const room = await Room.findOne({ roomId });

        if (!room) {
          return socket.emit("error", { message: "Room not found" });
        }

        const playerRole = room.gameState.currentRoles.get(socket.userId);

        if (!playerRole) {
          return socket.emit("error", { message: "Role not assigned" });
        }

        socket.emit("role_revealed", { role: playerRole });

        logger.info(`${socket.username} revealed role: ${playerRole}`);
      } catch (error) {
        logger.error("Reveal role error:", error);
        socket.emit("error", { message: "Failed to reveal role" });
      }
    });

    socket.on("guess_chor", async ({ roomId, guessedUserId }) => {
      try {
        const room = await Room.findOne({ roomId });

        if (!room) {
          return socket.emit("error", { message: "Room not found" });
        }

        const playerRole = room.gameState.currentRoles.get(socket.userId);

        if (playerRole !== "Sipahi") {
          return socket.emit("error", { message: "Only Sipahi can guess" });
        }

        if (room.gameState.sipahiGuessed) {
          return socket.emit("error", { message: "Already guessed" });
        }

        room.gameState.sipahiGuessed = true;
        room.gameState.guessedChor = guessedUserId;

        const roundResult = GameEngine.processRound(
          room.players,
          Array.from(room.gameState.currentRoles.values()),
          guessedUserId
        );

        room.gameState.roundScores = roundResult.scores;

        if (!room.gameState.matchId) {
          const match = new Match({
            matchId: room.roomId + "-match",
            players: room.players.map((p) => ({
              userId: p.userId,
              username: p.username,
              displayName: p.displayName,
            })),
            status: "in-progress",
            startedAt: Date.now(),
          });
          await match.save();
          room.gameState.matchId = match.matchId;
        }

        const match = await Match.findOne({ matchId: room.gameState.matchId });

        match.rounds.push({
          roundNumber: room.currentRound,
          roles: roundResult.roles,
          sipahi: room.players.find(
            (p) => roundResult.roles.get(p.userId.toString()) === "Sipahi"
          )?.userId,
          chor: roundResult.chorUserId,
          guessedPlayer: guessedUserId,
          correctGuess: roundResult.correctGuess,
          roundScores: roundResult.scores,
        });

        await match.save();
        await room.save();

        io.to(roomId).emit("round_result", {
          correctGuess: roundResult.correctGuess,
          actualChor: roundResult.chorUserId,
          guessedUser: guessedUserId,
          scores: Object.fromEntries(roundResult.scores),
          roles: Object.fromEntries(roundResult.roles),
        });

        if (room.currentRound >= room.totalRounds) {
          setTimeout(async () => {
            await endGame(io, roomId);
          }, 5000);
        } else {
          setTimeout(async () => {
            room.currentRound += 1;
            room.gameState.sipahiGuessed = false;
            room.gameState.guessedChor = null;

            const newRoles = GameEngine.assignRoles(room.players.length);
            room.gameState.currentRoles = new Map(
              room.players.map((p, i) => [p.userId.toString(), newRoles[i]])
            );

            await room.save();

            io.to(roomId).emit("next_round", {
              roundNumber: room.currentRound,
              totalRounds: room.totalRounds,
            });

            logger.info(`Room ${roomId} moved to round ${room.currentRound}`);
          }, 5000);
        }

        logger.info(
          `${socket.username} guessed ${guessedUserId} as Chor in room ${roomId}`
        );
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
        activeConnections.delete(socket.userId);

        matchmakingService.removeFromQueue(socket.userId);

        if (socket.currentRoom) {
          const room = await Room.findOne({ roomId: socket.currentRoom });

          if (room) {
            await room.removePlayer(socket.userId);

            if (room.players.length === 0) {
              await Room.deleteOne({ roomId: socket.currentRoom });
              logger.info(`Room ${socket.currentRoom} deleted (empty)`);
            } else {
              const updatedRoom = await Room.findOne({
                roomId: socket.currentRoom,
              }).select("-passkey");
              io.to(socket.currentRoom).emit("room_updated", updatedRoom);
            }
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
      logger.info(`Room ${roomId} deleted after game completion`);
    }, 30000);
  } catch (error) {
    logger.error("End game error:", error);
  }
}

export default initializeSocket;
