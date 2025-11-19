import { create } from "zustand";
import { authAPI } from "../services/api";
import socketService from "../services/socket";

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("token"),
  isAuthenticated: !!localStorage.getItem("token"),
  loading: false,
  error: null,

  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      socketService.connect(token);

      set({ user, token, isAuthenticated: true, loading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      set({ error: message, loading: false });
      return { success: false, error: message };
    }
  },

  signup: async (userData) => {
    set({ loading: true, error: null });
    try {
      console.log("Attempting signup with:", { ...userData, password: "***" });
      const response = await authAPI.signup(userData);
      console.log("Signup response:", response.data);
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      socketService.connect(token);

      set({ user, token, isAuthenticated: true, loading: false });
      return { success: true };
    } catch (error) {
      console.error("Signup error:", error);
      const message =
        error.response?.data?.message || error.message || "Signup failed";
      set({ error: message, loading: false });
      return { success: false, error: message };
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    socketService.disconnect();

    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (userData) => {
    const updatedUser = { ...get().user, ...userData };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  clearError: () => set({ error: null }),
}));
