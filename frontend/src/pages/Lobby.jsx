import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Users,
  Lock,
  Video,
  MessageSquare,
  Loader2,
  Search,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Modal from "../components/Modal";
import { roomAPI } from "../services/api";
import socketService from "../services/socket";
import { useGameStore } from "../context/gameStore";
import { useAuthStore } from "../context/authStore";
import toast from "react-hot-toast";

export default function Lobby() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [initialMode, setInitialMode] = useState("chat");
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchMode, setSearchMode] = useState("all");
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchmakingMode, setMatchmakingMode] = useState(null);

  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { setCurrentRoom } = useGameStore();

  useEffect(() => {
    fetchRooms();

    if (token && !socketService.isConnected()) {
      socketService.connect(token);
    }

    socketService.on("match_found", handleMatchFound);
    socketService.on("matchmaking_joined", handleMatchmakingJoined);

    return () => {
      socketService.off("match_found", handleMatchFound);
      socketService.off("matchmaking_joined", handleMatchmakingJoined);
    };
  }, [token]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await roomAPI.getRooms({ status: "waiting" });
      setRooms(response.data.rooms);
    } catch (error) {
      toast.error("Failed to fetch rooms");
    } finally {
      setLoading(false);
    }
  };

  const handleMatchFound = ({ roomId, room }) => {
    setIsMatchmaking(false);
    setMatchmakingMode(null);
    toast.success("Match found!");
    setCurrentRoom(room);
    navigate(`/room/${roomId}`);
  };

  const handleMatchmakingJoined = ({ mode, position }) => {
    toast.success(`Joined ${mode} matchmaking (Position: ${position})`);
  };

  const handleQuickMatch = (mode) => {
    // Set the initial mode based on which button was clicked
    setInitialMode(mode === "random" ? "chat" : "video");
    setCreateModalOpen(true);
  };

  const handleCancelMatchmaking = () => {
    socketService.leaveMatchmaking();
    setIsMatchmaking(false);
    setMatchmakingMode(null);
    toast.success("Cancelled matchmaking");
  };

  const handleJoinRoom = (room) => {
    if (room.hasPasskey) {
      setSelectedRoom(room);
      setJoinModalOpen(true);
    } else {
      joinRoom(room.roomId);
    }
  };

  const joinRoom = async (roomId, passkey = null) => {
    try {
      const response = await roomAPI.joinRoom(roomId, passkey);
      setCurrentRoom(response.data.room);
      navigate(`/room/${roomId}`);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to join room";

      // If passkey is required, open the password modal
      if (
        errorMessage.includes("Passkey required") ||
        errorMessage.includes("Invalid passkey")
      ) {
        const room = rooms.find((r) => r.roomId === roomId);
        if (room) {
          setSelectedRoom(room);
          setJoinModalOpen(true);
          toast.error(errorMessage);
        } else {
          toast.error(errorMessage);
        }
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const filteredRooms = rooms.filter((room) => {
    if (searchMode === "all") return true;
    return room.mode === searchMode;
  });

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold gradient-text">Game Lobby</h1>
              <p className="text-gray-400 mt-2">
                Join a room or create your own
              </p>
            </div>

            <button
              onClick={() => setCreateModalOpen(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Room</span>
            </button>
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold mb-6">Quick Match</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => handleQuickMatch("random")}
                disabled={isMatchmaking}
                className="flex items-center space-x-4 p-6 bg-gray-800 hover:bg-gray-700 rounded-lg border-2 border-gray-700 hover:border-primary-500 transition-all disabled:opacity-50"
              >
                <MessageSquare className="w-12 h-12 text-primary-500" />
                <div className="text-left">
                  <h3 className="text-xl font-bold">Random Chat Match</h3>
                  <p className="text-sm text-gray-400">
                    Quick match with text chat only
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleQuickMatch("video")}
                disabled={isMatchmaking}
                className="flex items-center space-x-4 p-6 bg-gray-800 hover:bg-gray-700 rounded-lg border-2 border-gray-700 hover:border-primary-500 transition-all disabled:opacity-50"
              >
                <Video className="w-12 h-12 text-primary-500" />
                <div className="text-left">
                  <h3 className="text-xl font-bold">Video Room Match</h3>
                  <p className="text-sm text-gray-400">
                    Match with video call enabled
                  </p>
                </div>
              </button>
            </div>

            {isMatchmaking && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-6 p-4 bg-primary-600/20 border border-primary-500/50 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                    <span>Searching for {matchmakingMode} match...</span>
                  </div>
                  <button
                    onClick={handleCancelMatchmaking}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold">Available Rooms</h2>

              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-gray-500" />
                <select
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Modes</option>
                  <option value="random">Chat Only</option>
                  <option value="video">Video Rooms</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No rooms available</p>
                <p className="text-gray-500 text-sm">
                  Create one or try quick match!
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map((room) => (
                  <motion.div
                    key={room.roomId}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-primary-500 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold truncate">{room.name}</h3>
                      {room.hasPasskey && (
                        <Lock className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-gray-400 mb-4">
                      <div className="flex items-center justify-between">
                        <span>Players:</span>
                        <span className="text-white">
                          {room.playerCount}/{room.maxPlayers}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Mode:</span>
                        <span className="text-white capitalize flex items-center space-x-1">
                          {room.mode === "video" ? (
                            <Video className="w-4 h-4 text-primary-500" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-gray-500" />
                          )}
                          <span>{room.mode}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Host:</span>
                        <span className="text-white">{room.host.username}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleJoinRoom(room)}
                      disabled={room.playerCount >= room.maxPlayers}
                      className="btn-primary w-full text-sm"
                    >
                      {room.playerCount >= room.maxPlayers
                        ? "Full"
                        : "Join Room"}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <CreateRoomModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        initialMode={initialMode}
        onSuccess={(roomId) => {
          setCreateModalOpen(false);
          navigate(`/room/${roomId}`);
        }}
      />

      <JoinRoomModal
        isOpen={joinModalOpen}
        onClose={() => {
          setJoinModalOpen(false);
          setSelectedRoom(null);
        }}
        room={selectedRoom}
        onJoin={joinRoom}
      />
    </div>
  );
}

function CreateRoomModal({ isOpen, onClose, onSuccess, initialMode = "chat" }) {
  const [formData, setFormData] = useState({
    name: "",
    mode: initialMode,
    isPublic: true,
    passkey: "",
  });
  const [loading, setLoading] = useState(false);
  const { setCurrentRoom } = useGameStore();

  // Update mode when initialMode prop changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, mode: initialMode }));
  }, [initialMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please enter a room name");
      return;
    }

    try {
      setLoading(true);
      const response = await roomAPI.createRoom(formData);
      setCurrentRoom(response.data.room);
      toast.success("Room created!");
      onSuccess(response.data.room.roomId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Room">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Room Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input-field"
            placeholder="My Awesome Room"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Mode</label>
          <select
            value={formData.mode}
            onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
            className="input-field"
          >
            <option value="chat">Chat Only</option>
            <option value="video">Video Room</option>
          </select>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) =>
                setFormData({ ...formData, isPublic: e.target.checked })
              }
              className="w-4 h-4"
            />
            <span className="text-sm">Public Room</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Passkey (Optional)
          </label>
          <input
            type="password"
            value={formData.passkey}
            onChange={(e) =>
              setFormData({ ...formData, passkey: e.target.value })
            }
            className="input-field"
            placeholder="Leave empty for no passkey"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating..." : "Create Room"}
        </button>
      </form>
    </Modal>
  );
}

function JoinRoomModal({ isOpen, onClose, room, onJoin }) {
  const [passkey, setPasskey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!passkey) {
      toast.error("Please enter the passkey");
      return;
    }

    setLoading(true);
    await onJoin(room?.roomId, passkey);
    setLoading(false);
    setPasskey("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enter Passkey">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-gray-400">
          This room is protected. Enter the passkey to join.
        </p>

        <div>
          <label className="block text-sm font-medium mb-2">Passkey</label>
          <input
            type="password"
            value={passkey}
            onChange={(e) => setPasskey(e.target.value)}
            className="input-field"
            placeholder="Enter passkey"
            autoFocus
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Joining..." : "Join Room"}
        </button>
      </form>
    </Modal>
  );
}
