import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Crown,
  Shield,
  Swords,
  X as XIcon,
  Shuffle,
  Trophy,
  Sparkles,
  Maximize,
  Minimize,
} from "lucide-react";
import Navbar from "../components/Navbar";
import FloatingChat from "../components/FloatingChat";
import VideoGrid from "../components/VideoGrid";
import Loading from "../components/Loading";
import { roomAPI } from "../services/api";
import socketService from "../services/socket";
import { useGameStore } from "../context/gameStore";
import { useAuthStore } from "../context/authStore";
import toast from "react-hot-toast";

const roleIcons = {
  Raja: Crown,
  Mantri: Shield,
  Sipahi: Swords,
  Chor: XIcon,
};

const roleColors = {
  Raja: "from-yellow-500 to-orange-500",
  Mantri: "from-blue-500 to-cyan-500",
  Sipahi: "from-green-500 to-emerald-500",
  Chor: "from-red-500 to-pink-500",
};

const roleDescriptions = {
  Raja: "The King - You win if Sipahi catches the Chor",
  Mantri: "The Minister - You win if Sipahi catches the Chor",
  Sipahi: "The Soldier - Guess who is the Chor correctly",
  Chor: "The Thief - Don't get caught by the Sipahi",
};

export default function GamePanel() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState("shuffling");
  const [shufflerUserId, setShufflerUserId] = useState(
    location.state?.shufflerUserId || null
  );
  const [myRole, setMyRole] = useState(null);
  const [isSipahi, setIsSipahi] = useState(false);
  const [scores, setScores] = useState({});
  const [currentRound, setCurrentRound] = useState(location.state?.round || 1);
  const [roundResult, setRoundResult] = useState(null);
  const [showRoleCard, setShowRoleCard] = useState(false);
  const [showShuffleCard, setShowShuffleCard] = useState(false);
  const [showGuessCard, setShowGuessCard] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Audio ref for sound effects
  const audioContextRef = useRef(null);

  const { user } = useAuthStore();
  const { currentRoom, setCurrentRoom, updateRoom } = useGameStore();

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext ||
      window.webkitAudioContext)();
    return () => {
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Fullscreen functions
  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem
        .requestFullscreen()
        .catch((err) => console.log("Fullscreen error:", err));
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

  // Play sound effect
  const playSound = (frequency = 600, duration = 0.15) => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      oscillator.frequency.value = frequency;
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContextRef.current.currentTime + duration
      );

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
    }
  };

  const handleError = (data) => {
    console.error("Socket error:", data);
    toast.error(data.message);
  };

  const handleRoomDisbanded = (data) => {
    console.log("Room disbanded:", data);
    toast.error(data.message || "Room has been disbanded");
    navigate("/lobby");
  };

  useEffect(() => {
    console.log("GamePanel mounted with state:", location.state);
    console.log(
      "Initial shufflerUserId from state:",
      location.state?.shufflerUserId
    );
    console.log("My user ID:", user._id);
    console.log(
      "Am I the shuffler?",
      location.state?.shufflerUserId === user._id
    );

    // Don't join room again - already joined from GameRoom
    console.log("GamePanel mounted for room:", roomId);

    fetchRoomData();

    socketService.on("room_updated", handleRoomUpdated);
    socketService.on("game_started", handleGameStarted);
    socketService.on("role_assigned", handleRoleAssigned);
    socketService.on("roles_shuffled", handleRolesShuffled);
    socketService.on("guess_result", handleGuessResult);
    socketService.on("next_round", handleNextRound);
    socketService.on("game_finished", handleGameFinished);
    socketService.on("room_disbanded", handleRoomDisbanded);
    socketService.on("error", handleError);

    return () => {
      socketService.off("room_updated", handleRoomUpdated);
      socketService.off("game_started", handleGameStarted);
      socketService.off("role_assigned", handleRoleAssigned);
      socketService.off("roles_shuffled", handleRolesShuffled);
      socketService.off("guess_result", handleGuessResult);
      socketService.off("next_round", handleNextRound);
      socketService.off("game_finished", handleGameFinished);
      socketService.off("room_disbanded", handleRoomDisbanded);
      socketService.off("error", handleError);
      // Don't leave room when GamePanel unmounts - user might be going back to lobby
    };
  }, [roomId]); // Only re-run if roomId changes

  const fetchRoomData = async () => {
    try {
      const response = await roomAPI.getRoom(roomId);
      const room = response.data.room;
      setCurrentRoom(room);

      console.log("Fetched room data:", {
        status: room.status,
        currentRound: room.currentRound,
        gameState: room.gameState,
        currentShuffler: room.gameState?.currentShuffler,
        fullRoom: room,
      });

      // Check if game already started
      if (room.status === "playing") {
        setGameState("shuffling");
        setCurrentRound(room.currentRound || 1);

        // Initialize scores from room data
        const roomScores = room.gameState?.scores || {};
        console.log("Initializing scores from room:", roomScores);
        setScores(roomScores);

        // Get shuffler from game state
        const shufflerId = room.gameState?.currentShuffler;
        console.log(
          "Shuffler ID from room:",
          shufflerId,
          "Type:",
          typeof shufflerId
        );
        console.log("My user ID:", user._id, "Type:", typeof user._id);

        if (shufflerId) {
          console.log("Setting shuffler from room state:", shufflerId);
          console.log(
            "Match check:",
            shufflerId === user._id,
            shufflerId.toString() === user._id.toString()
          );
          setShufflerUserId(shufflerId);
        } else {
          console.warn("No currentShuffler found in room.gameState!");
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch room:", error);
      toast.error("Room not found");
      navigate("/lobby");
    }
  };

  const handleRoomUpdated = (room) => {
    console.log("Room updated event received:", room);
    updateRoom(room);

    // Check if shuffler was assigned but DON'T update scores here
    // Scores should only be updated from guess_result and next_round events
    if (
      room.status === "playing" &&
      room.gameState?.currentShuffler &&
      !shufflerUserId
    ) {
      console.log(
        "Setting shuffler from room_updated event:",
        room.gameState.currentShuffler
      );
      setShufflerUserId(room.gameState.currentShuffler);
      setGameState("shuffling");
      setCurrentRound(room.currentRound || 1);
      // DON'T update scores here - they come from guess_result/next_round
    }
  };

  const handleGameStarted = ({
    shufflerUserId: shuffler,
    shufflerName,
    round,
  }) => {
    console.log("Game started event received:", {
      shuffler,
      shufflerName,
      round,
    });
    console.log("My user ID:", user._id);
    setGameState("shuffling");
    setShufflerUserId(shuffler);
    setCurrentRound(round);

    // Show shuffle card if this user is the shuffler
    if (shuffler === user._id) {
      setShowShuffleCard(true);
    }

    toast.success(`${shufflerName} will shuffle the roles!`);
  };

  const handleRoleAssigned = ({ role, isSipahi: sipahi }) => {
    setMyRole(role);
    setIsSipahi(sipahi);
    setShowRoleCard(true);
    setGameState("playing");

    // Play sound based on role
    if (role === "Chor") {
      playSound(300, 0.3); // Low tone for Chor
    } else if (sipahi) {
      playSound(800, 0.2); // High tone for Sipahi
    } else {
      playSound(600, 0.2); // Mid tone for others
    }

    // Show guess card for Sipahi after role card disappears
    if (sipahi) {
      setTimeout(() => {
        setShowGuessCard(true);
      }, 3000);
    }

    setTimeout(() => setShowRoleCard(false), 3000);
  };

  const handleRolesShuffled = ({ shufflerUserId: shuffler }) => {
    setShufflerUserId(shuffler);
    playSound(700, 0.15); // Shuffle sound
    toast.success("Roles assigned!");
  };

  const handleGuessResult = ({
    sipahiName,
    guessedName,
    chorName,
    isCorrect,
    pointsDistribution,
    totalScores,
    roles,
  }) => {
    console.log("Guess result received:", { pointsDistribution, totalScores });
    setRoundResult({
      sipahiName,
      guessedName,
      chorName,
      isCorrect,
      pointsDistribution,
      roles,
    });
    setScores(totalScores);
    setGameState("results");

    if (isCorrect) {
      toast.success(`${sipahiName} guessed correctly!`);
    } else {
      toast.error(`Wrong! ${chorName} was the Chor.`);
    }
  };

  const handleNextRound = ({
    round,
    shufflerUserId: shuffler,
    shufflerName,
    totalScores,
  }) => {
    console.log("Next round started:", { round, totalScores });
    setCurrentRound(round);
    setGameState("shuffling");
    setShufflerUserId(shuffler);
    setMyRole(null);
    setIsSipahi(false);
    setRoundResult(null);
    setScores(totalScores);
    toast.success(`Round ${round}! ${shufflerName} will shuffle.`);
  };

  const handleGameFinished = ({
    winner,
    finalScores,
    reason,
    message,
    winnerName,
    winnerId,
    winnerScore,
  }) => {
    console.log("Game finished:", {
      winner,
      finalScores,
      reason,
      message,
      winnerScore,
    });
    setGameState("finished");
    setScores(finalScores);

    // Handle both old and new format
    if (winner) {
      setWinner({
        name: winner.username,
        id: winner.userId,
        score: winner.score,
      });
    } else if (winnerName && winnerId) {
      // Get winner's score from finalScores if not provided
      const score = winnerScore || finalScores?.[winnerId] || 0;
      setWinner({ name: winnerName, id: winnerId, score });
    }

    // Show message if game ended due to player leaving
    if (reason === "player_left" || reason === "player_disconnected") {
      toast.error(message || "Game ended - a player left");
    }
  };

  const handleShuffle = () => {
    console.log(
      "Shuffle button clicked, emitting shuffle_roles for room:",
      roomId
    );
    socketService.emit("shuffle_roles", { roomId });
    setShowShuffleCard(false);
  };

  const handleGuess = (guessedUserId) => {
    socketService.emit("guess_chor", { roomId, guessedUserId });
    setShowGuessCard(false);
  };

  const handleLeaveRoom = async () => {
    try {
      // Note: VideoGrid component will cleanup automatically on unmount
      await roomAPI.leaveRoom(roomId);
      socketService.leaveRoom(roomId);
      navigate("/lobby");
    } catch (error) {
      toast.error("Failed to leave room");
    }
  };

  if (loading) return <Loading />;

  const amIShuffler = shufflerUserId === user._id;
  const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);

  console.log("GamePanel render:", {
    gameState,
    shufflerUserId,
    userId: user._id,
    amIShuffler,
    currentRoom: currentRoom?.name,
    scores,
    sortedScores,
  });

  return (
    <div
      className={`min-h-screen bg-gray-950 ${
        isFullscreen ? "fixed inset-0 z-50 overflow-hidden flex flex-col" : ""
      }`}
    >
      {!isFullscreen && <Navbar />}

      <div
        className={`${
          isFullscreen ? "flex-1 overflow-y-auto" : "max-w-7xl mx-auto"
        } px-4 py-6`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLeaveRoom}
              className="btn-secondary flex items-center space-x-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Leave</span>
            </button>
            <div>
              <h1
                className={`font-bold ${isFullscreen ? "text-xl" : "text-2xl"}`}
              >
                {currentRoom.name}
              </h1>
              <p className="text-gray-400 text-sm">Round {currentRound} / 10</p>
            </div>
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left: Score Table */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card sticky top-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <h2 className="text-xl font-bold">Scoreboard</h2>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-400 border-b border-gray-700 pb-2">
                  <span>Rank</span>
                  <span>Player</span>
                  <span className="text-right">Points</span>
                </div>

                {sortedScores.map(([userId, score], index) => {
                  const player = currentRoom.players.find(
                    (p) => p.userId === userId
                  );
                  const isMe = userId === user._id;

                  return (
                    <motion.div
                      key={userId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`grid grid-cols-3 gap-2 p-2 rounded ${
                        isMe
                          ? "bg-purple-600/20 border border-purple-500/30"
                          : "bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-center space-x-1">
                        {index === 0 && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className="font-bold">#{index + 1}</span>
                      </div>
                      <span className="text-sm truncate">
                        {player?.displayName || player?.username}
                      </span>
                      <span className="text-right font-bold text-yellow-500">
                        {score}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Center: Game Area */}
          <div className="lg:col-span-6 space-y-6">
            {/* Role Card Animation */}
            <AnimatePresence>
              {showRoleCard && myRole && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className={`relative w-96 h-96 bg-linear-to-br ${roleColors[myRole]} rounded-3xl shadow-2xl p-1`}
                  >
                    <div className="w-full h-full bg-gray-900 rounded-3xl flex flex-col items-center justify-center space-y-6 p-8">
                      {(() => {
                        const Icon = roleIcons[myRole];
                        return (
                          <Icon className="w-32 h-32 text-white drop-shadow-lg" />
                        );
                      })()}
                      <h2 className="text-5xl font-bold text-white">
                        {myRole}
                      </h2>
                      <p className="text-center text-gray-300">
                        {roleDescriptions[myRole]}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Shuffle Card - Fullscreen Modal */}
            <AnimatePresence>
              {showShuffleCard && amIShuffler && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
                  onClick={(e) => e.target === e.currentTarget && null}
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative w-96 h-96 bg-linear-to-br from-purple-600 to-pink-600 rounded-3xl shadow-2xl p-1"
                  >
                    <div className="w-full h-full bg-gray-900 rounded-3xl flex flex-col items-center justify-center space-y-6 p-8">
                      <Sparkles className="w-32 h-32 text-purple-400 animate-pulse" />
                      <h2 className="text-4xl font-bold text-white text-center">
                        You are the Shuffler!
                      </h2>
                      <p className="text-center text-gray-300 text-lg">
                        Click the button to shuffle and assign roles to all
                        players
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleShuffle}
                        className="btn-primary flex items-center space-x-3 text-xl px-8 py-4 bg-linear-to-r from-purple-600 to-pink-600"
                      >
                        <Shuffle className="w-6 h-6" />
                        <span>Shuffle Roles</span>
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Guess Card - Fullscreen Modal for Sipahi */}
            <AnimatePresence>
              {showGuessCard &&
                isSipahi &&
                gameState === "playing" &&
                !roundResult && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={(e) => e.target === e.currentTarget && null}
                  >
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ delay: 0.1 }}
                      className="relative w-[500px] bg-linear-to-br from-green-600 to-emerald-600 rounded-3xl shadow-2xl p-1"
                    >
                      <div className="w-full bg-gray-900 rounded-3xl p-8">
                        <div className="flex flex-col items-center mb-6">
                          <Swords className="w-20 h-20 text-green-400 mb-4" />
                          <h2 className="text-3xl font-bold text-white text-center">
                            Who is the Chor?
                          </h2>
                          <p className="text-gray-300 mt-2 text-center">
                            Make your guess carefully!
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
                          {currentRoom.players
                            .filter((p) => p.userId !== user._id)
                            .map((player) => (
                              <motion.button
                                key={player.userId}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleGuess(player.userId)}
                                className="btn-secondary text-left p-4 bg-gray-800/80 hover:bg-green-600/20 border border-gray-700 hover:border-green-500 transition-all"
                              >
                                <div className="flex items-center space-x-3">
                                  <img
                                    src={player.avatar || "/default-avatar.png"}
                                    alt={player.username}
                                    className="w-12 h-12 rounded-full"
                                  />
                                  <div>
                                    <div className="font-semibold text-lg">
                                      {player.displayName || player.username}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                      Click to accuse
                                    </div>
                                  </div>
                                </div>
                              </motion.button>
                            ))}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
            </AnimatePresence>

            {/* Shuffle Button - Hidden when card is shown */}
            {gameState === "shuffling" && amIShuffler && !showShuffleCard && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="card text-center bg-linear-to-br from-purple-900/30 to-pink-900/30 border-2 border-purple-500"
              >
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                <h2 className="text-3xl font-bold mb-4">
                  You are the Shuffler!
                </h2>
                <p className="text-gray-400 mb-6">
                  Click the button to assign roles
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShuffle}
                  className="btn-primary flex items-center space-x-3 mx-auto text-xl px-8 py-4 bg-linear-to-r from-purple-600 to-pink-600"
                >
                  <Shuffle className="w-6 h-6" />
                  <span>Shuffle Roles</span>
                </motion.button>
              </motion.div>
            )}

            {gameState === "shuffling" && !amIShuffler && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card text-center"
              >
                <Shuffle className="w-16 h-16 mx-auto mb-4 text-gray-500 animate-spin" />
                <h2 className="text-2xl font-bold mb-2">
                  Waiting for shuffler...
                </h2>
                <p className="text-gray-400">
                  {
                    currentRoom.players.find((p) => p.userId === shufflerUserId)
                      ?.displayName
                  }{" "}
                  is shuffling the roles
                </p>
              </motion.div>
            )}

            {/* Guess UI for Sipahi - Hidden when card is shown */}
            {isSipahi &&
              gameState === "playing" &&
              !roundResult &&
              !showGuessCard && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card bg-linear-to-br from-green-900/30 to-emerald-900/30 border-2 border-green-500"
                >
                  <h2 className="text-2xl font-bold mb-4 text-center">
                    Who is the Chor?
                  </h2>
                  <p className="text-gray-400 mb-6 text-center">
                    Make your guess carefully!
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                    {currentRoom.players
                      .filter((p) => p.userId !== user._id)
                      .map((player) => (
                        <motion.button
                          key={player.userId}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleGuess(player.userId)}
                          className="btn-secondary text-left p-4 bg-gray-800/80 hover:bg-green-600/20 border border-gray-700 hover:border-green-500"
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src={player.avatar || "/default-avatar.png"}
                              alt={player.username}
                              className="w-12 h-12 rounded-full"
                            />
                            <div>
                              <div className="font-semibold text-lg">
                                {player.displayName || player.username}
                              </div>
                              <div className="text-sm text-gray-400">
                                Click to accuse
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                  </div>
                </motion.div>
              )}

            {/* Waiting for Sipahi */}
            {!isSipahi && gameState === "playing" && !roundResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card text-center"
              >
                <Swords className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h2 className="text-2xl font-bold mb-2">
                  Sipahi is deciding...
                </h2>
                <p className="text-gray-400">
                  Waiting for the Sipahi to guess who is the Chor
                </p>
              </motion.div>
            )}

            {/* Round Results */}
            {roundResult && gameState === "results" && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="card"
              >
                <h2 className="text-3xl font-bold mb-6 text-center">
                  Round Results
                </h2>

                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`p-6 rounded-xl mb-6 ${
                    roundResult.isCorrect
                      ? "bg-linear-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500"
                      : "bg-linear-to-r from-red-600/20 to-pink-600/20 border-2 border-red-500"
                  }`}
                >
                  <div className="text-center">
                    <p className="text-xl mb-2">
                      <span className="font-bold">
                        {roundResult.sipahiName}
                      </span>{" "}
                      guessed{" "}
                      <span className="font-bold">
                        {roundResult.guessedName}
                      </span>
                    </p>
                    <div className="text-4xl font-bold my-4">
                      {roundResult.isCorrect ? "✓ Correct!" : "✗ Wrong!"}
                    </div>
                    <p className="text-lg">
                      The Chor was:{" "}
                      <span className="font-bold text-red-400">
                        {roundResult.chorName}
                      </span>
                    </p>
                  </div>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-bold mb-3 text-lg">Roles Revealed</h3>
                    <div className="space-y-2">
                      {Object.entries(roundResult.roles).map(
                        ([userId, role]) => {
                          const player = currentRoom.players.find(
                            (p) => p.userId === userId
                          );
                          const Icon = roleIcons[role];
                          return (
                            <div
                              key={userId}
                              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                            >
                              <div className="flex items-center space-x-2">
                                <Icon className="w-5 h-5" />
                                <span>
                                  {player?.displayName || player?.username}
                                </span>
                              </div>
                              <span
                                className={`font-bold bg-linear-to-r ${roleColors[role]} bg-clip-text text-transparent`}
                              >
                                {role}
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold mb-3 text-lg">Points Earned</h3>
                    <div className="space-y-2">
                      {Object.entries(roundResult.pointsDistribution).map(
                        ([userId, points]) => {
                          const player = currentRoom.players.find(
                            (p) => p.userId === userId
                          );
                          return (
                            <motion.div
                              key={userId}
                              initial={{ x: 20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                            >
                              <span>
                                {player?.displayName || player?.username}
                              </span>
                              <span
                                className={`font-bold text-xl ${
                                  points > 0
                                    ? "text-green-500"
                                    : "text-gray-500"
                                }`}
                              >
                                +{points}
                              </span>
                            </motion.div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Game Finished - Winner Screen */}
            {gameState === "finished" && winner && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
              >
                <div className="text-center space-y-6 p-12">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Trophy className="w-32 h-32 mx-auto text-yellow-500" />
                  </motion.div>

                  <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-6xl font-bold bg-linear-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent"
                  >
                    Congratulations!
                  </motion.h1>

                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-3xl text-white"
                  >
                    <span className="font-bold">{winner.name}</span> Wins!
                  </motion.p>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                    className="text-5xl font-bold text-yellow-500"
                  >
                    {winner.score?.toLocaleString()} Points
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="pt-6"
                  >
                    <button
                      onClick={() => navigate("/lobby")}
                      className="btn-primary text-xl px-8 py-4"
                    >
                      Back to Lobby
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: My Role Card */}
          <div className="lg:col-span-3">
            {myRole && gameState === "playing" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`card sticky top-6 bg-linear-to-br ${roleColors[myRole]} p-1`}
              >
                <div className="bg-gray-900 rounded-xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-center">Your Role</h3>

                  <div className="text-center">
                    {(() => {
                      const Icon = roleIcons[myRole];
                      return <Icon className="w-24 h-24 mx-auto text-white" />;
                    })()}
                  </div>

                  <h2
                    className={`text-4xl font-bold text-center bg-linear-to-r ${roleColors[myRole]} bg-clip-text text-transparent`}
                  >
                    {myRole}
                  </h2>

                  <p className="text-sm text-gray-400 text-center">
                    {roleDescriptions[myRole]}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Video Grid for video mode */}
      {currentRoom?.mode === "video" && (
        <VideoGrid
          roomId={roomId}
          players={currentRoom.players}
          currentUserId={user._id}
        />
      )}

      {/* Floating Chat */}
      <FloatingChat roomId={roomId} />
    </div>
  );
}
