import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket.id);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.socket) return;

    this.socket.on(event, callback);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.socket) return;

    this.socket.off(event, callback);

    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (!this.socket) {
      console.error("Socket not connected");
      return;
    }
    this.socket.emit(event, data);
  }

  joinRoom(roomId, passkey) {
    this.emit("join_room", { roomId, passkey });
  }

  leaveRoom(roomId) {
    this.emit("leave_room", { roomId });
  }

  playerReady(roomId, isReady) {
    this.emit("player_ready", { roomId, isReady });
  }

  startRound(roomId) {
    this.emit("start_round", { roomId });
  }

  revealRole(roomId) {
    this.emit("reveal_role", { roomId });
  }

  guessChor(roomId, guessedUserId) {
    this.emit("guess_chor", { roomId, guessedUserId });
  }

  sendMessage(roomId, message) {
    this.emit("send_message", { roomId, message });
  }

  joinMatchmaking(mode) {
    this.emit("join_matchmaking", { mode });
  }

  leaveMatchmaking() {
    this.emit("leave_matchmaking");
  }

  sendWebRTCSignal(roomId, targetUserId, signal) {
    this.emit("webrtc_signal", { roomId, targetUserId, signal });
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;
