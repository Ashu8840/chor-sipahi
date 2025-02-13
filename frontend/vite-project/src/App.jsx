import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import ChatBox from "./ChatBox.jsx";
import Confetti from "react-confetti";

const socket = io("http://192.168.85.93:5000");

function App() {
  const [name, setName] = useState("");
  const [players, setPlayers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [scores, setScores] = useState({});
  const [round, setRound] = useState(0);
  const [role, setRole] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [shuffleClicked, setShuffleClicked] = useState(false); // Track shuffle button click
  const [shufflePlayer, setShufflePlayer] = useState(null); // Player with shuffle button
  const [isPolice, setIsPolice] = useState(false);
  const [isGuessing, setIsGuessing] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    socket.on("updatePlayers", (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    socket.on(
      "gameStart",
      ({ players, roles, scores, round, shufflePlayerId }) => {
        setGameStarted(true);
        setPlayers(players);
        setRoles(roles);
        setScores(scores);
        setRound(round);

        setShufflePlayer(shufflePlayerId);
        setShuffleClicked(false); // Reset shuffle state

        const myPlayer = players.find((player) => player.id === socket.id);
        if (myPlayer) {
          setRole(myPlayer.role);
          setIsPolice(myPlayer.role === "Police");
        }
      }
    );

    socket.on(
      "nextRound",
      ({ players, roles, scores, round, shufflePlayerId }) => {
        setPlayers(players);
        setRoles(roles);
        setScores(scores);
        setRound(round);

        setShufflePlayer(shufflePlayerId);
        setShuffleClicked(false); // Reset shuffle state

        const myPlayer = players.find((player) => player.id === socket.id);
        if (myPlayer) {
          setRole(myPlayer.role);
          setIsPolice(myPlayer.role === "Police");
        }

        setRoundResult(null);
        setIsGuessing(false);
      }
    );

    socket.on("roundResult", ({ scores, correctGuess }) => {
      setScores(scores);
      setRoundResult(correctGuess ? "hurray" : "sad");
    });

    socket.on("gameEnd", ({ winner, scores }) => {
      setWinner(winner);
      setGameStarted(false);
    });

    return () => {
      socket.off("updatePlayers");
      socket.off("gameStart");
      socket.off("nextRound");
      socket.off("roundResult");
      socket.off("gameEnd");
    };
  }, [players]);

  const handleJoinGame = () => {
    if (name.trim()) {
      socket.emit("joinGame", name);
    }
  };

  const handleShuffleRoles = () => {
    setShuffleClicked(true); // Shuffle button clicked
    socket.emit("shuffleRoles");
  };

  const handleGuessChor = (guessId) => {
    setIsGuessing(true);
    socket.emit("guessChor", { guessId });
  };

  return (
    <div className="game-container">
      <ChatBox />
      {winner && (
        <motion.div
          className="winner-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <Confetti />
          <h1>🎉 Winner 🎉</h1>
          <h2>{winner.name}</h2>
          <h3>Score: {scores[winner.id]}</h3>
        </motion.div>
      )}

      {!gameStarted && !winner ? (
        <div className="join-game">
          <h2 className="heading">Join Chor Police Game</h2>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-name"
          />
          <button onClick={handleJoinGame} className="join-button">
            Join Game
          </button>

          <h3 className="subheading">Players:</h3>
          <div className="player-list">
            {players.map((player, index) => (
              <p key={index} className="player-name">
                {player.name}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className="game-main">
          <h1 className="game-title">Chor Police Game</h1>
          <h3 className="welcome-message">Welcome, {name}!</h3>
          <h3 className="round-info">Round: {round}/10</h3>

          {shufflePlayer === socket.id && !shuffleClicked && (
            <button onClick={handleShuffleRoles} className="shuffle-button">
              Shuffle Roles
            </button>
          )}

          {shuffleClicked && role && shufflePlayer !== socket.id && (
            <motion.div
              className="role-card"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 1 }}
            >
              <h3>Your Role</h3>
              <p className={`role ${role}`}>{role}</p>
            </motion.div>
          )}

          <div className="scoreboard">
            <h3 className="subheading">Scores:</h3>
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id}>
                    <td>{player.name}</td>
                    <td>{scores[player.id] || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {roundResult && (
            <motion.div
              className={`round-result ${roundResult}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {roundResult === "hurray" ? "🎉 Hurray! 🎉" : "😔 Sad 😔"}
            </motion.div>
          )}

          {isPolice && shuffleClicked && !isGuessing && (
            <div className="guess-section">
              <h4 className="guess-prompt">Who is the Chor?</h4>
              <div className="guess-buttons">
                {players
                  .filter((player) => player.id !== socket.id)
                  .map((player) => (
                    <button
                      key={player.id}
                      onClick={() => handleGuessChor(player.id)}
                      className="guess-button"
                    >
                      {player.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
