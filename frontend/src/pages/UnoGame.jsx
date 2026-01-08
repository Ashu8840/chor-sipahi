import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import socketService from "../services/socket";
import { useAuthStore } from "../context/authStore";
import { roomAPI } from "../services/api";
import UnoCard from "../components/Uno/UnoCard";
import "./UnoGame.css";

const UnoGame = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [room, setRoom] = useState(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showColorSelector, setShowColorSelector] = useState(false);
  const [message, setMessage] = useState("");
  const [hasCalledUno, setHasCalledUno] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const messageTimeoutRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return undefined;
    }

    if (token && !socketService.isConnected()) {
      socketService.connect(token);
    }

    const fetchRoom = async () => {
      try {
        setRoomLoading(true);
        const response = await roomAPI.getRoom(roomId);
        if (response.data.room.gameType !== "uno") {
          toast.error("This room is not an UNO room");
          navigate("/uno");
          return;
        }
        setRoom(response.data.room);
        socketService.joinRoom(roomId);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load room");
        navigate("/uno");
      } finally {
        setRoomLoading(false);
      }
    };

    fetchRoom();

    const showTempMessage = (text) => {
      if (!text) return;
      setMessage(text);
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = setTimeout(() => setMessage(""), 2500);
    };

    const handleJoinedRoom = ({ room: joinedRoom }) => {
      if (joinedRoom?.gameType !== "uno") {
        toast.error("This room is not configured for UNO");
        navigate("/uno");
        return;
      }
      setRoom(joinedRoom);
      socketService.emit("uno:init_game", { roomId });
    };

    const handleGameState = (state) => {
      setGameState(state);
      setGameStarted(state.status === "playing");
      setMyHand(state.hand || []);
      setHasCalledUno(state.hasCalledUno || false);
    };

    const handleCardsDrawn = ({ cards }) => {
      if (!cards?.length) return;
      setMyHand((prev) => [...prev, ...cards]);
    };

    const handleGameOver = ({ winners }) => {
      if (winners?.length) {
        showTempMessage(`🎉 ${winners[0].username} wins the match!`);
      }
      setTimeout(() => navigate("/uno"), 4000);
    };

    const handleGameStarted = () => showTempMessage("UNO game started!");
    const handleCardPlayed = ({ username, card }) => {
      showTempMessage(`${username} played ${card.type}`);
    };
    const handlePlayerDrew = ({ username, count }) => {
      showTempMessage(`${username} drew ${count} card${count > 1 ? "s" : ""}`);
    };
    const handleUnoCalled = ({ username }) => {
      showTempMessage(`${username} called UNO!`);
    };
    const handleChallengeResult = ({ message: challengeMessage }) => {
      showTempMessage(challengeMessage);
    };
    const handlePlayerCaught = ({ caughtUsername }) => {
      showTempMessage(`${caughtUsername} was caught not calling UNO!`);
    };
    const handleSocketError = (error) => {
      toast.error(error.message || "Something went wrong");
    };

    socketService.on("joined_room", handleJoinedRoom);
    socketService.on("uno:game_state", handleGameState);
    socketService.on("uno:game_started", handleGameStarted);
    socketService.on("uno:card_played", handleCardPlayed);
    socketService.on("uno:player_drew", handlePlayerDrew);
    socketService.on("uno:uno_called", handleUnoCalled);
    socketService.on("uno:challenge_result", handleChallengeResult);
    socketService.on("uno:player_caught", handlePlayerCaught);
    socketService.on("uno:cards_drawn", handleCardsDrawn);
    socketService.on("uno:game_over", handleGameOver);
    socketService.on("error", handleSocketError);

    return () => {
      socketService.off("joined_room", handleJoinedRoom);
      socketService.off("uno:game_state", handleGameState);
      socketService.off("uno:game_started", handleGameStarted);
      socketService.off("uno:card_played", handleCardPlayed);
      socketService.off("uno:player_drew", handlePlayerDrew);
      socketService.off("uno:uno_called", handleUnoCalled);
      socketService.off("uno:challenge_result", handleChallengeResult);
      socketService.off("uno:player_caught", handlePlayerCaught);
      socketService.off("uno:cards_drawn", handleCardsDrawn);
      socketService.off("uno:game_over", handleGameOver);
      socketService.off("error", handleSocketError);
      socketService.leaveRoom(roomId);
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, [roomId, user, token, navigate]);

  const handleStartGame = () => {
    socketService.emit("uno:start_game", { roomId });
  };

  const handlePlayCard = (card) => {
    if (!isMyTurn() || !card) return;
    setSelectedCard(card);

    if (card.type === "wild" || card.type === "wild_draw4") {
      setShowColorSelector(true);
    } else {
      socketService.emit("uno:play_card", { roomId, cardId: card.id });
      setSelectedCard(null);
    }
  };

  const handleColorSelect = (color) => {
    if (selectedCard) {
      socketService.emit("uno:play_card", {
        roomId,
        cardId: selectedCard.id,
        chosenColor: color,
      });
      setSelectedCard(null);
    }
    setShowColorSelector(false);
  };

  const handleDrawCard = () => {
    if (!isMyTurn()) return;
    socketService.emit("uno:draw_card", { roomId });
  };

  const handleCallUno = () => {
    socketService.emit("uno:call_uno", { roomId });
    setHasCalledUno(true);
  };

  const handleLeaveRoom = async () => {
    try {
      await roomAPI.leaveRoom(roomId);
    } catch (error) {
      console.warn("Leave room error", error);
    }
    socketService.leaveRoom(roomId);
    navigate("/uno");
  };

  const isMyTurn = () => {
    if (!gameState || !user) return false;
    return gameState.currentPlayerId === user._id;
  };

  const canPlayCard = (card) => {
    if (!card || !isMyTurn() || !gameState) return false;

    if (
      gameState.drawStack > 0 &&
      card.type !== "draw2" &&
      card.type !== "wild_draw4"
    ) {
      return false;
    }

    if (card.type === "wild" || card.type === "wild_draw4") {
      return true;
    }

    const topCard = gameState.discardTop;
    if (!topCard) return true;

    return (
      card.color === gameState.currentColor ||
      card.type === topCard.type
    );
  };

  const canCallUnoNow = () => {
    return gameStarted && !hasCalledUno && isMyTurn() && (gameState?.canCallUno || myHand.length === 1);
  };

  if (roomLoading || !room || !gameState) {
    return (
      <div className="uno-game loading">
        <div className="loading-spinner">Loading UNO match...</div>
      </div>
    );
  }

  const currentCard = gameState.discardTop;
  const deckCount = gameState.deckCount ?? 0;
  const otherPlayers = gameState.players.filter((p) => p.userId !== user._id);

  return (
    <div className="uno-game">
      <div className="game-header">
        <button className="leave-btn" onClick={handleLeaveRoom}>
          ← Leave
        </button>
        <h2>{room.name}</h2>
        <div className="deck-count">
          <span className="deck-icon">🎴</span>
          <span>{deckCount}</span>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            className="message-banner"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="game-board">
        <div className="other-players">
          {otherPlayers.map((player) => (
            <motion.div
              key={player.userId}
              className={`player-info ${player.isCurrentTurn ? "active" : ""}`}
              animate={player.isCurrentTurn ? { scale: 1.05 } : { scale: 1 }}
            >
              <div className="player-name">{player.username}</div>
              <div className="player-cards">
                {Array(player.cardCount)
                  .fill(0)
                  .map((_, idx) => (
                    <div key={`${player.userId}-${idx}`} className="card-back" />
                  ))}
              </div>
              {player.hasCalledUno && <div className="uno-badge">UNO!</div>}
            </motion.div>
          ))}
        </div>

        <div className="center-area">
          <motion.div
            className="draw-pile"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDrawCard}
          >
            <div className="card-back large" />
            <div className="pile-label">Draw</div>
          </motion.div>

          <div className="current-card-area">
            {currentCard && <UnoCard card={currentCard} animate />}
            <div className="current-color">
              Color: {" "}
              <span className={`color-indicator ${gameState.currentColor}`}>
                {gameState.currentColor || "?"}
              </span>
            </div>
          </div>

          <div className="turn-indicator">
            <div className="turn-arrow">
              {gameState.direction === 1 ? "→" : "←"}
            </div>
            <div className="current-player-name">
              {gameState.players.find((p) => p.isCurrentTurn)?.username || "-"}'s Turn
            </div>
          </div>
        </div>

        <div className="my-hand-area">
          {!gameStarted && room.host?._id === user._id && (
            <button className="start-game-btn" onClick={handleStartGame}>
              Start Game
            </button>
          )}

          {gameStarted && (
            <>
              <div className="hand-label">Your Hand ({myHand.length} cards)</div>
              <motion.div className="my-hand" layout>
                <AnimatePresence>
                  {myHand.map((card, index) => (
                    <motion.div
                      key={card.id}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      style={{ zIndex: index }}
                    >
                      <UnoCard
                        card={card}
                        onClick={() => handlePlayCard(card)}
                        disabled={!isMyTurn()}
                        isPlayable={canPlayCard(card)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {canCallUnoNow() && (
                <motion.button
                  className="uno-button"
                  onClick={handleCallUno}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  🎴 Call UNO!
                </motion.button>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showColorSelector && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="color-selector"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h3>Choose a Color</h3>
              <div className="color-options">
                {[
                  "red",
                  "blue",
                  "green",
                  "yellow",
                ].map((color) => (
                  <motion.button
                    key={color}
                    className={`color-btn ${color}`}
                    onClick={() => handleColorSelect(color)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnoGame;
