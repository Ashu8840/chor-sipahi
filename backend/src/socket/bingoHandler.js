import BingoGame from "../models/BingoGame.model.js";
import Room from "../models/Room.model.js";
import logger from "../config/logger.js";

export const bingoHandler = (io, socket) => {
  // Helper to check if it's a bingo room
  const isBingoRoom = async (roomId) => {
    const room = await Room.findOne({ roomId });
    return room && room.gameType === "bingo";
  };

  socket.on("bingo:init_game", async ({ roomId }) => {
    try {
      if (!(await isBingoRoom(roomId))) return;

      const room = await Room.findOne({ roomId });
      if (!room) return socket.emit("error", { message: "Room not found" });

      let game = await BingoGame.findOne({ roomId: room._id });
      if (!game) {
        // Create new game instance with room settings
        const gridSize = room.bingoSettings?.gridSize || 5;
        const maxPlayers = room.bingoSettings?.maxPlayers || 2;

        game = new BingoGame({
          roomId: room._id,
          gridSize,
          maxPlayers,
          players: room.players.map((p) => ({
            userId: p.userId.toString(),
            username: p.username,
            board: [], // Empty initially
            ready: false,
          })),
          status: "waiting",
        });
        await game.save();
      }

      // Send current game state to the user
      socket.emit("bingo:game_state", game);
    } catch (error) {
      logger.error("Bingo init error:", error);
      socket.emit("error", { message: "Failed to initialize Bingo game" });
    }
  });

  socket.on("bingo:submit_board", async ({ roomId, board }) => {
    try {
      if (!(await isBingoRoom(roomId))) return;

      const room = await Room.findOne({ roomId });
      if (!room) return socket.emit("error", { message: "Room not found" });

      const gameInstance = await BingoGame.findOne({ roomId: room._id });
      if (!gameInstance)
        return socket.emit("error", { message: "Game not found" });

      const gridSize = gameInstance.gridSize || 5;
      const maxNumber = gridSize * gridSize;

      // Validate board (variable grid size, unique numbers)
      const flatBoard = board.flat();
      const uniqueNumbers = new Set(flatBoard);
      if (
        board.length !== gridSize ||
        board.some((row) => row.length !== gridSize) ||
        uniqueNumbers.size !== maxNumber ||
        [...uniqueNumbers].some((n) => n < 1 || n > maxNumber)
      ) {
        return socket.emit("error", {
          message: `Invalid board configuration. Must be ${gridSize}x${gridSize} with numbers 1-${maxNumber}`,
        });
      }

      const playerIndex = gameInstance.players.findIndex(
        (p) => p.userId === socket.userId
      );

      if (playerIndex === -1) {
        // Add player if not in list
        gameInstance.players.push({
          userId: socket.userId,
          username: socket.username,
          board: board,
          ready: true,
        });
      } else {
        gameInstance.players[playerIndex].board = board;
        gameInstance.players[playerIndex].ready = true;
      }

      await gameInstance.save();

      // Notify others that this player is ready
      io.to(roomId).emit("bingo:player_ready", {
        userId: socket.userId,
        username: socket.username,
      });

      // Check if all players are ready to start
      if (
        gameInstance.players.every((p) => p.ready) &&
        gameInstance.players.length >= 2
      ) {
        io.to(roomId).emit("bingo:can_start", { canStart: true });
      }
    } catch (error) {
      logger.error("Bingo submit board error:", error);
      socket.emit("error", { message: "Failed to submit board" });
    }
  });

  socket.on("bingo:start_game", async ({ roomId }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return;

      // Only host can start
      if (room.host.toString() !== socket.userId) {
        return socket.emit("error", { message: "Only host can start" });
      }

      const game = await BingoGame.findOne({ roomId: room._id });
      if (!game) return;

      game.status = "playing";
      // Randomly select first player
      const randomIndex = Math.floor(Math.random() * game.players.length);
      game.currentTurnIndex = randomIndex;
      game.drawnNumbers = [];
      await game.save();

      io.to(roomId).emit("bingo:game_started", {
        currentTurn: game.players[randomIndex].userId,
        firstPlayerIndex: randomIndex,
        firstPlayerName: game.players[randomIndex].username,
      });
    } catch (error) {
      logger.error("Bingo start error:", error);
    }
  });

  socket.on("bingo:select_number", async ({ roomId, number }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return;

      const game = await BingoGame.findOne({ roomId: room._id });
      if (!game || game.status !== "playing") return;

      // Check turn
      const currentPlayer = game.players[game.currentTurnIndex];
      if (currentPlayer.userId !== socket.userId) {
        return socket.emit("error", { message: "Not your turn" });
      }

      // Check if number already drawn
      if (game.drawnNumbers.includes(number)) {
        return socket.emit("error", { message: "Number already drawn" });
      }

      game.drawnNumbers.push(number);

      // Next turn
      game.currentTurnIndex = (game.currentTurnIndex + 1) % game.players.length;
      await game.save();

      io.to(roomId).emit("bingo:number_drawn", {
        number,
        nextTurn: game.players[game.currentTurnIndex].userId,
        drawnNumbers: game.drawnNumbers,
      });
    } catch (error) {
      logger.error("Bingo select number error:", error);
    }
  });

  socket.on("bingo:check_win", async ({ roomId }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return;

      const game = await BingoGame.findOne({ roomId: room._id });
      if (!game) return;

      const player = game.players.find((p) => p.userId === socket.userId);
      if (!player) return;

      const gridSize = game.gridSize || 5;
      const board = player.board;
      const drawn = new Set(game.drawnNumbers);
      let lines = 0;

      // Rows
      for (let i = 0; i < gridSize; i++) {
        if (board[i] && board[i].every((n) => drawn.has(n))) lines++;
      }
      // Cols
      for (let j = 0; j < gridSize; j++) {
        if (board.every((row) => row && row[j] && drawn.has(row[j]))) lines++;
      }
      // Diagonals
      const indices = Array.from({ length: gridSize }, (_, i) => i);
      if (
        indices.every((i) => board[i] && board[i][i] && drawn.has(board[i][i]))
      )
        lines++;
      if (
        indices.every(
          (i) =>
            board[i] &&
            board[i][gridSize - 1 - i] &&
            drawn.has(board[i][gridSize - 1 - i])
        )
      )
        lines++;

      if (lines >= gridSize) {
        game.status = "finished";
        game.winner = { userId: socket.userId, username: socket.username };
        await game.save();

        io.to(roomId).emit("bingo:game_over", {
          winner: socket.userId,
          winnerName: socket.username,
          gridSize: gridSize,
        });
      } else {
        socket.emit("bingo:win_check_failed", { lines, required: gridSize });
      }
    } catch (error) {
      logger.error("Bingo check win error:", error);
    }
  });
};
