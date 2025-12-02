import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import useAuthStore from "@/context/authStore";
import { roomAPI } from "@/services/api";
import { getSocket } from "@/services/socket";

export default function LobbyScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [rooms, setRooms] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [roomName, setRoomName] = useState("");
  const [password, setPassword] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      loadRooms();
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const socket = getSocket();
    if (socket) {
      socket.on("room_created", loadRooms);
      socket.on("room_updated", loadRooms);
      socket.on("room_deleted", loadRooms);
    }

    return () => {
      if (socket) {
        socket.off("room_created");
        socket.off("room_updated");
        socket.off("room_deleted");
      }
    };
  }, [user]);

  const loadRooms = async () => {
    try {
      const response = await roomAPI.getRooms();
      setRooms(response.data.rooms || []);
    } catch (error) {
      console.error("Load rooms error:", error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRooms();
    setIsRefreshing(false);
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please enter a room name",
      });
      return;
    }

    setIsCreating(true);
    try {
      const roomData = {
        name: roomName,
        passkey: password || undefined,
        mode: videoEnabled ? "video" : "chat",
        isPublic: !password,
      };

      const response = await roomAPI.createRoom(roomData);
      const room = response.data.room;

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Room created successfully!",
      });

      setShowCreateModal(false);
      setRoomName("");
      setPassword("");
      setVideoEnabled(false);

      router.push(`/room/${room.roomId}`);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.response?.data?.message || "Failed to create room",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (roomId) => {
    router.push(`/room/${roomId}`);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Chor Sipahi</Text>
          <Text style={styles.headerSubtitle}>Welcome, {user.username}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ Create Room</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.roomsList}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No rooms available</Text>
            <Text style={styles.emptySubtext}>
              Create a room to start playing!
            </Text>
          </View>
        ) : (
          rooms.map((room) => (
            <TouchableOpacity
              key={room.roomId}
              style={styles.roomCard}
              onPress={() => handleJoinRoom(room.roomId)}
            >
              <View style={styles.roomHeader}>
                <Text style={styles.roomName}>{room.name}</Text>
                {!room.isPublic && <Text style={styles.lockIcon}>🔒</Text>}
              </View>
              <View style={styles.roomInfo}>
                <Text style={styles.roomPlayers}>
                  {room.players.length}/4 players
                </Text>
                {room.videoEnabled && <Text style={styles.videoIcon}>📹</Text>}
              </View>
              <Text style={styles.roomHost}>
                Host: {room.host?.username || "Unknown"}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Room</Text>

            <TextInput
              style={styles.input}
              placeholder="Room Name"
              placeholderTextColor="#999"
              value={roomName}
              onChangeText={setRoomName}
            />

            <TextInput
              style={styles.input}
              placeholder="Password (optional)"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setVideoEnabled(!videoEnabled)}
            >
              <View
                style={[
                  styles.checkbox,
                  videoEnabled && styles.checkboxChecked,
                ]}
              >
                {videoEnabled && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Enable Video</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCreateRoom}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 15,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#16213e",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#999",
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: "#e94560",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
  },
  actions: {
    padding: 20,
  },
  createButton: {
    backgroundColor: "#e94560",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  roomsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  emptySubtext: {
    color: "#999",
    fontSize: 14,
    marginTop: 10,
  },
  roomCard: {
    backgroundColor: "#16213e",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#0f3460",
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  roomName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  lockIcon: {
    fontSize: 16,
  },
  roomInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  roomPlayers: {
    color: "#999",
    fontSize: 14,
  },
  videoIcon: {
    fontSize: 16,
  },
  roomHost: {
    color: "#999",
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#16213e",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1a1a2e",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#0f3460",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#999",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#e94560",
    borderColor: "#e94560",
  },
  checkmark: {
    color: "#fff",
    fontWeight: "bold",
  },
  checkboxLabel: {
    color: "#fff",
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#0f3460",
  },
  modalButtonPrimary: {
    backgroundColor: "#e94560",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalButtonTextPrimary: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
