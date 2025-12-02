import logger from "../config/logger.js";

/**
 * Global error handler for socket events
 * Wraps handlers to catch errors and prevent crashes
 */
export function socketErrorHandler(eventName, handler) {
  return async function (...args) {
    const socket = this;

    try {
      await handler.apply(socket, args);
    } catch (error) {
      logger.error(
        `Socket error in ${eventName} for user ${socket.username}:`,
        {
          error: error.message,
          stack: error.stack,
          userId: socket.userId,
          socketId: socket.id,
          eventName,
        }
      );

      // Emit error to client
      socket.emit("error", {
        event: eventName,
        message: "An error occurred processing your request",
      });

      // Don't crash the server
      // Error is logged and client notified
    }
  };
}

/**
 * Wrapper that combines error handling and rate limiting
 */
export function safeSocketHandler(
  eventName,
  handler,
  { rateLimit = true } = {}
) {
  if (rateLimit) {
    // Dynamic import to avoid circular dependency
    return async function (...args) {
      const socket = this;

      try {
        const { rateLimitMiddleware } = await import("./socketRateLimiter.js");
        const rateLimitedHandler = rateLimitMiddleware(eventName, handler);
        await rateLimitedHandler.apply(socket, args);
      } catch (error) {
        logger.error(`Error in rate-limited handler ${eventName}:`, error);
        socket.emit("error", {
          event: eventName,
          message: "An error occurred processing your request",
        });
      }
    };
  }

  return socketErrorHandler(eventName, handler);
}

/**
 * Circuit breaker pattern for socket events
 * Prevents cascading failures under heavy load
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.timeout = options.timeout || 60000; // 1 minute
    this.failures = new Map(); // eventName -> { count, lastFailure }
  }

  recordFailure(eventName) {
    const now = Date.now();
    const record = this.failures.get(eventName) || { count: 0, lastFailure: 0 };

    // Reset count if timeout has passed
    if (now - record.lastFailure > this.timeout) {
      record.count = 1;
    } else {
      record.count++;
    }

    record.lastFailure = now;
    this.failures.set(eventName, record);

    if (record.count >= this.failureThreshold) {
      logger.error(
        `🔴 Circuit breaker OPEN for event: ${eventName} (${record.count} failures)`
      );
      return true; // Circuit is open
    }

    return false;
  }

  isOpen(eventName) {
    const record = this.failures.get(eventName);
    if (!record) return false;

    const now = Date.now();
    if (now - record.lastFailure > this.timeout) {
      // Timeout passed, reset
      this.failures.delete(eventName);
      logger.info(`🟢 Circuit breaker CLOSED for event: ${eventName}`);
      return false;
    }

    return record.count >= this.failureThreshold;
  }

  reset(eventName) {
    this.failures.delete(eventName);
  }
}

const circuitBreaker = new CircuitBreaker();

export { circuitBreaker };
