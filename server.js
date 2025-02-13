import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

// In-memory storage for game state
let players = []; // Stores player information: [{ id, name, score }]
let roles = ["Raja", "Mantri", "Police", "Chor"]; // Game roles
let currentRound = 0;
let scores = {}; // { playerId: score }

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle player joining the game
  socket.on("joinGame", (name) => {
    if (players.length < 4) {
      players.push({ id: socket.id, name, score: 0 });
      console.log(`${name} joined the game`);
      scores[socket.id] = 0;

      // Notify all players of the updated list
      io.emit("updatePlayers", players);

      // Start the game when 4 players have joined
      if (players.length === 4) {
        startGame();
      }
    } else {
      socket.emit("error", "Game is full");
    }
  });

  // Handle role shuffle and turn assignment
  const startGame = () => {
    console.log("Game started!");
    shuffleRoles();
    io.emit("gameStart", { players, roles, scores, round: currentRound + 1 });
  };

  const shuffleRoles = () => {
    const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);
    players.forEach((player, index) => {
      player.role = shuffledRoles[index];
    });
    console.log("Roles assigned:", players);
  };

  // Handle police guessing the Chor
  socket.on("guessChor", ({ guessId }) => {
    const police = players.find((player) => player.role === "Police");
    const chor = players.find((player) => player.role === "Chor");

    if (police && chor) {
      if (chor.id === guessId) {
        // Correct guess
        scores[police.id] += 100;
        scores[chor.id] += 0;
      } else {
        // Incorrect guess
        scores[police.id] += 0;
        scores[chor.id] += 100;
      }

      io.emit("roundResult", { scores, correctGuess: chor.id === guessId });
      nextRound();
    }
  });

  const nextRound = () => {
    currentRound++;

    // Add points for Raja and Mantri
    players.forEach((player) => {
      if (player.role === "Raja") {
        scores[player.id] += 1000; // Raja gets 1000 points
      } else if (player.role === "Mantri") {
        scores[player.id] += 600; // Mantri gets 600 points
      }
    });

    if (currentRound >= 10) {
      endGame();
    } else {
      shuffleRoles();
      io.emit("nextRound", { players, roles, scores, round: currentRound + 1 });
    }
  };

  const endGame = () => {
    const winner = players.reduce((max, player) =>
      scores[player.id] > scores[max.id] ? player : max
    );
    io.emit("gameEnd", { winner, scores });
    resetGame();
  };

  const resetGame = () => {
    players = [];
    scores = {};
    currentRound = 0;
  };
  socket.on("shuffleRoles", () => {
    shuffleRoles();
    io.emit("nextRound", { players, roles, scores, round: currentRound + 1 });
  });
  
  // Handle player disconnection
  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    players = players.filter((player) => player.id !== socket.id);
    io.emit("updatePlayers", players);
  });

  // Chat functionality
  socket.on("send_message", (data) => {
    io.emit("receive_message", { ...data, sender: socket.id });
  });
});



server.listen(5000, "0.0.0.0", () => {
  console.log("Backend running on port 5000");
});
