import Room from "../models/Room.model.js";
import logger from "../config/logger.js";
import { v4 as uuidv4 } from "uuid";

class MatchmakingService {
  constructor() {
    this.queues = {
      random: [],
      video: [],
    };
    this.searchingPlayers = new Map();
  }

  addToQueue(userId, username, displayName, avatar, mode = "random") {
    if (this.searchingPlayers.has(userId)) {
      logger.warn(`User ${username} already in matchmaking queue`);
      return { success: false, message: "Already in queue" };
    }

    const playerData = {
      userId,
      username,
      displayName,
      avatar,
      joinedAt: Date.now(),
    };

    this.queues[mode].push(playerData);
    this.searchingPlayers.set(userId, { mode, joinedAt: Date.now() });

    logger.info(`User ${username} joined ${mode} matchmaking queue`);

    this.tryMatchmaking(mode);

    return {
      success: true,
      message: "Added to queue",
      position: this.queues[mode].length,
    };
  }

  removeFromQueue(userId) {
    const playerInfo = this.searchingPlayers.get(userId);

    if (!playerInfo) {
      return { success: false, message: "Not in queue" };
    }

    const { mode } = playerInfo;
    this.queues[mode] = this.queues[mode].filter((p) => p.userId !== userId);
    this.searchingPlayers.delete(userId);

    logger.info(`User removed from ${mode} matchmaking queue`);

    return { success: true, message: "Removed from queue" };
  }

  async tryMatchmaking(mode) {
    const queue = this.queues[mode];

    if (queue.length < 4) {
      return null;
    }

    const matchedPlayers = queue.splice(0, 4);

    matchedPlayers.forEach((player) => {
      this.searchingPlayers.delete(player.userId);
    });

    const room = await this.createMatchmadeRoom(matchedPlayers, mode);

    logger.info(
      `Matchmaking successful for ${mode} mode: ${matchedPlayers
        .map((p) => p.username)
        .join(", ")}`
    );

    return room;
  }

  async createMatchmadeRoom(players, mode) {
    try {
      const roomId = uuidv4();

      const room = new Room({
        roomId,
        name: `${mode === "video" ? "Video" : "Chat"} Match ${roomId.slice(
          0,
          8
        )}`,
        mode,
        isPublic: false,
        host: players[0].userId,
        players: players.map((p) => ({
          userId: p.userId,
          username: p.username,
          displayName: p.displayName,
          avatar: p.avatar,
          isReady: true,
        })),
        status: "waiting",
      });

      await room.save();

      logger.info(`Matchmade room created: ${roomId}`);

      return room;
    } catch (error) {
      logger.error("Error creating matchmade room:", error);
      throw error;
    }
  }

  getQueueStatus(mode = "random") {
    return {
      mode,
      playersInQueue: this.queues[mode].length,
      estimatedWaitTime: this.estimateWaitTime(mode),
    };
  }

  estimateWaitTime(mode) {
    const queueLength = this.queues[mode].length;

    if (queueLength === 0) return "0-30s";
    if (queueLength === 1) return "30s-2m";
    if (queueLength === 2) return "10-60s";
    if (queueLength === 3) return "0-30s";

    return "0-10s";
  }

  getPlayerPosition(userId) {
    const playerInfo = this.searchingPlayers.get(userId);

    if (!playerInfo) {
      return null;
    }

    const { mode } = playerInfo;
    const position =
      this.queues[mode].findIndex((p) => p.userId === userId) + 1;

    return {
      mode,
      position,
      total: this.queues[mode].length,
      waitingTime: Date.now() - playerInfo.joinedAt,
    };
  }

  clearStaleEntries(maxWaitTimeMs = 600000) {
    const now = Date.now();
    let removedCount = 0;

    ["random", "video"].forEach((mode) => {
      const originalLength = this.queues[mode].length;

      this.queues[mode] = this.queues[mode].filter((player) => {
        const waitTime = now - player.joinedAt;

        if (waitTime > maxWaitTimeMs) {
          this.searchingPlayers.delete(player.userId);
          removedCount++;
          logger.info(
            `Removed stale player ${player.username} from ${mode} queue`
          );
          return false;
        }

        return true;
      });
    });

    if (removedCount > 0) {
      logger.info(`Cleared ${removedCount} stale matchmaking entries`);
    }

    return removedCount;
  }
}

const matchmakingService = new MatchmakingService();

setInterval(() => {
  matchmakingService.clearStaleEntries();
}, 60000);

export default matchmakingService;
