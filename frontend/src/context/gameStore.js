import { create } from "zustand";

export const useGameStore = create((set, get) => ({
  currentRoom: null,
  rooms: [],
  myRole: null,
  gameState: null,
  messages: [],
  players: [],
  roundNumber: 0,
  totalRounds: 10,
  isGameActive: false,
  matchResult: null,

  setCurrentRoom: (room) => set({ currentRoom: room }),

  updateRoom: (roomData) =>
    set({ currentRoom: roomData, players: roomData?.players || [] }),

  setMyRole: (role) => set({ myRole: role }),

  setGameState: (state) => set({ gameState: state }),

  startGame: (roundNumber, totalRounds) => {
    set({
      isGameActive: true,
      roundNumber,
      totalRounds,
      myRole: null,
      matchResult: null,
    });
  },

  nextRound: (roundNumber) => {
    set({ roundNumber, myRole: null });
  },

  endGame: (result) => {
    set({
      isGameActive: false,
      matchResult: result,
    });
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  clearMessages: () => set({ messages: [] }),

  setRooms: (rooms) => set({ rooms }),

  leaveRoom: () => {
    set({
      currentRoom: null,
      myRole: null,
      gameState: null,
      messages: [],
      players: [],
      isGameActive: false,
      roundNumber: 0,
    });
  },

  reset: () =>
    set({
      currentRoom: null,
      rooms: [],
      myRole: null,
      gameState: null,
      messages: [],
      players: [],
      roundNumber: 0,
      totalRounds: 10,
      isGameActive: false,
      matchResult: null,
    }),
}));
