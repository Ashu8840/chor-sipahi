import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Trophy,
  Loader2,
  Check,
  Edit3,
  Shuffle as ShuffleIcon,
  X,
  Maximize,
  Minimize,
} from "lucide-react";
import socketService from "../services/socket";
import toast from "react-hot-toast";
import Confetti from "./Confetti";
import WinnerCard from "./WinnerCard";

const BingoGame = ({ room, currentUser }) => {
  const [gridSize, setGridSize] = useState(5);
  const [maxNumber, setMaxNumber] = useState(25);
  const [board, setBoard] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [bingoLines, setBingoLines] = useState(0);
  const [gameStatus, setGameStatus] = useState("setup"); // setup, waiting, playing, finished
  const [hasBingoVoicePlayed, setHasBingoVoicePlayed] = useState(false);
  const [playersReady, setPlayersReady] = useState([]);
  const [fillMode, setFillMode] = useState("auto"); // auto or manual
  const [nextNumberToFill, setNextNumberToFill] = useState(1); // For manual filling, tracks next number
  const [showWinner, setShowWinner] = useState(false);
  const [winnerName, setWinnerName] = useState("");
  const [isWinner, setIsWinner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Audio refs
  const clickSoundRef = useRef(null);
  const turnVoiceRef = useRef(null);

  // Initialize audio
  useEffect(() => {
    // Create click sound (beep)
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    clickSoundRef.current = audioContext;

    // Initialize speech synthesis for "Your turn"
    if ("speechSynthesis" in window) {
      turnVoiceRef.current = window.speechSynthesis;
    }

    return () => {
      if (audioContext.state !== "closed") {
        audioContext.close();
      }
    };
  }, []);

  // Initialize board based on grid size
  useEffect(() => {
    const size = room.bingoSettings?.gridSize || 5;
    setGridSize(size);
    setMaxNumber(size * size);
    initializeEmptyBoard(size);
  }, [room.bingoSettings]);

  const initializeEmptyBoard = (size) => {
    const emptyBoard = Array(size)
      .fill(null)
      .map(() => Array(size).fill(null));
    setBoard(emptyBoard);
  };

  useEffect(() => {
    // Initialize game
    socketService.emit("bingo:init_game", { roomId: room.roomId });

    const handleGameState = (game) => {
      console.log("Bingo game state received:", game);
      setGameState(game);

      // Update grid size from game
      if (game.gridSize) {
        setGridSize(game.gridSize);
        setMaxNumber(game.gridSize * game.gridSize);
      }

      if (game.status === "playing") {
        setGameStatus("playing");
        setDrawnNumbers(game.drawnNumbers || []);
        checkTurn(game);

        // Load my board from game state
        const myPlayer = game.players.find((p) => p.userId === currentUser._id);
        if (myPlayer && myPlayer.board && myPlayer.board.length > 0) {
          setBoard(myPlayer.board);
        }
      } else if (game.status === "waiting") {
        // Check if I have a board
        const myPlayer = game.players.find((p) => p.userId === currentUser._id);
        if (myPlayer && myPlayer.ready) {
          setBoard(myPlayer.board);
          setGameStatus("waiting");
        } else {
          setGameStatus("setup");
        }

        // Update players ready list
        const readyPlayers = game.players
          .filter((p) => p.ready)
          .map((p) => ({
            userId: p.userId,
            username: p.username,
          }));
        setPlayersReady(readyPlayers);
      } else if (game.status === "finished") {
        setGameStatus("finished");
      }
    };

    const handlePlayerReady = ({ userId, username }) => {
      console.log(`Player ${username} is ready`);
      setPlayersReady((prev) => {
        if (prev.some((p) => p.userId === userId)) return prev;
        return [...prev, { userId, username }];
      });
      toast.success(`${username} is ready!`);
    };

    const handleCanStart = ({ canStart }) => {
      console.log("Can start game:", canStart);
    };

    const handleGameStarted = ({ currentTurn, firstPlayerName }) => {
      console.log("Bingo game started, current turn:", currentTurn);
      setGameStatus("playing");
      setIsMyTurn(currentTurn === currentUser._id);
      setDrawnNumbers([]);
      setHasBingoVoicePlayed(false);

      if (firstPlayerName) {
        if (currentTurn === currentUser._id) {
          toast.success(
            "You were randomly selected to start first! Pick a number!"
          );
        } else {
          toast.success(`${firstPlayerName} starts first!`);
        }
      } else {
        toast.success("Game Started! Pick your numbers!");
      }
    };

    const handleNumberDrawn = ({
      number,
      nextTurn,
      drawnNumbers: newDrawn,
    }) => {
      console.log(`Number ${number} drawn. Next turn: ${nextTurn}`);
      setDrawnNumbers(newDrawn || []);
      setIsMyTurn(nextTurn === currentUser._id);

      // Check if I got new lines
      if (board && board.length > 0) {
        checkBingo(board, newDrawn || []);
      }
    };

    const handleWinCheckFailed = ({ lines, required }) => {
      toast.error(
        `Not yet! You have ${lines}/${required} lines. Need ${required} to win!`
      );
    };

    const handleGameOver = ({ winner, winnerName: wName, gridSize: gSize }) => {
      setGameStatus("finished");
      setWinnerName(wName);
      setIsWinner(winner === currentUser._id);
      setShowWinner(true);
      setShowConfetti(true);

      if (winner === currentUser._id) {
        toast.success("🎉 You WIN! Congratulations!", { duration: 5000 });
      } else {
        toast(`${wName} wins!`, { duration: 5000 });
      }

      // Hide confetti after 5 seconds
      setTimeout(() => setShowConfetti(false), 5000);
    };

    socketService.on("bingo:game_state", handleGameState);
    socketService.on("bingo:player_ready", handlePlayerReady);
    socketService.on("bingo:can_start", handleCanStart);
    socketService.on("bingo:game_started", handleGameStarted);
    socketService.on("bingo:number_drawn", handleNumberDrawn);
    socketService.on("bingo:win_check_failed", handleWinCheckFailed);
    socketService.on("bingo:game_over", handleGameOver);

    return () => {
      socketService.off("bingo:game_state", handleGameState);
      socketService.off("bingo:player_ready", handlePlayerReady);
      socketService.off("bingo:can_start", handleCanStart);
      socketService.off("bingo:game_started", handleGameStarted);
      socketService.off("bingo:number_drawn", handleNumberDrawn);
      socketService.off("bingo:win_check_failed", handleWinCheckFailed);
      socketService.off("bingo:game_over", handleGameOver);
    };
  }, [room.roomId, currentUser._id, board]);

  // Update bingo lines when drawn numbers change
  useEffect(() => {
    if (board && board.length > 0 && board[0] && board[0][0] !== null) {
      checkBingo(board, drawnNumbers);
    }
  }, [drawnNumbers, board]);

  // Voice notification when it's your turn
  useEffect(() => {
    if (isMyTurn && gameStatus === "playing" && turnVoiceRef.current) {
      speakYourTurn();
    }
  }, [isMyTurn, gameStatus]);

  // Enter fullscreen when game starts
  useEffect(() => {
    if (gameStatus === "playing") {
      enterFullscreen();
    }
  }, [gameStatus]);

  // Announce BINGO when button becomes active
  useEffect(() => {
    if (bingoLines >= gridSize && gameStatus === "playing") {
      speakBingo();
    }
  }, [bingoLines, gridSize, gameStatus]);

  // Play click sound
  const playClickSound = () => {
    if (clickSoundRef.current && clickSoundRef.current.state !== "closed") {
      const oscillator = clickSoundRef.current.createOscillator();
      const gainNode = clickSoundRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(clickSoundRef.current.destination);

      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.3, clickSoundRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        clickSoundRef.current.currentTime + 0.1
      );

      oscillator.start(clickSoundRef.current.currentTime);
      oscillator.stop(clickSoundRef.current.currentTime + 0.1);
    }
  };

  // Vibrate on cell click
  const vibrateDevice = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(50); // Vibrate for 50ms
    }
  };

  // Speak "BINGO!" when button becomes active
  const speakBingo = () => {
    if (turnVoiceRef.current && !hasBingoVoicePlayed) {
      const utterance = new SpeechSynthesisUtterance("BINGO!");
      utterance.rate = 1.0;
      utterance.pitch = 1.3;
      utterance.volume = 1.0;
      turnVoiceRef.current.cancel();
      turnVoiceRef.current.speak(utterance);
      setHasBingoVoicePlayed(true);
    }
  };

  // Speak "Your turn"
  const speakYourTurn = () => {
    if (turnVoiceRef.current) {
      turnVoiceRef.current.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance("Your turn!");
      utterance.rate = 1.2;
      utterance.pitch = 1.1;
      utterance.volume = 0.8;
      turnVoiceRef.current.speak(utterance);
    }
  };

  // Fullscreen functions
  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
    setIsFullscreen(true);
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    setIsFullscreen(false);
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  const checkTurn = (game) => {
    if (game.players && game.players.length > 0) {
      const currentPlayer = game.players[game.currentTurnIndex || 0];
      setIsMyTurn(currentPlayer.userId === currentUser._id);
    }
  };

  const handleCellClick = (row, col) => {
    if (gameStatus === "setup" && fillMode === "manual") {
      // Check if cell is already filled
      if (board[row][col] !== null) {
        toast.error("Cell is already filled! Clear the board to start over.");
        return;
      }

      // Check if we've already filled all numbers
      if (nextNumberToFill > maxNumber) {
        toast.error(
          "All numbers have been used! Clear the board to start over."
        );
        return;
      }

      // Fill the cell with the next number
      const newBoard = board.map((r, rIdx) =>
        r.map((cell, cIdx) =>
          rIdx === row && cIdx === col ? nextNumberToFill : cell
        )
      );

      playClickSound(); // Play sound
      setBoard(newBoard);
      setNextNumberToFill(nextNumberToFill + 1);

      // Show success toast
      if (nextNumberToFill === maxNumber) {
        toast.success("Board complete! Ready to submit.");
      }
    } else if (gameStatus === "playing") {
      if (!isMyTurn) {
        toast.error("Not your turn!");
        return;
      }

      const number = board[row][col];
      if (!number) {
        toast.error("Invalid cell");
        return;
      }

      if (drawnNumbers.includes(number)) {
        toast.error("Number already drawn!");
        return;
      }

      playClickSound(); // Play sound
      console.log(`Selecting number ${number} at [${row},${col}]`);
      socketService.emit("bingo:select_number", {
        roomId: room.roomId,
        number,
      });
    }
  };

  const handleAutoFill = () => {
    const numbers = Array.from({ length: maxNumber }, (_, i) => i + 1);
    // Shuffle using Fisher-Yates
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    const newBoard = [];
    for (let i = 0; i < gridSize; i++) {
      newBoard.push(numbers.slice(i * gridSize, (i + 1) * gridSize));
    }
    setBoard(newBoard);
    toast.success("Board filled!");
  };

  const handleClearBoard = () => {
    initializeEmptyBoard(gridSize);
    setNextNumberToFill(1); // Reset counter
    toast.success("Board cleared!");
  };

  const handleSubmitBoard = () => {
    // Validate board is complete
    if (board.some((row) => row.some((c) => c === null))) {
      toast.error("Please fill all cells first!");
      return;
    }

    console.log("Submitting board:", board);
    socketService.emit("bingo:submit_board", { roomId: room.roomId, board });
    setGameStatus("waiting");
    toast.success("Board submitted! Waiting for others...");
  };

  const handleStartGame = () => {
    console.log("Starting Bingo game");
    socketService.emit("bingo:start_game", { roomId: room.roomId });
  };

  const handleCallBingo = () => {
    if (bingoLines < gridSize) {
      toast.error(
        `You only have ${bingoLines} lines. Need ${gridSize} to call BINGO!`
      );
      return;
    }
    console.log("Calling BINGO!");
    socketService.emit("bingo:check_win", { roomId: room.roomId });
  };

  const checkBingo = (currentBoard, currentDrawn) => {
    if (!currentBoard || currentBoard.length === 0 || !currentDrawn) {
      setBingoLines(0);
      return;
    }

    const drawnSet = new Set(currentDrawn);
    let lines = 0;

    // Rows
    for (let i = 0; i < gridSize; i++) {
      if (
        currentBoard[i] &&
        currentBoard[i].every((n) => n && drawnSet.has(n))
      ) {
        lines++;
      }
    }

    // Cols
    for (let j = 0; j < gridSize; j++) {
      if (currentBoard.every((row) => row && row[j] && drawnSet.has(row[j]))) {
        lines++;
      }
    }

    // Diagonals
    const indices = Array.from({ length: gridSize }, (_, i) => i);
    if (
      indices.every(
        (i) =>
          currentBoard[i] &&
          currentBoard[i][i] &&
          drawnSet.has(currentBoard[i][i])
      )
    ) {
      lines++;
    }
    if (
      indices.every(
        (i) =>
          currentBoard[i] &&
          currentBoard[i][gridSize - 1 - i] &&
          drawnSet.has(currentBoard[i][gridSize - 1 - i])
      )
    ) {
      lines++;
    }

    setBingoLines(lines);
  };

  const isHost = room.host === currentUser._id;
  const canStart =
    playersReady.length >= 2 && playersReady.length === room.players.length;
  const isBoardComplete = board.every((row) =>
    row.every((cell) => cell !== null)
  );

  return (
    <>
      <Confetti show={showConfetti} />
      <AnimatePresence>
        {showWinner && (
          <WinnerCard
            winnerName={winnerName}
            isWinner={isWinner}
            onClose={() => setShowWinner(false)}
          />
        )}
      </AnimatePresence>
      <div
        className={`${
          isFullscreen
            ? "fixed inset-0 z-50 bg-gray-900 overflow-hidden flex flex-col"
            : "card space-y-6"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between ${
            isFullscreen ? "px-4 py-3 bg-gray-800/80" : ""
          }`}
        >
          <h2
            className={`font-bold gradient-text ${
              isFullscreen ? "text-xl sm:text-2xl" : "text-3xl"
            }`}
          >
            BINGO {gridSize}x{gridSize}
          </h2>

          <div className="flex items-center space-x-3">
            {/* Show players count only in non-fullscreen or non-playing modes */}
            {(!isFullscreen || gameStatus !== "playing") && (
              <div className="flex items-center space-x-2 text-gray-400">
                <Users className="w-5 h-5" />
                <span>
                  {playersReady.length}/{room.players.length} Ready
                </span>
              </div>
            )}

            {/* Fullscreen toggle button - show only during playing phase */}
            {gameStatus === "playing" && (
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>
        {/* Content Container */}
        <div
          className={`${
            isFullscreen
              ? "flex-1 overflow-y-auto px-4 pb-4 flex flex-col space-y-3"
              : "space-y-6"
          }`}
        >
          {/* BINGO Letters indicator */}
          <div className="flex justify-center space-x-1 sm:space-x-2">
            {"BINGO".split("").map((char, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8 }}
                animate={{ scale: i < bingoLines ? 1.2 : 1 }}
                className={`${
                  isFullscreen
                    ? "w-8 h-8 sm:w-10 sm:h-10 text-lg sm:text-xl"
                    : "w-10 h-10 sm:w-12 sm:h-12 text-xl sm:text-2xl"
                } flex items-center justify-center rounded-lg font-bold ${
                  i < bingoLines
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {char}
              </motion.div>
            ))}
            {bingoLines > 5 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`flex items-center ml-2 text-yellow-500 font-bold ${
                  isFullscreen ? "text-base" : "text-lg"
                }`}
              >
                +{bingoLines - 5}
              </motion.div>
            )}
          </div>

          {/* Setup Phase */}
          {gameStatus === "setup" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="text-center space-y-3">
                <p className="text-lg text-gray-300">
                  Set up your {gridSize}x{gridSize} board with numbers 1-
                  {maxNumber}
                </p>

                {/* Fill Mode Toggle */}
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => setFillMode("auto")}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      fillMode === "auto"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <ShuffleIcon className="w-4 h-4 inline mr-2" />
                    Auto Fill
                  </button>
                  <button
                    onClick={() => setFillMode("manual")}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      fillMode === "manual"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <Edit3 className="w-4 h-4 inline mr-2" />
                    Manual Fill
                  </button>
                </div>

                {fillMode === "auto" && (
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={handleAutoFill}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <ShuffleIcon className="w-5 h-5" />
                      <span>Generate Board</span>
                    </button>
                    <button
                      onClick={handleClearBoard}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <X className="w-5 h-5" />
                      <span>Clear</span>
                    </button>
                  </div>
                )}

                {fillMode === "manual" && (
                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                    <p className="text-sm text-gray-400">
                      Click cells to fill them in order. Next number:{" "}
                      <span className="text-primary-400 font-bold text-lg">
                        {nextNumberToFill}
                      </span>
                    </p>
                    <div className="flex justify-center">
                      <button
                        onClick={handleClearBoard}
                        className="btn-secondary flex items-center space-x-2"
                      >
                        <X className="w-5 h-5" />
                        <span>Clear & Restart</span>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmitBoard}
                  className="btn-primary flex items-center space-x-2 mx-auto"
                  disabled={!isBoardComplete}
                >
                  <Check className="w-5 h-5" />
                  <span>Submit & Ready Up</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Waiting Phase */}
          {gameStatus === "waiting" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-4"
            >
              <div className="flex justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
              </div>
              <p className="text-lg">Waiting for all players to be ready...</p>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="font-bold mb-2">Players Ready:</h3>
                <div className="space-y-1">
                  {playersReady.map((p) => (
                    <div
                      key={p.userId}
                      className="flex items-center justify-center space-x-2"
                    >
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{p.username}</span>
                    </div>
                  ))}
                </div>
              </div>

              {isHost && canStart && (
                <motion.button
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStartGame}
                  className="btn-primary text-lg px-8 py-3 mx-auto"
                >
                  Start Game!
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Playing Phase */}
          {gameStatus === "playing" && (
            <div className={`${isFullscreen ? "space-y-2" : "space-y-4"}`}>
              <div className="flex justify-between items-center">
                <div
                  className={isFullscreen ? "text-sm sm:text-base" : "text-lg"}
                >
                  {isMyTurn ? (
                    <motion.p
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="text-green-400 font-bold"
                    >
                      🎯 Your Turn! Pick a number
                    </motion.p>
                  ) : (
                    <p className="text-gray-400">
                      Waiting for opponent's move...
                    </p>
                  )}
                </div>

                {bingoLines >= gridSize && (
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleCallBingo}
                    className={`btn-primary bg-yellow-600 hover:bg-yellow-700 animate-pulse flex items-center space-x-2 ${
                      isFullscreen ? "text-sm px-3 py-2" : ""
                    }`}
                  >
                    <Trophy className={isFullscreen ? "w-4 h-4" : "w-5 h-5"} />
                    <span>Call BINGO!</span>
                  </motion.button>
                )}
              </div>

              <div
                className={`text-gray-400 ${
                  isFullscreen ? "text-xs" : "text-sm"
                }`}
              >
                Numbers drawn: {drawnNumbers.length} | Lines: {bingoLines}/
                {gridSize}
              </div>
            </div>
          )}

          {/* Finished Phase */}
          {gameStatus === "finished" && !showWinner && (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-center space-y-4 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 p-6 rounded-lg border-2 border-yellow-500"
            >
              <Trophy className="w-16 h-16 mx-auto text-yellow-500" />
              <h3 className="text-2xl font-bold">Game Over!</h3>
              <p className="text-lg">{winnerName} wins!</p>
              <button
                onClick={() => setShowWinner(true)}
                className="btn-primary mx-auto"
              >
                Show Winner Card
              </button>
            </motion.div>
          )}

          {/* Bingo Board */}
          <div
            className={`bg-gray-800 rounded-lg relative ${
              isFullscreen
                ? "p-2 flex-1 flex items-center justify-center"
                : "p-2 sm:p-4"
            }`}
          >
            <div className="w-full max-w-2xl mx-auto">
              <div className="relative">
                <div
                  className={`grid ${
                    isFullscreen ? "gap-1" : "gap-1 sm:gap-2"
                  }`}
                  style={{
                    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                  }}
                >
                  {board.map((row, rIndex) =>
                    row.map((cell, cIndex) => {
                      const isDrawn = cell && drawnNumbers.includes(cell);
                      const canClick =
                        (gameStatus === "playing" && isMyTurn && !isDrawn) ||
                        (gameStatus === "setup" && fillMode === "manual");
                      const isClickable =
                        gameStatus === "setup" &&
                        fillMode === "manual" &&
                        cell === null;

                      return (
                        <motion.div
                          key={`${rIndex}-${cIndex}`}
                          whileHover={canClick ? { scale: 1.05 } : {}}
                          whileTap={canClick ? { scale: 0.95 } : {}}
                          onClick={() => handleCellClick(rIndex, cIndex)}
                          className={`
                          aspect-square flex items-center justify-center rounded-lg font-bold 
                          transition-all duration-200 ${
                            isFullscreen
                              ? "text-xs sm:text-sm md:text-base"
                              : "text-sm sm:text-base md:text-lg"
                          }
                          ${
                            cell === null
                              ? "bg-gray-700 text-gray-500"
                              : isDrawn
                              ? "bg-green-600 text-white shadow-lg shadow-green-600/50"
                              : "bg-white text-gray-900 hover:bg-gray-100"
                          }
                          ${canClick ? "cursor-pointer" : ""}
                          ${
                            isClickable
                              ? "ring-2 ring-primary-400 ring-opacity-70 hover:ring-4"
                              : ""
                          }
                          ${
                            gameStatus === "setup" && fillMode === "auto"
                              ? "cursor-default"
                              : ""
                          }
                        `}
                        >
                          {cell || ""}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>{" "}
        {/* End of content container */}
      </div>{" "}
      {/* End of main container */}
    </>
  );
};

export default BingoGame;
