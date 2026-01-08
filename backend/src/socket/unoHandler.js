import UnoGame from "../models/UnoGame.model.js";
import Room from "../models/Room.model.js";
import logger from "../config/logger.js";
import memoryManager from "../utils/memoryManager.js";

const UNO_COLORS = ["red", "blue", "green", "yellow"];

const getSocketByUserId = (io, userId) => {
  const trackedSocketId = memoryManager.getSocketId(userId);
  if (trackedSocketId) {
    const trackedSocket = io.sockets.sockets.get(trackedSocketId);
    if (trackedSocket) return trackedSocket;
  }

  for (const client of io.sockets.sockets.values()) {
    if (client.userId === userId) {
      return client;
    }
  }

  return null;
};

const buildGameStateForPlayer = (game, viewerUserId) => {
  const discardTop = game.discardPile[game.discardPile.length - 1] || null;
  const players = game.players.map((player, index) => ({
    userId: player.userId,
    username: player.username,
    cardCount: player.hand.length,
    hasCalledUno: player.hasCalledUno,
    placement: player.placement ?? null,
    connected: player.connected,
    isCurrentTurn: index === game.currentPlayerIndex,
  }));

  const viewer = game.players.find((p) => p.userId === viewerUserId);

  return {
    status: game.status,
    roomId: game.roomId,
    direction: game.direction,
    currentColor: game.currentColor,
    currentPlayerIndex: game.currentPlayerIndex,
    currentPlayerId:
      game.players[game.currentPlayerIndex]?.userId || null,
    drawStack: game.drawStack,
    deckCount: game.deck.length,
    discardTop,
    players,
    winners: game.winners || [],
    hand: viewer?.hand || [],
    hasCalledUno: viewer?.hasCalledUno || false,
    canCallUno: viewer ? viewer.hand.length === 1 && !viewer.hasCalledUno : false,
  };
};

const emitGameStateForUser = (io, game, userId) => {
  const targetSocket = getSocketByUserId(io, userId);
  if (targetSocket) {
    targetSocket.emit("uno:game_state", buildGameStateForPlayer(game, userId));
  }
};

const emitGameStateToRoom = (io, game) => {
  game.players.forEach((player) => emitGameStateForUser(io, game, player.userId));
};

const syncPlayersWithRoom = (room, game) => {
  const roomPlayerIds = room.players.map((p) => p.userId.toString());
  const existingIds = new Set(game.players.map((p) => p.userId));

  // Remove players who left before the game starts
  game.players = game.players.filter((player) =>
    roomPlayerIds.includes(player.userId)
  );

  room.players.forEach((roomPlayer) => {
    const userId = roomPlayer.userId.toString();
    if (!existingIds.has(userId)) {
      game.players.push({
        userId,
        username: roomPlayer.username,
        hand: [],
        hasCalledUno: false,
        connected: true,
      });
    } else {
      const existingPlayer = game.players.find((p) => p.userId === userId);
      if (existingPlayer) {
        existingPlayer.username = roomPlayer.username;
        existingPlayer.connected = true;
      }
    }
  });

  game.maxPlayers = room.unoSettings?.maxPlayers || room.maxPlayers || game.maxPlayers;
};

const ensureUnoRoom = async (roomId) => {
  const room = await Room.findOne({ roomId });
  if (!room || room.gameType !== "uno") {
    return null;
  }
  return room;
};

