import axios from "axios";

// Use relative path to leverage Vite's proxy in development
const API_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: (data) => api.post("/auth/signup", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/profile", data),
  logout: () => api.post("/auth/logout"),
};

export const roomAPI = {
  createRoom: (data) => api.post("/rooms", data),
  getRooms: (params) => api.get("/rooms", { params }),
  getRoom: (roomId) => api.get(`/rooms/${roomId}`),
  joinRoom: (roomId, passkey) => api.post(`/rooms/${roomId}/join`, { passkey }),
  leaveRoom: (roomId) => api.post(`/rooms/${roomId}/leave`),
  deleteRoom: (roomId) => api.delete(`/rooms/${roomId}`),
};

export const matchAPI = {
  getMyMatches: (params) => api.get("/matches/my-matches", { params }),
  getMatch: (matchId) => api.get(`/matches/${matchId}`),
  getDefeated: () => api.get("/matches/defeated"),
  getDefeatedBy: () => api.get("/matches/defeated-by"),
  getPlayerStats: (userId) => api.get(`/matches/player/${userId}`),
};

export const leaderboardAPI = {
  getLeaderboard: (params) => api.get("/leaderboard", { params }),
  getRoleLeaderboard: (role, params) =>
    api.get(`/leaderboard/role/${role}`, { params }),
  getTopPlayers: (params) => api.get("/leaderboard/top", { params }),
};

export const reportAPI = {
  createReport: (data) => api.post("/reports", data),
  getMyReports: (params) => api.get("/reports/my-reports", { params }),
};

export const adminAPI = {
  getStats: () => api.get("/admin/stats"),
  getAllUsers: (params) => api.get("/admin/users", { params }),
  banUser: (userId) => api.post(`/admin/users/${userId}/ban`),
  unbanUser: (userId) => api.post(`/admin/users/${userId}/unban`),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getAllRooms: (params) => api.get("/admin/rooms", { params }),
  deleteRoom: (roomId) => api.delete(`/admin/rooms/${roomId}`),
  getAllReports: (params) => api.get("/admin/reports", { params }),
  updateReport: (reportId, data) => api.put(`/admin/reports/${reportId}`, data),
};

export default api;
