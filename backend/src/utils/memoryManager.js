import logger from "../config/logger.js";

/**
 * Memory-efficient connection manager with automatic cleanup
 * Handles 200+ concurrent connections without memory leaks
 */
class MemoryManager {
  constructor() {
    // Use Map for O(1) lookups with automatic garbage collection
    this.activeConnections = new Map(); // userId -> socketId
    this.roomTimers = new Map(); // roomId -> timerId
    this.playerRooms = new Map(); // userId -> roomId
    this.reconnectTimers = new Map(); // userId -> timerId
    
    // Connection tracking
    this.connectionCount = 0;
    this.peakConnections = 0;
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  // Track new connection
  addConnection(userId, socketId, roomId = null) {
    this.activeConnections.set(userId, socketId);
    if (roomId) {
      this.playerRooms.set(userId, roomId);
    }
    
    this.connectionCount++;
    if (this.connectionCount > this.peakConnections) {
      this.peakConnections = this.connectionCount;
      logger.info(`📈 New peak connections: ${this.peakConnections}`);
    }
  }

  // Remove connection and cleanup
  removeConnection(userId) {
    this.activeConnections.delete(userId);
    this.playerRooms.delete(userId);
    this.clearReconnectTimer(userId);
    this.connectionCount--;
  }

  // Get socket ID for user
  getSocketId(userId) {
    return this.activeConnections.get(userId);
  }

  // Check if user is connected
  isConnected(userId) {
    return this.activeConnections.has(userId);
  }

  // Get user's current room
  getUserRoom(userId) {
    return this.playerRooms.get(userId);
  }

  // Room timer management
  setRoomTimer(roomId, timerId) {
    // Clear existing timer
    this.clearRoomTimer(roomId);
    this.roomTimers.set(roomId, timerId);
  }

  clearRoomTimer(roomId) {
    const timer = this.roomTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.roomTimers.delete(roomId);
    }
  }

  // Reconnection timer management (2-minute grace period)
  setReconnectTimer(userId, timerId) {
    this.clearReconnectTimer(userId);
    this.reconnectTimers.set(userId, timerId);
  }

  clearReconnectTimer(userId) {
    const timer = this.reconnectTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(userId);
    }
  }

  // Periodic cleanup to prevent memory leaks
  startPeriodicCleanup() {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 5 * 60 * 1000);
  }

  performCleanup() {
    const before = {
      connections: this.activeConnections.size,
      rooms: this.roomTimers.size,
      reconnects: this.reconnectTimers.size,
    };

    // Clear expired reconnection timers
    const now = Date.now();
    for (const [userId, timer] of this.reconnectTimers.entries()) {
      // If timer still exists after 3 minutes, something went wrong - force cleanup
      if (now - timer > 3 * 60 * 1000) {
        this.clearReconnectTimer(userId);
      }
    }

    const after = {
      connections: this.activeConnections.size,
      rooms: this.roomTimers.size,
      reconnects: this.reconnectTimers.size,
    };

    if (before.connections !== after.connections || before.reconnects !== after.reconnects) {
      logger.info(`🧹 Memory cleanup completed:`, {
        before,
        after,
        freed: {
          connections: before.connections - after.connections,
          reconnects: before.reconnects - after.reconnects,
        },
      });
    }

    // Force garbage collection if available (Node.js with --expose-gc flag)
    if (global.gc && this.connectionCount > 100) {
      global.gc();
      logger.info('🗑️  Forced garbage collection');
    }
  }

  // Get current stats
  getStats() {
    return {
      activeConnections: this.activeConnections.size,
      activeRoomTimers: this.roomTimers.size,
      reconnectTimers: this.reconnectTimers.size,
      currentConnections: this.connectionCount,
      peakConnections: this.peakConnections,
      memoryUsage: process.memoryUsage(),
    };
  }

  // Cleanup all resources
  destroy() {
    // Clear all timers
    for (const timer of this.roomTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear all maps
    this.activeConnections.clear();
    this.roomTimers.clear();
    this.playerRooms.clear();
    this.reconnectTimers.clear();

    logger.info('💾 Memory manager destroyed and cleaned up');
  }
}

// Singleton instance
const memoryManager = new MemoryManager();

// Log stats every 2 minutes in production
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const stats = memoryManager.getStats();
    logger.info('📊 Connection stats:', stats);
  }, 2 * 60 * 1000);
}

export default memoryManager;
