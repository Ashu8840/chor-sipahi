import React, { useState, useEffect } from "react";
import { socket } from "../api";

const BingoGame = ({ room, currentUser }) => {
  const [board, setBoard] = useState(
    Array(5)
      .fill(null)
      .map(() => Array(5).fill(null))
  );
  const [gameState, setGameState] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [bingoLines, setBingoLines] = useState(0);
  const [gameStatus, setGameStatus] = useState("setup"); // setup, waiting, playing, finished

  useEffect(() => {
    // Initialize game
    socket.emit("bingo:init_game", { roomId: room.roomId });

    socket.on("bingo:game_state", (game) => {
      setGameState(game);
      if (game.status === "playing") {
        setGameStatus("playing");
        setDrawnNumbers(game.drawnNumbers);
        checkTurn(game);
      } else if (game.status === "waiting") {
        // Check if I have a board
        const myPlayer = game.players.find((p) => p.userId === currentUser._id);
        if (myPlayer && myPlayer.ready) {
          setBoard(myPlayer.board);
          setGameStatus("waiting");
        } else {
          setGameStatus("setup");
        }
      }
    });

    socket.on("bingo:player_ready", ({ userId }) => {
      // Update player ready status in UI if needed
    });

    socket.on("bingo:can_start", ({ canStart }) => {
      // Show start button to host
    });

    socket.on("bingo:game_started", ({ currentTurn }) => {
      setGameStatus("playing");
      setIsMyTurn(currentTurn === currentUser._id);
    });

    socket.on("bingo:number_drawn", ({ number, nextTurn, drawnNumbers }) => {
      setDrawnNumbers(drawnNumbers);
      setIsMyTurn(nextTurn === currentUser._id);
      checkBingo(board, drawnNumbers);
    });

    socket.on("bingo:game_over", ({ winnerName }) => {
      setGameStatus("finished");
      alert(`Game Over! Winner: ${winnerName}`);
    });

    return () => {
      socket.off("bingo:game_state");
      socket.off("bingo:player_ready");
      socket.off("bingo:can_start");
      socket.off("bingo:game_started");
      socket.off("bingo:number_drawn");
      socket.off("bingo:game_over");
    };
  }, [room.roomId, currentUser._id]);

  const checkTurn = (game) => {
    if (game.players && game.players.length > 0) {
      const currentPlayer = game.players[game.currentTurnIndex];
      setIsMyTurn(currentPlayer.userId === currentUser._id);
    }
  };

  const handleCellClick = (row, col) => {
    if (gameStatus === "setup") {
      // Fill number logic
      const newBoard = [...board];
      // Simple auto-fill for now or manual input
      // For simplicity, let's implement a number picker or just toggle through unused numbers?
      // Better: Click to select cell, then type number?
      // Or just auto-fill button for speed.
    } else if (gameStatus === "playing") {
      if (!isMyTurn) return;
      const number = board[row][col];
      if (drawnNumbers.includes(number)) return;

      socket.emit("bingo:select_number", { roomId: room.roomId, number });
    }
  };

  const handleAutoFill = () => {
    const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
    // Shuffle
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    const newBoard = [];
    for (let i = 0; i < 5; i++) {
      newBoard.push(numbers.slice(i * 5, (i + 1) * 5));
    }
    setBoard(newBoard);
  };

  const handleSubmitBoard = () => {
    socket.emit("bingo:submit_board", { roomId: room.roomId, board });
    setGameStatus("waiting");
  };

  const handleStartGame = () => {
    socket.emit("bingo:start_game", { roomId: room.roomId });
  };

  const checkBingo = (currentBoard, currentDrawn) => {
    const drawnSet = new Set(currentDrawn);
    let lines = 0;
    // Rows
    for (let i = 0; i < 5; i++) {
      if (currentBoard[i].every((n) => drawnSet.has(n))) lines++;
    }
    // Cols
    for (let j = 0; j < 5; j++) {
      if (currentBoard.every((row) => drawnSet.has(row[j]))) lines++;
    }
    // Diagonals
    if ([0, 1, 2, 3, 4].every((i) => drawnSet.has(currentBoard[i][i]))) lines++;
    if ([0, 1, 2, 3, 4].every((i) => drawnSet.has(currentBoard[i][4 - i])))
      lines++;

    setBingoLines(lines);
    if (lines >= 5) {
      socket.emit("bingo:check_win", { roomId: room.roomId });
    }
  };

  const isHost = room.host === currentUser._id;

  return (
    <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg text-white">
      <h2 className="text-2xl font-bold mb-4">Bingo</h2>

      <div className="mb-4">
        <span className="text-xl font-bold text-yellow-400">
          {"BINGO".split("").map((char, i) => (
            <span
              key={i}
              className={i < bingoLines ? "text-green-500" : "text-gray-500"}
            >
              {char}
            </span>
          ))}
        </span>
      </div>

      {gameStatus === "setup" && (
        <div className="mb-4">
          <button
            onClick={handleAutoFill}
            className="bg-blue-500 px-4 py-2 rounded mr-2 hover:bg-blue-600"
          >
            Auto Fill
          </button>
          <button
            onClick={handleSubmitBoard}
            className="bg-green-500 px-4 py-2 rounded hover:bg-green-600"
            disabled={board.some((row) => row.some((c) => c === null))}
          >
            Ready
          </button>
        </div>
      )}

      {gameStatus === "waiting" && (
        <div className="mb-4 text-center">
          <p>Waiting for other players...</p>
          {isHost && (
            <button
              onClick={handleStartGame}
              className="mt-2 bg-green-600 px-6 py-2 rounded font-bold animate-pulse"
            >
              Start Game
            </button>
          )}
        </div>
      )}

      {gameStatus === "playing" && (
        <div className="mb-4">
          {isMyTurn ? (
            <p className="text-green-400 font-bold">
              Your Turn! Pick a number.
            </p>
          ) : (
            <p className="text-gray-400">Waiting for opponent...</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-5 gap-2 bg-gray-700 p-2 rounded">
        {board.map((row, rIndex) =>
          row.map((cell, cIndex) => {
            const isDrawn = drawnNumbers.includes(cell);
            return (
              <div
                key={`${rIndex}-${cIndex}`}
                onClick={() => handleCellClick(rIndex, cIndex)}
                className={`
                  w-12 h-12 flex items-center justify-center rounded cursor-pointer font-bold text-lg
                  ${
                    cell === null
                      ? "bg-gray-600"
                      : isDrawn
                      ? "bg-green-600 text-white"
                      : "bg-white text-black hover:bg-gray-200"
                  }
                  ${
                    gameStatus === "playing" && isMyTurn && !isDrawn
                      ? "ring-2 ring-yellow-400"
                      : ""
                  }
                `}
              >
                {cell}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BingoGame;
