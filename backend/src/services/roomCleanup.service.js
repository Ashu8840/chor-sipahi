import Room from "../models/Room.model.js";
import logger from "../config/logger.js";
import cron from "node-cron";

const ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

class RoomCleanupService {
  constructor() {
    this.cleanupJob = null;
  }

  /**
   * Delete all existing rooms on server startup
   */
  async deleteAllRooms() {
    try {
      const result = await Room.deleteMany({});
      logger.info(`🧹 Deleted ${result.deletedCount} existing rooms on startup`);
      return result.deletedCount;
    } catch (error) {
      logger.error("Error deleting all rooms:", error);
      throw error;
    }
  }

  /**
   * Delete rooms that are older than 30 minutes
   */
  async cleanupStaleRooms() {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - ROOM_TIMEOUT_MS);

      // Delete rooms in "waiting" status older than 30 minutes
      const waitingRoomsResult = await Room.deleteMany({
        status: "waiting",
        createdAt: { $lt: thirtyMinutesAgo },
      });

      // Delete rooms in "playing" status that started more than 30 minutes ago
      const playingRoomsResult = await Room.deleteMany({
        status: "playing",
        gameStartedAt: { $lt: thirtyMinutesAgo },
      });

      // Delete finished rooms older than 30 minutes
      const finishedRoomsResult = await Room.deleteMany({
        status: "finished",
        updatedAt: { $lt: thirtyMinutesAgo },
      });

      const totalDeleted =
        waitingRoomsResult.deletedCount +
        playingRoomsResult.deletedCount +
        finishedRoomsResult.deletedCount;

      if (totalDeleted > 0) {
        logger.info(
          `🧹 Cleanup: Deleted ${totalDeleted} stale rooms (${waitingRoomsResult.deletedCount} waiting, ${playingRoomsResult.deletedCount} playing, ${finishedRoomsResult.deletedCount} finished)`
        );
      }

      return totalDeleted;
    } catch (error) {
      logger.error("Error cleaning up stale rooms:", error);
      throw error;
    }
  }

  /**
   * Start automatic cleanup job (runs every 5 minutes)
   */
  startAutomaticCleanup() {
    if (this.cleanupJob) {
      logger.warn("Cleanup job already running");
      return;
    }

    // Run cleanup every 5 minutes
    this.cleanupJob = cron.schedule("*/5 * * * *", async () => {
      logger.info("⏰ Running automatic room cleanup...");
      await this.cleanupStaleRooms();
    });

    logger.info("✅ Automatic room cleanup job started (runs every 5 minutes)");
  }

  /**
   * Stop automatic cleanup job
   */
  stopAutomaticCleanup() {
    if (this.cleanupJob) {
      this.cleanupJob.stop();
      this.cleanupJob = null;
      logger.info("🛑 Automatic room cleanup job stopped");
    }
  }

  /**
   * Cleanup a specific room by ID
   */
  async cleanupRoom(roomId) {
    try {
      const result = await Room.deleteOne({ roomId });
      if (result.deletedCount > 0) {
        logger.info(`🧹 Manually deleted room: ${roomId}`);
      }
      return result.deletedCount > 0;
    } catch (error) {
      logger.error(`Error deleting room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Get statistics about rooms
   */
  async getRoomStats() {
    try {
      const totalRooms = await Room.countDocuments();
      const waitingRooms = await Room.countDocuments({ status: "waiting" });
      const playingRooms = await Room.countDocuments({ status: "playing" });
      const finishedRooms = await Room.countDocuments({ status: "finished" });

      const thirtyMinutesAgo = new Date(Date.now() - ROOM_TIMEOUT_MS);
      const staleRooms = await Room.countDocuments({
        $or: [
          { status: "waiting", createdAt: { $lt: thirtyMinutesAgo } },
          { status: "playing", gameStartedAt: { $lt: thirtyMinutesAgo } },
          { status: "finished", updatedAt: { $lt: thirtyMinutesAgo } },
        ],
      });

      return {
        total: totalRooms,
        waiting: waitingRooms,
        playing: playingRooms,
        finished: finishedRooms,
        stale: staleRooms,
      };
    } catch (error) {
      logger.error("Error getting room stats:", error);
      throw error;
    }
  }
}

// Export singleton instance
const roomCleanupService = new RoomCleanupService();
export default roomCleanupService;
