import logger from "../config/logger.js";

/**
 * Socket event rate limiter to prevent abuse and DoS attacks
 * Implements token bucket algorithm per user
 */
class SocketRateLimiter {
  constructor() {
    // userId -> { tokens: number, lastRefill: timestamp }
    this.buckets = new Map();
    
    // Rate limit configuration
    this.maxTokens = 50; // Max burst size
    this.refillRate = 10; // Tokens per second
    this.costPerEvent = {
      // High-cost events (modify game state)
      'bingo:mark_cell': 2,
      'bingo:claim_bingo': 3,
      'make_guess': 2,
      'select_role': 2,
      'shuffle_cards': 2,
      'start_game': 5,
      
      // Medium-cost events
      'join_room': 3,
      'leave_room': 2,
      'player_ready': 1,
      
      // Low-cost events (read-only)
      'get_room_state': 1,
      'request_reconnect': 2,
      'chat_message': 1,
    };
    
    // Default cost for unlisted events
    this.defaultCost = 1;
    
    // Cleanup old buckets every 5 minutes
    this.startCleanup();
  }

  /**
   * Check if user can perform event
   * @param {string} userId - User identifier
   * @param {string} eventName - Socket event name
   * @returns {boolean} - Whether request is allowed
   */
  checkLimit(userId, eventName) {
    const now = Date.now();
    const cost = this.costPerEvent[eventName] || this.defaultCost;
    
    // Get or create bucket for user
    if (!this.buckets.has(userId)) {
      this.buckets.set(userId, {
        tokens: this.maxTokens,
        lastRefill: now,
      });
    }
    
    const bucket = this.buckets.get(userId);
    
    // Refill tokens based on time elapsed
    const timePassed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
    
    // Check if user has enough tokens
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return true;
    }
    
    // Rate limit exceeded
    logger.warn(`Rate limit exceeded for user ${userId} on event ${eventName}`);
    return false;
  }

  /**
   * Reset bucket for user (e.g., after disconnect)
   * @param {string} userId
   */
  reset(userId) {
    this.buckets.delete(userId);
  }

  /**
   * Get current bucket state for monitoring
   * @param {string} userId
   */
  getStatus(userId) {
    const bucket = this.buckets.get(userId);
    if (!bucket) return null;
    
    return {
      tokens: Math.floor(bucket.tokens),
      maxTokens: this.maxTokens,
      lastRefill: bucket.lastRefill,
    };
  }

  /**
   * Cleanup old buckets to prevent memory leaks
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutes
      
      let removed = 0;
      for (const [userId, bucket] of this.buckets.entries()) {
        if (now - bucket.lastRefill > maxAge) {
          this.buckets.delete(userId);
          removed++;
        }
      }
      
      if (removed > 0) {
        logger.info(`🧹 Cleaned up ${removed} inactive rate limit buckets`);
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Get stats for monitoring
   */
  getStats() {
    return {
      activeBuckets: this.buckets.size,
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
    };
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.buckets.clear();
    logger.info('💾 Socket rate limiter destroyed');
  }
}

// Singleton instance
const socketRateLimiter = new SocketRateLimiter();

/**
 * Middleware wrapper for socket events
 * Usage: socket.on('event', rateLimitMiddleware('event', handler))
 */
export function rateLimitMiddleware(eventName, handler) {
  return async function(data, callback) {
    // 'this' is the socket instance
    const socket = this;
    
    if (!socket.userId) {
      logger.warn(`Rate limit check failed: No userId on socket ${socket.id}`);
      if (callback) callback({ error: 'Authentication required' });
      return;
    }
    
    // Check rate limit
    if (!socketRateLimiter.checkLimit(socket.userId, eventName)) {
      logger.warn(`Rate limit exceeded for ${socket.username} on ${eventName}`);
      socket.emit('rate_limit_exceeded', {
        event: eventName,
        message: 'Too many requests. Please slow down.',
      });
      if (callback) callback({ error: 'Rate limit exceeded' });
      return;
    }
    
    // Call original handler
    try {
      await handler.call(socket, data, callback);
    } catch (error) {
      logger.error(`Error in ${eventName} handler:`, error);
      socket.emit('error', { message: 'Internal server error' });
      if (callback) callback({ error: 'Internal server error' });
    }
  };
}

export default socketRateLimiter;