export const unoHandler = (io, socket) => {
  socket.on("uno:init_game", async ({ roomId }) => {
    try {
      if (!roomId) return;

      const room = await ensureUnoRoom(roomId);
      if (!room) return;

      const isPlayerInRoom = room.players.some(
        (p) => p.userId.toString() === socket.userId
      );

      if (!isPlayerInRoom) {
        return socket.emit("error", { message: "You are not part of this room" });
      }

      let game = await UnoGame.findOne({ roomId: room._id });

      if (!game) {
        game = new UnoGame({
          roomId: room._id,
          maxPlayers: room.unoSettings?.maxPlayers || room.maxPlayers || 4,
          players: room.players.map((p) => ({
            userId: p.userId.toString(),
            username: p.username,
            hand: [],
            hasCalledUno: false,
            connected: true,
          })),
          deck: [],
          discardPile: [],
          direction: 1,
          status: "waiting",
        });
        game.deck = game.createDeck();
        game.shuffleDeck();
        await game.save();
      } else if (game.status === "waiting") {
        syncPlayersWithRoom(room, game);
        await game.save();
      }

      socket.emit("uno:game_state", buildGameStateForPlayer(game, socket.userId));
    } catch (error) {
      logger.error("UNO init error:", error);
      socket.emit("error", { message: "Failed to initialize UNO game" });
    }
  });

  socket.on("uno:start_game", async ({ roomId }) => {
    try {
      const room = await ensureUnoRoom(roomId);
      if (!room) return;

      if (room.host.toString() !== socket.userId) {
        return socket.emit("error", { message: "Only the host can start the game" });
      }

      const game = await UnoGame.findOne({ roomId: room._id });
      if (!game || game.status !== "waiting") {
        return socket.emit("error", { message: "UNO game already started" });
      }

      if (game.players.length < 2) {
        return socket.emit("error", { message: "Need at least two players to start" });
      }

      game.deck = game.createDeck();
      game.shuffleDeck();
      game.dealCards();
      game.status = "playing";
      game.currentPlayerIndex = 0;

      const firstCard = game.discardPile[game.discardPile.length - 1];

      if (firstCard?.type === "reverse") {
        game.reverseDirection();
        if (game.getActivePlayerCount() === 2) {
          game.nextPlayer();
        }
      } else if (firstCard?.type === "skip") {
        game.nextPlayer();
      } else if (firstCard?.type === "draw2") {
        game.drawStack = 2;
      }

      room.status = "playing";
      room.gameStartedAt = new Date();

      await Promise.all([game.save(), room.save()]);

      io.to(roomId).emit("uno:game_started", {
        firstCard,
        currentColor: game.currentColor,
        direction: game.direction,
        currentPlayerId: game.players[game.currentPlayerIndex]?.userId || null,
      });

      emitGameStateToRoom(io, game);
    } catch (error) {
      logger.error("UNO start error:", error);
      socket.emit("error", { message: "Failed to start UNO game" });
    }
  });

  socket.on("uno:play_card", async ({ roomId, cardId, chosenColor }) => {
    try {
      const room = await ensureUnoRoom(roomId);
      if (!room) return;

      const game = await UnoGame.findOne({ roomId: room._id });
      if (!game || game.status !== "playing") return;

      const currentPlayer = game.players[game.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.userId !== socket.userId) {
        return socket.emit("error", { message: "It's not your turn" });
      }

      const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) {
        return socket.emit("error", { message: "Card not found in hand" });
      }

      const card = currentPlayer.hand[cardIndex];

      if (
        game.drawStack > 0 &&
        card.type !== "draw2" &&
        card.type !== "wild_draw4"
      ) {
        return socket.emit("error", {
          message: `You must play a +2 or +4 card or draw ${game.drawStack} cards`,
        });
      }

      if (!game.canPlayCard(card) && game.drawStack === 0) {
        return socket.emit("error", { message: "You cannot play this card" });
      }

      if (
        (card.type === "wild" || card.type === "wild_draw4") &&
        (!chosenColor || !UNO_COLORS.includes(chosenColor))
      ) {
        return socket.emit("error", { message: "Please select a valid color" });
      }

      const previousColor = game.currentColor;
      currentPlayer.hand.splice(cardIndex, 1);
      game.discardPile.push(card);

      if (card.type === "wild" || card.type === "wild_draw4") {
        game.currentColor = chosenColor;
        if (card.type === "wild_draw4") {
          game.lastColorBeforeWild = previousColor;
        }
      } else {
        game.currentColor = card.color;
        game.lastColorBeforeWild = null;
      }

      if (currentPlayer.hand.length > 1) {
        currentPlayer.hasCalledUno = false;
      }

      let skipNext = false;

      switch (card.type) {
        case "skip":
          skipNext = true;
          break;
        case "reverse":
          game.reverseDirection();
          if (game.getActivePlayerCount() === 2) {
            skipNext = true;
          }
          break;
        case "draw2":
          game.drawStack += 2;
          break;
        case "wild_draw4":
          game.drawStack += 4;
          break;
        default:
          break;
      }

      let gameFinished = false;

      if (currentPlayer.hand.length === 0) {
        const finishedCount = game.winners?.length || 0;
        currentPlayer.placement = finishedCount + 1;

        game.winners = game.winners || [];
        game.winners.push({
          userId: currentPlayer.userId,
          username: currentPlayer.username,
          placement: currentPlayer.placement,
        });

        if (!game.winner) {
          game.winner = {
            userId: currentPlayer.userId,
            username: currentPlayer.username,
            placement: 1,
          };
        }

        if (game.getActivePlayerCount() <= 1) {
          const lastPlayer = game.players.find((p) => p.placement === undefined);
          if (lastPlayer) {
            lastPlayer.placement = game.winners.length + 1;
            game.winners.push({
              userId: lastPlayer.userId,
              username: lastPlayer.username,
              placement: lastPlayer.placement,
            });
          }

          game.status = "finished";
          room.status = "finished";
          gameFinished = true;
        }
      }

      if (!gameFinished) {
        game.nextPlayer(skipNext);
      }

      await Promise.all([game.save(), room.save()]);

      io.to(roomId).emit("uno:card_played", {
        userId: currentPlayer.userId,
        username: currentPlayer.username,
        card,
        chosenColor: game.currentColor,
        drawStack: game.drawStack,
        direction: game.direction,
      });

      if (gameFinished) {
        io.to(roomId).emit("uno:game_over", {
          winners: game.winners,
          winner: game.winner,
        });
      }

      emitGameStateToRoom(io, game);
    } catch (error) {
      logger.error("UNO play card error:", error);
      socket.emit("error", { message: "Failed to play card" });
    }
  });

  socket.on("uno:draw_card", async ({ roomId }) => {
    try {
      const room = await ensureUnoRoom(roomId);
      if (!room) return;

      const game = await UnoGame.findOne({ roomId: room._id });
      if (!game || game.status !== "playing") return;

      const currentPlayer = game.players[game.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.userId !== socket.userId) {
        return socket.emit("error", { message: "It's not your turn" });
      }

      const drawCount = game.drawStack > 0 ? game.drawStack : 1;
      const drawnCards = game.drawCards(game.currentPlayerIndex, drawCount);

      game.drawStack = 0;
      game.lastColorBeforeWild = null;
      currentPlayer.hasCalledUno = false;

      const previousPlayerId = currentPlayer.userId;
      const previousUsername = currentPlayer.username;

      game.nextPlayer();

      await game.save();

      socket.emit("uno:cards_drawn", { cards: drawnCards });

      io.to(roomId).emit("uno:player_drew", {
        userId: previousPlayerId,
        username: previousUsername,
        count: drawnCards.length,
        drawStackResolved: drawCount > 1,
      });

      emitGameStateToRoom(io, game);
    } catch (error) {
      logger.error("UNO draw card error:", error);
      socket.emit("error", { message: "Failed to draw card" });
    }
  });

  socket.on("uno:call_uno", async ({ roomId }) => {
    try {
      const room = await ensureUnoRoom(roomId);
      if (!room) return;

      const game = await UnoGame.findOne({ roomId: room._id });
      if (!game) return;

      const player = game.players.find((p) => p.userId === socket.userId);
      if (!player || player.hand.length !== 1) {
        return socket.emit("error", { message: "You can only call UNO with one card" });
      }

      if (player.hasCalledUno) return;

      player.hasCalledUno = true;
      await game.save();

      io.to(roomId).emit("uno:uno_called", {
        userId: player.userId,
        username: player.username,
      });

      emitGameStateToRoom(io, game);
    } catch (error) {
      logger.error("UNO call UNO error:", error);
    }
  });

  socket.on("uno:challenge_draw4", async ({ roomId }) => {
    try {
      const room = await ensureUnoRoom(roomId);
      if (!room) return;

      const game = await UnoGame.findOne({ roomId: room._id });
      if (!game || game.drawStack < 4) {
        return socket.emit("error", { message: "No +4 card to challenge" });
      }

      const lastCard = game.discardPile[game.discardPile.length - 1];
      if (!lastCard || lastCard.type !== "wild_draw4") {
        return socket.emit("error", { message: "Cannot challenge this card" });
      }

      const challenger = game.players[game.currentPlayerIndex];
      if (!challenger || challenger.userId !== socket.userId) {
        return socket.emit("error", { message: "Only the affected player can challenge" });
      }

      const previousPlayerIndex = game.getPreviousActivePlayerIndex();
      const previousPlayer = game.players[previousPlayerIndex];

      const colorToCheck = game.lastColorBeforeWild || game.currentColor;
      const hadPlayableColor = previousPlayer.hand.some(
        (c) => c.color === colorToCheck
      );

      if (hadPlayableColor) {
        const penaltyCards = game.drawCards(previousPlayerIndex, 4);
        game.drawStack = 0;
        game.lastColorBeforeWild = null;

        io.to(roomId).emit("uno:challenge_result", {
          success: true,
          challengerId: challenger.userId,
          challengedId: previousPlayer.userId,
          message: `${previousPlayer.username} had ${colorToCheck} cards and draws 4!`,
        });

        const previousSocket = getSocketByUserId(io, previousPlayer.userId);
        previousSocket?.emit("uno:cards_drawn", { cards: penaltyCards });
      } else {
        const penaltyCards = game.drawCards(game.currentPlayerIndex, 6);
        game.drawStack = 0;
        game.lastColorBeforeWild = null;

        io.to(roomId).emit("uno:challenge_result", {
          success: false,
          challengerId: challenger.userId,
          challengedId: previousPlayer.userId,
          message: `Challenge failed! ${challenger.username} draws 6 cards and loses the turn.`,
        });

        socket.emit("uno:cards_drawn", { cards: penaltyCards });
        game.nextPlayer();
      }

      await game.save();
      emitGameStateToRoom(io, game);
    } catch (error) {
      logger.error("UNO challenge error:", error);
    }
  });

  socket.on("uno:catch_player", async ({ roomId, caughtUserId }) => {
    try {
      const room = await ensureUnoRoom(roomId);
      if (!room) return;

      const game = await UnoGame.findOne({ roomId: room._id });
      if (!game) return;

      if (caughtUserId === socket.userId) return;

      const caughtPlayerIndex = game.players.findIndex((p) => p.userId === caughtUserId);
      if (caughtPlayerIndex === -1) return;

      const caughtPlayer = game.players[caughtPlayerIndex];

      if (caughtPlayer.hand.length === 1 && !caughtPlayer.hasCalledUno) {
        const drawnCards = game.drawCards(caughtPlayerIndex, 2);
        caughtPlayer.hasCalledUno = false;
        await game.save();

        io.to(roomId).emit("uno:player_caught", {
          caughtUserId: caughtPlayer.userId,
          caughtUsername: caughtPlayer.username,
          catcherUserId: socket.userId,
          catcherUsername: socket.username,
        });

        const targetSocket = getSocketByUserId(io, caughtPlayer.userId);
        targetSocket?.emit("uno:cards_drawn", { cards: drawnCards });

        emitGameStateToRoom(io, game);
      }
    } catch (error) {
      logger.error("UNO catch player error:", error);
    }
  });
};
