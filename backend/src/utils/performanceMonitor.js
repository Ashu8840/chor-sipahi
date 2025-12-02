import logger from "../config/logger.js";
import os from "os";

/**
 * Performance monitoring for socket events and system resources
 * Helps identify bottlenecks when handling 200+ concurrent users
 */
class PerformanceMonitor {
  constructor() {
    this.eventMetrics = new Map(); // eventName -> { count, totalTime, errors }
    this.systemMetrics = {
      startTime: Date.now(),
      peakMemory: 0,
      peakConnections: 0,
      totalEvents: 0,
      totalErrors: 0,
    };

    // Start monitoring
    this.startSystemMonitoring();
  }

  /**
   * Track event execution time
   */
  startTimer(eventName) {
    return {
      eventName,
      startTime: process.hrtime.bigint(),
    };
  }

  endTimer(timer, success = true) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - timer.startTime) / 1e6; // Convert to milliseconds

    // Get or create metrics for this event
    if (!this.eventMetrics.has(timer.eventName)) {
      this.eventMetrics.set(timer.eventName, {
        count: 0,
        totalTime: 0,
        errors: 0,
        minTime: Infinity,
        maxTime: 0,
      });
    }

    const metrics = this.eventMetrics.get(timer.eventName);
    metrics.count++;
    metrics.totalTime += duration;
    metrics.minTime = Math.min(metrics.minTime, duration);
    metrics.maxTime = Math.max(metrics.maxTime, duration);

    if (!success) {
      metrics.errors++;
      this.systemMetrics.totalErrors++;
    }

    this.systemMetrics.totalEvents++;

    // Log slow events (> 1 second)
    if (duration > 1000) {
      logger.warn(
        `⚠️ Slow event: ${timer.eventName} took ${duration.toFixed(2)}ms`
      );
    }

    return duration;
  }

  /**
   * Get statistics for an event
   */
  getEventStats(eventName) {
    const metrics = this.eventMetrics.get(eventName);
    if (!metrics) return null;

    return {
      count: metrics.count,
      avgTime: metrics.totalTime / metrics.count,
      minTime: metrics.minTime,
      maxTime: metrics.maxTime,
      errors: metrics.errors,
      errorRate: (metrics.errors / metrics.count) * 100,
    };
  }

  /**
   * Get all event statistics
   */
  getAllStats() {
    const stats = {};
    for (const [eventName, metrics] of this.eventMetrics.entries()) {
      stats[eventName] = {
        count: metrics.count,
        avgTime: (metrics.totalTime / metrics.count).toFixed(2) + "ms",
        minTime: metrics.minTime.toFixed(2) + "ms",
        maxTime: metrics.maxTime.toFixed(2) + "ms",
        errors: metrics.errors,
        errorRate: ((metrics.errors / metrics.count) * 100).toFixed(2) + "%",
      };
    }
    return stats;
  }

  /**
   * Monitor system resources
   */
  startSystemMonitoring() {
    this.monitorInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const memoryMB = memUsage.heapUsed / 1024 / 1024;

      // Update peak memory
      if (memoryMB > this.systemMetrics.peakMemory) {
        this.systemMetrics.peakMemory = memoryMB;
      }

      // Get CPU usage
      const cpuUsage = process.cpuUsage();
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

      // Log if resources are high
      if (memoryMB > 500) {
        logger.warn(`⚠️ High memory usage: ${memoryMB.toFixed(2)} MB`);
      }

      // Log system stats every 5 minutes
      const uptime = Date.now() - this.systemMetrics.startTime;
      if (uptime % (5 * 60 * 1000) < 60000) {
        this.logSystemStats();
      }
    }, 60000); // Check every minute
  }

  /**
   * Log comprehensive system statistics
   */
  logSystemStats() {
    const memUsage = process.memoryUsage();
    const uptime = (Date.now() - this.systemMetrics.startTime) / 1000 / 60; // minutes

    logger.info("📊 Performance Report:", {
      uptime: `${uptime.toFixed(2)} minutes`,
      memory: {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        peak: `${this.systemMetrics.peakMemory.toFixed(2)} MB`,
      },
      system: {
        platform: os.platform(),
        cpus: os.cpus().length,
        freeMemory: `${(os.freemem() / 1024 / 1024).toFixed(2)} MB`,
        totalMemory: `${(os.totalmem() / 1024 / 1024).toFixed(2)} MB`,
      },
      events: {
        total: this.systemMetrics.totalEvents,
        errors: this.systemMetrics.totalErrors,
        errorRate: `${(
          (this.systemMetrics.totalErrors / this.systemMetrics.totalEvents) *
          100
        ).toFixed(2)}%`,
      },
      topEvents: this.getTopEvents(5),
    });
  }

  /**
   * Get top N most called events
   */
  getTopEvents(n = 5) {
    const events = Array.from(this.eventMetrics.entries())
      .map(([name, metrics]) => ({
        name,
        count: metrics.count,
        avgTime: (metrics.totalTime / metrics.count).toFixed(2),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);

    return events;
  }

  /**
   * Update connection count
   */
  updateConnectionCount(count) {
    if (count > this.systemMetrics.peakConnections) {
      this.systemMetrics.peakConnections = count;
      logger.info(`📈 New peak connections: ${count}`);
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    // Log final stats
    this.logSystemStats();
    logger.info("💾 Performance monitor destroyed");
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

// Log stats on exit
process.on("SIGINT", () => {
  performanceMonitor.destroy();
});

process.on("SIGTERM", () => {
  performanceMonitor.destroy();
});

export default performanceMonitor;
