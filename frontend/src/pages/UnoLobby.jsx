import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import socketService from "../services/socket";
import { useAuthStore } from "../context/authStore";
import { roomAPI } from "../services/api";
import "./UnoLobby.css";

const UnoLobby = () => {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPublic, setIsPublic] = useState(true);
  const [passkey, setPasskey] = useState("");
  const [loading, setLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    try {
      setRoomsLoading(true);
      const response = await roomAPI.getRooms({ status: "waiting", gameType: "uno" });
      setRooms(response.data.rooms || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch rooms");
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (token && !socketService.isConnected()) {
      socketService.connect(token);
    }

    fetchRooms();
    const intervalId = setInterval(fetchRooms, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [user, token, navigate, fetchRooms]);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast.error("Please enter a room name");
      return;
    }

    if (!isPublic && !passkey.trim()) {
      toast.error("Please enter a passkey for private rooms");
      return;
    }

    setLoading(true);

    const roomData = {
      name: roomName,
      gameType: "uno",
      mode: "chat",
      isPublic,
      passkey: !isPublic ? passkey : undefined,
      maxPlayers,
      unoSettings: {
        maxPlayers,
      },
    };

    try {
      const response = await roomAPI.createRoom(roomData);
      toast.success("Room created successfully");
      setShowCreateModal(false);
      setRoomName("");
      setPasskey("");
      navigate(`/uno/room/${response.data.room.roomId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (room) => {
    try {
      let joinPasskey;
      if (room.hasPasskey) {
        joinPasskey = window.prompt("Enter room passkey to join");
        if (!joinPasskey) return;
      }

      await roomAPI.joinRoom(room.roomId, joinPasskey);
      toast.success("Joined room!");
      navigate(`/uno/room/${room.roomId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to join room");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="uno-lobby">
      <motion.div
        className="lobby-header"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <button className="back-button" onClick={() => navigate("/")}>
          ← Back
        </button>
        <h1>🎴 UNO Lobby</h1>
        <button
          className="create-room-btn"
          onClick={() => setShowCreateModal(true)}
        >
          + Create Room
        </button>
      </motion.div>

      <motion.div
        className="rooms-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {roomsLoading ? (
          <motion.div className="no-rooms" variants={itemVariants}>
            <div className="no-rooms-icon">⏳</div>
            <p>Loading UNO rooms...</p>
          </motion.div>
        ) : rooms.length === 0 ? (
          <motion.div className="no-rooms" variants={itemVariants}>
            <div className="no-rooms-icon">🎴</div>
            <p>No UNO rooms available</p>
            <p className="sub-text">Create one to start playing!</p>
          </motion.div>
        ) : (
          rooms.map((room) => (
            <motion.div
              key={room.roomId}
              className="room-card"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleJoinRoom(room)}
            >
              <div className="room-header">
                <h3>{room.name}</h3>
                {!room.isPublic && <span className="private-badge">🔒</span>}
              </div>
              <div className="room-info">
                <div className="info-item">
                  <span className="info-label">Players:</span>
                  <span className="info-value">
                    {(room.playerCount ?? room.players?.length ?? 0)}/
                    {room.maxPlayers}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Host:</span>
                  <span className="info-value">
                    {room.host?.username || room.hostName || "Unknown"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Status:</span>
                  <span className={`status-badge ${room.status}`}>
                    {room.status}
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>Create UNO Room</h2>

              <div className="form-group">
                <label>Room Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name"
                  maxLength={30}
                />
              </div>

              <div className="form-group">
                <label>Max Players (2-10)</label>
                <div className="player-selector">
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      className={`player-btn ${
                        maxPlayers === num ? "active" : ""
                      }`}
                      onClick={() => setMaxPlayers(num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  <span>Public Room</span>
                </label>
              </div>

              {!isPublic && (
                <div className="form-group">
                  <label>Passkey</label>
                  <input
                    type="password"
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    placeholder="Enter passkey"
                  />
                </div>
              )}

              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="create-btn"
                  onClick={handleCreateRoom}
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Room"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnoLobby;
