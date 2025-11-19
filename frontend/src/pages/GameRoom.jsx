import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Video,
  Send,
  Check,
  X,
  Crown,
  Shield as ShieldIcon,
  Swords,
} from "lucide-react";
import Navbar from "../components/Navbar";
import RoleBadge from "../components/RoleBadge";
import Loading from "../components/Loading";
import { roomAPI } from "../services/api";
import socketService from "../services/socket";
import { useGameStore } from "../context/gameStore";
import { useAuthStore } from "../context/authStore";
import { getRoleColor, getRoleDescription, formatTime } from "../utils/helpers";
import toast from "react-hot-toast";

export default function GameRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const messagesEndRef = useRef(null);

  const { user } = useAuthStore();
  const {
    currentRoom,
    myRole,
    messages,
    isGameActive,
    roundNumber,
    totalRounds,
    matchResult,
    setCurrentRoom,
    updateRoom,
    setMyRole,
    startGame,
    nextRound,
    endGame,
    addMessage,
    clearMessages,
    leaveRoom,
  } = useGameStore();

  useEffect(() => {
    fetchRoomData();
    socketService.joinRoom(roomId);

    socketService.on("room_updated", handleRoomUpdated);
    socketService.on("game_started", handleGameStarted);
    socketService.on("role_revealed", handleRoleRevealed);
    socketService.on("round_result", handleRoundResult);
    socketService.on("next_round", handleNextRound);
    socketService.on("game_ended", handleGameEnded);
    socketService.on("new_message", handleNewMessage);
    socketService.on("error", handleError);

    return () => {
      socketService.off("room_updated", handleRoomUpdated);
      socketService.off("game_started", handleGameStarted);
      socketService.off("role_revealed", handleRoleRevealed);
      socketService.off("round_result", handleRoundResult);
      socketService.off("next_round", handleNextRound);
      socketService.off("game_ended", handleGameEnded);
      socketService.off("new_message", handleNewMessage);
      socketService.off("error", handleError);
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleGameStarted = ({ roundNumber, totalRounds }) => {
    startGame(roundNumber, totalRounds);
    toast.success("Game started!");
    socketService.revealRole(roomId);
  };

  const handleRoleRevealed = ({ role }) => {
    setMyRole(role);
  };

  const handleRoundResult = (result) => {
    setRoundResult(result);
    setShowResults(true);

    setTimeout(() => {
      setShowResults(false);
      setRoundResult(null);
    }, 5000);
  };

  const handleNextRound = ({ roundNumber }) => {
    nextRound(roundNumber);
    socketService.revealRole(roomId);
  };

  const handleGameEnded = ({ results, winner }) => {
    endGame({ results, winner });
    toast.success("Game ended!");
  };

  const handleNewMessage = (msg) => {
    addMessage(msg);
  };

  const handleError = ({ message }) => {
    toast.error(message);
  };

  const handleToggleReady = () => {
    const player = currentRoom.players.find((p) => p.userId === user._id);
    socketService.playerReady(roomId, !player?.isReady);
  };

  const handleLeaveRoom = async () => {
    try {
      socketService.leaveRoom(roomId);
      await roomAPI.leaveRoom(roomId);
      leaveRoom();
      clearMessages();
      navigate("/lobby");
    } catch (error) {
      console.error("Leave room error:", error);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    socketService.sendMessage(roomId, message.trim());
    setMessage("");
  };

  const handleGuess = (targetUserId) => {
    if (myRole !== "Sipahi") {
      toast.error("Only Sipahi can guess!");
      return;
    }

    socketService.guessChor(roomId, targetUserId);
  };

  if (loading) return <Loading />;

  const isHost = currentRoom?.host === user._id;
  const myPlayer = currentRoom?.players?.find((p) => p.userId === user._id);
  const allReady = currentRoom?.players?.every((p) => p.isReady);

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
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
                  {isGameActive
                    ? `Round ${roundNumber}/${totalRounds}`
                    : "Waiting for players"}
                </p>
              </div>
            </div>

            {!isGameActive && !matchResult && (
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
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {isGameActive && myRole && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card"
                >
                  <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold">Your Role</h2>
                    <RoleBadge role={myRole} className="text-3xl px-8 py-3" />
                    <p className="text-gray-400">
                      {getRoleDescription(myRole)}
                    </p>
                  </div>
                </motion.div>
              )}

              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center space-x-2">
                    <Users className="w-6 h-6" />
                    <span>
                      Players ({currentRoom.players.length}/
                      {currentRoom.maxPlayers})
                    </span>
                  </h2>
                  {allReady &&
                    currentRoom.players.length >= 2 &&
                    !isGameActive && (
                      <span className="badge bg-green-600 text-white">
                        All Ready!
                      </span>
                    )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {currentRoom.players.map((player) => (
                    <motion.div
                      key={player.userId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-gray-800 rounded-lg p-4 border-2 border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {player.userId === currentRoom.host && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                          <span className="font-bold">
                            {player.displayName || player.username}
                          </span>
                        </div>
                        {!isGameActive && (
                          <span
                            className={`badge ${
                              player.isReady ? "bg-green-600" : "bg-gray-600"
                            }`}
                          >
                            {player.isReady ? "Ready" : "Not Ready"}
                          </span>
                        )}
                      </div>

                      {isGameActive &&
                        myRole === "Sipahi" &&
                        player.userId !== user._id && (
                          <button
                            onClick={() => handleGuess(player.userId)}
                            className="btn-primary w-full mt-2 text-sm"
                          >
                            Guess as Chor
                          </button>
                        )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {matchResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card"
                >
                  <h2 className="text-3xl font-bold text-center mb-6">
                    Match Results
                  </h2>

                  <div className="space-y-4">
                    {matchResult.results.map((result, index) => (
                      <div
                        key={result.userId}
                        className={`p-4 rounded-lg ${
                          index === 0
                            ? "bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border-2 border-yellow-500"
                            : "bg-gray-800 border border-gray-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl font-bold">
                              #{index + 1}
                            </span>
                            <div>
                              <div className="font-bold">
                                {result.displayName || result.username}
                              </div>
                              <div className="text-sm text-gray-400">
                                {result.totalScore} points
                              </div>
                            </div>
                          </div>
                          {index === 0 && (
                            <Crown className="w-8 h-8 text-yellow-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleLeaveRoom}
                    className="btn-primary w-full mt-6"
                  >
                    Back to Lobby
                  </button>
                </motion.div>
              )}
            </div>

            <div className="card h-[600px] flex flex-col">
              <div className="flex items-center space-x-2 mb-4 pb-4 border-b border-gray-800">
                <MessageSquare className="w-5 h-5" />
                <h2 className="text-xl font-bold">Chat</h2>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      msg.userId === user._id
                        ? "bg-primary-600/20 ml-8"
                        : "bg-gray-800 mr-8"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">
                        {msg.displayName || msg.username}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="input-field flex-1"
                />
                <button type="submit" className="btn-primary">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showResults && roundResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="bg-gray-900 rounded-xl border-2 border-primary-500 p-8 max-w-2xl w-full mx-4"
            >
              <h2 className="text-4xl font-bold text-center mb-6">
                {roundResult.correctGuess ? (
                  <span className="text-green-400">Correct Guess!</span>
                ) : (
                  <span className="text-red-400">Wrong Guess!</span>
                )}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(roundResult.roles).map(([userId, role]) => (
                    <div key={userId} className="bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">
                        {
                          currentRoom.players.find((p) => p.userId === userId)
                            ?.displayName
                        }
                      </div>
                      <RoleBadge role={role} />
                      <div className="text-lg font-bold mt-2">
                        +{roundResult.scores[userId]} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
