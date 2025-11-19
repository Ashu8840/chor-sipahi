export const gameConfig = {
  MATCH_ROUNDS: parseInt(process.env.MATCH_ROUNDS) || 10,
  MAX_PLAYERS: 4,

  ROLES: {
    RAJA: "Raja",
    MANTRI: "Mantri",
    SIPAHI: "Sipahi",
    CHOR: "Chor",
  },

  SCORING: {
    RAJA: parseInt(process.env.RAJA_POINTS) || 1000,
    MANTRI: parseInt(process.env.MANTRI_POINTS) || 800,
    SIPAHI_SUCCESS: parseInt(process.env.SIPAHI_SUCCESS_POINTS) || 500,
    SIPAHI_FAIL: parseInt(process.env.SIPAHI_FAIL_POINTS) || 0,
    CHOR_CAUGHT: parseInt(process.env.CHOR_CAUGHT_POINTS) || 0,
    CHOR_ESCAPED: parseInt(process.env.CHOR_ESCAPED_POINTS) || 1000,
  },

  ROOM_MODES: {
    CHAT: "chat",
    VIDEO: "video",
  },

  MATCHMAKING_TIMEOUT: 60000, // 1 minute
  ROUND_DURATION: 120000, // 2 minutes
};

export default gameConfig;
