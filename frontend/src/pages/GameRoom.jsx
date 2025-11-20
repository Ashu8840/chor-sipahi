import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Check,
  X,
  Crown,
  Shield,
  Swords,
  Shuffle,
  Play,
  Trophy,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Loading from "../components/Loading";
import FloatingChat from "../components/FloatingChat";
import VideoGrid from "../components/VideoGrid";
import { roomAPI } from "../services/api";
import socketService from "../services/socket";
import { useGameStore } from "../context/gameStore";
import { useAuthStore } from "../context/authStore";
import toast from "react-hot-toast";

const roleIcons = {
  Raja: Crown,
  Mantri: Shield,
  Sipahi: Swords,
  Chor: X,
};

const roleColors = {
  Raja: "text-yellow-500",
  Mantri: "text-blue-500",
  Sipahi: "text-green-500",
  Chor: "text-red-500",
};

export default function GameRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [canStartGame, setCanStartGame] = useState(false);
  const [gameState, setGameState] = useState("waiting");
  const [shufflerUserId, setShufflerUserId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [isSipahi, setIsSipahi] = useState(false);
  const [scores, setScores] = useState({});
  const [currentRound, setCurrentRound] = useState(1);
  const [roundResult, setRoundResult] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { user } = useAuthStore();
  const { currentRoom, setCurrentRoom, updateRoom } = useGameStore();

  const handleError = (data) => {
    console.error("GameRoom socket error:", data);
    toast.error(data.message);
  };

  const handleRoomDisbanded = (data) => {
    console.log("Room disbanded:", data);
    toast.error(data.message || "Room has been disbanded");
    navigate("/lobby");
  };

  useEffect(() => {
    fetchRoomData();
    socketService.joinRoom(roomId);

    socketService.on("room_updated", handleRoomUpdated);
    socketService.on("can_start_game", () => setCanStartGame(true));
    socketService.on("game_started", handleGameStarted);
    socketService.on("role_assigned", handleRoleAssigned);
    socketService.on("roles_shuffled", handleRolesShuffled);
    socketService.on("guess_result", handleGuessResult);
    socketService.on("next_round", handleNextRound);
    socketService.on("game_finished", handleGameFinished);
    socketService.on("room_disbanded", handleRoomDisbanded);
    socketService.on("error", handleError);

    return () => {
      // Always clean up event listeners to prevent duplicate listeners
      socketService.off("room_updated", handleRoomUpdated);
      socketService.off("game_started", handleGameStarted);
      socketService.off("role_assigned", handleRoleAssigned);
      socketService.off("roles_shuffled", handleRolesShuffled);
      socketService.off("guess_result", handleGuessResult);
      socketService.off("next_round", handleNextRound);
      socketService.off("game_finished", handleGameFinished);
      socketService.off("room_disbanded", handleRoomDisbanded);
      socketService.off("error", handleError);

      // Don't emit can_start_game cleanup
      socketService.socket?.off("can_start_game");
    };
  }, [roomId, isRedirecting]);

  const fetchRoomData = async () => {
    try {
      const response = await roomAPI.getRoom(roomId);
      setCurrentRoom(response.data.room);
      setLoading(false);
    } catch (error) {
      toast.error("Room not found");
      navigate("/lobby");
    }
  };

  const handleRoomUpdated = (room) => {
    updateRoom(room);
  };

  const handleGameStarted = ({
    shufflerUserId: shuffler,
    shufflerName,
    round,
  }) => {
    console.log("GameRoom: game_started received, redirecting to game panel");
    console.log("Shuffler data:", { shuffler, shufflerName, round });
    setGameState("shuffling");
    setShufflerUserId(shuffler);
    setCurrentRound(round);
    setIsRedirecting(true);
    toast.success(`Game starting! ${shufflerName} will shuffle!`);

    // Redirect with shuffler data in state
    setTimeout(() => {
      navigate(`/game/${roomId}`, {
        replace: true,
        state: { shufflerUserId: shuffler, shufflerName, round },
      });
    }, 800);
  };

  const handleRoleAssigned = ({ role, isSipahi: sipahi }) => {
    setMyRole(role);
    setIsSipahi(sipahi);
    setGameState("playing");
  };

  const handleRolesShuffled = () => {
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
      toast.error(`Wrong guess! ${chorName} was the Chor.`);
    }
  };

  const handleNextRound = ({
    round,
    shufflerUserId: shuffler,
    shufflerName,
    totalScores,
  }) => {
    setCurrentRound(round);
    setGameState("shuffling");
    setShufflerUserId(shuffler);
    setMyRole(null);
    setIsSipahi(false);
    setRoundResult(null);
    setScores(totalScores);
    toast.success(`Round ${round}! ${shufflerName} will shuffle.`);
  };

  const handleGameFinished = ({ winnerName, finalScores }) => {
    setGameState("finished");
    setScores(finalScores);
    toast.success(`${winnerName} wins!`);
  };

  const handleToggleReady = () => {
    const player = currentRoom.players.find((p) => p.userId === user._id);
    socketService.playerReady(roomId, !player?.isReady);
  };

  const handleStartGame = () => {
    socketService.emit("start_round", { roomId });
  };

  const handleShuffle = () => {
    socketService.emit("shuffle_roles", { roomId });
  };

  const handleGuess = (guessedUserId) => {
    socketService.emit("guess_chor", { roomId, guessedUserId });
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

  const isHost = currentRoom?.host === user._id;
  const myPlayer = currentRoom?.players?.find((p) => p.userId === user._id);
  const allReady = currentRoom?.players?.every((p) => p.isReady);
  const hasEnoughPlayers = currentRoom?.players?.length === 4;
  const amIShuffler = shufflerUserId === user._id;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
                <h1 className="text-3xl font-bold">{currentRoom.name}</h1>
                <p className="text-gray-400">
                  {gameState === "waiting" && "Waiting for players"}
                  {gameState === "shuffling" &&
                    `Round ${currentRound} - Shuffling roles`}
                  {gameState === "playing" && `Round ${currentRound} - Playing`}
                  {gameState === "results" && `Round ${currentRound} - Results`}
                  {gameState === "finished" && "Game Finished"}
                </p>
              </div>
            </div>

            {/* Ready/Start buttons */}
            {gameState === "waiting" && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleToggleReady}
                  className={`btn-primary flex items-center space-x-2 ${
                    myPlayer?.isReady ? "bg-green-600 hover:bg-green-700" : ""
                  }`}
                >
                  {myPlayer?.isReady ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Ready</span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5" />
                      <span>Not Ready</span>
                    </>
                  )}
                </button>

                {isHost && allReady && hasEnoughPlayers && (
                  <button
                    onClick={handleStartGame}
                    className="btn-primary flex items-center space-x-2 bg-linear-to-r from-green-600 to-emerald-600 text-lg px-6 py-3"
                  >
                    <Play className="w-6 h-6" />
                    <span>Start Game</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Game Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* My Role Card */}
              {myRole && gameState === "playing" && (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="card bg-linear-to-br from-purple-900/30 to-pink-900/30 border-2 border-purple-500"
                >
                  <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold">Your Role</h2>
                    <div className={`text-6xl ${roleColors[myRole]}`}>
                      {roleIcons[myRole] &&
                        (() => {
                          const Icon = roleIcons[myRole];
                          return <Icon className="w-24 h-24 mx-auto" />;
                        })()}
                    </div>
                    <div className={`text-4xl font-bold ${roleColors[myRole]}`}>
                      {myRole}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Shuffle Button */}
              {gameState === "shuffling" && amIShuffler && (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="card text-center"
                >
                  <h2 className="text-2xl font-bold mb-4">
                    You are the Shuffler!
                  </h2>
                  <button
                    onClick={handleShuffle}
                    className="btn-primary flex items-center space-x-2 mx-auto text-lg px-8 py-4"
                  >
                    <Shuffle className="w-6 h-6" />
                    <span>Shuffle Roles</span>
                  </button>
                </motion.div>
              )}

              {/* Guess UI */}
              {isSipahi && gameState === "playing" && !roundResult && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card"
                >
                  <h2 className="text-2xl font-bold mb-4">Who is the Chor?</h2>
                  <p className="text-gray-400 mb-4">
                    Click on a player to make your guess:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {currentRoom.players
                      .filter((p) => p.userId !== user._id)
                      .map((player) => (
                        <button
                          key={player.userId}
                          onClick={() => handleGuess(player.userId)}
                          className="btn-secondary text-left p-4 hover:bg-purple-600/20"
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src={player.avatar || "/default-avatar.png"}
                              alt={player.username}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <div className="font-semibold">
                                {player.displayName || player.username}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </motion.div>
              )}

              {/* Round Results */}
              {roundResult && gameState === "results" && (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="card"
                >
                  <h2 className="text-2xl font-bold mb-4">Round Results</h2>
                  <div className="space-y-4">
                    <div
                      className={`p-4 rounded-lg ${
                        roundResult.isCorrect
                          ? "bg-green-600/20"
                          : "bg-red-600/20"
                      }`}
                    >
                      <p className="text-lg">
                        <span className="font-bold">
                          {roundResult.sipahiName}
                        </span>{" "}
                        guessed{" "}
                        <span className="font-bold">
                          {roundResult.guessedName}
                        </span>
                      </p>
                      <p className="text-2xl font-bold mt-2">
                        {roundResult.isCorrect ? "✓ Correct!" : "✗ Wrong!"}
                      </p>
                      <p className="mt-2">
                        The Chor was:{" "}
                        <span className="font-bold">
                          {roundResult.chorName}
                        </span>
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold mb-2">Roles:</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(roundResult.roles).map(
                          ([userId, role]) => {
                            const player = currentRoom.players.find(
                              (p) => p.userId === userId
                            );
                            return (
                              <div
                                key={userId}
                                className="flex items-center justify-between p-2 bg-gray-800/50 rounded"
                              >
                                <span>
                                  {player?.displayName || player?.username}
                                </span>
                                <span
                                  className={`font-bold ${roleColors[role]}`}
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
                      <h3 className="font-bold mb-2">Points This Round:</h3>
                      <div className="space-y-1">
                        {Object.entries(roundResult.pointsDistribution).map(
                          ([userId, points]) => {
                            const player = currentRoom.players.find(
                              (p) => p.userId === userId
                            );
                            return (
                              <div
                                key={userId}
                                className="flex items-center justify-between p-2"
                              >
                                <span>
                                  {player?.displayName || player?.username}
                                </span>
                                <span className="font-bold text-yellow-500">
                                  +{points}
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Game Finished */}
              {gameState === "finished" && (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="card bg-linear-to-br from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500"
                >
                  <div className="text-center space-y-4">
                    <Trophy className="w-24 h-24 mx-auto text-yellow-500" />
                    <h2 className="text-3xl font-bold">Game Over!</h2>
                    <div className="space-y-2">
                      {Object.entries(scores)
                        .sort(([, a], [, b]) => b - a)
                        .map(([userId, score], index) => {
                          const player = currentRoom.players.find(
                            (p) => p.userId === userId
                          );
                          return (
                            <div
                              key={userId}
                              className={`flex items-center justify-between p-3 rounded ${
                                index === 0
                                  ? "bg-yellow-600/30 border-2 border-yellow-500"
                                  : "bg-gray-800/50"
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                {index === 0 && (
                                  <Crown className="w-6 h-6 text-yellow-500" />
                                )}
                                <span className="font-semibold">
                                  {player?.displayName || player?.username}
                                </span>
                              </div>
                              <span className="text-2xl font-bold text-yellow-500">
                                {score}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right: Players & Scores */}
            <div className="space-y-6">
              {/* Players List */}
              <div className="card">
                <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                  <Users className="w-6 h-6" />
                  <span>Players ({currentRoom.players.length}/4)</span>
                </h2>
                <div className="space-y-2">
                  {currentRoom.players.map((player) => (
                    <div
                      key={player.userId}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        player.userId === currentRoom.host
                          ? "bg-linear-to-r from-yellow-600/20 to-yellow-500/10 border-2 border-yellow-500"
                          : "bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={player.avatar || "/default-avatar.png"}
                          alt={player.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="font-semibold flex items-center space-x-2">
                            <span>{player.displayName || player.username}</span>
                            {player.userId === currentRoom.host && (
                              <Crown className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                          {gameState === "waiting" && (
                            <div className="text-sm">
                              {player.isReady ? (
                                <span className="text-green-500">Ready</span>
                              ) : (
                                <span className="text-gray-500">Not Ready</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {Object.keys(scores).length > 0 && (
                        <div className="text-xl font-bold text-yellow-500">
                          {scores[player.userId] || 0}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Scores Board */}
              {Object.keys(scores).length > 0 && (
                <div className="card">
                  <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
                  <div className="space-y-2">
                    {Object.entries(scores)
                      .sort(([, a], [, b]) => b - a)
                      .map(([userId, score], index) => {
                        const player = currentRoom.players.find(
                          (p) => p.userId === userId
                        );
                        return (
                          <div
                            key={userId}
                            className="flex items-center justify-between p-2"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500">
                                #{index + 1}
                              </span>
                              <span>
                                {player?.displayName || player?.username}
                              </span>
                            </div>
                            <span className="font-bold text-yellow-500">
                              {score}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
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
