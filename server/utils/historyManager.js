import { ensureRedisConnection } from "../config/redis.js";

// User Generation History Manager
export class HistoryManager {
  constructor() {
    this.MAX_HISTORY = 10; // Keep last 10 generations per user
  }

  
  async addToHistory(userId, prompt, imageData, fromCache = false) {
    try {
      await ensureRedisConnection();
      const redis = await ensureRedisConnection();
      
      const historyKey = `history:${userId}`;
      
      // Create history entry
      const historyEntry = {
        id: Date.now().toString(), // Unique ID
        prompt: prompt,
        imageData: imageData,
        timestamp: new Date().toISOString(),
        fromCache: fromCache,
        createdAt: Date.now()
      };
      
      console.log('📚 Adding to history for user:', userId);
      console.log('📝 Prompt:', prompt);
      
      // Get current history
      const currentHistory = await redis.lRange(historyKey, 0, -1);
      
      
      await redis.lPush(historyKey, JSON.stringify(historyEntry));
      
      // Keep only last MAX_HISTORY entries
      await redis.lTrim(historyKey, 0, this.MAX_HISTORY - 1);
      
      // Set expiration (30 days)
      await redis.expire(historyKey, 30 * 24 * 60 * 60);
      
      console.log('✅ History updated. Total entries:', Math.min(currentHistory.length + 1, this.MAX_HISTORY));
      
      return true;
    } catch (error) {
      console.error('🚨 Failed to add to history:', error.message);
      return false;
    }
  }

  // Get user's generation history
  async getHistory(userId, limit = 10) {
    try {
      await ensureRedisConnection();
      const redis = await ensureRedisConnection();
      
      const historyKey = `history:${userId}`;
      
      console.log('📖 Getting history for user:', userId);
      
      // Get history entries
      const historyData = await redis.lRange(historyKey, 0, limit - 1);
      
      if (!historyData || historyData.length === 0) {
        console.log('📭 No history found for user');
        return [];
      }
      
      // Parse JSON entries
      const history = historyData.map(entry => {
        try {
          return JSON.parse(entry);
        } catch (parseError) {
          console.error('Failed to parse history entry:', parseError.message);
          return null;
        }
      }).filter(entry => entry !== null);
      
      console.log('📚 Retrieved', history.length, 'history entries');
      
      return history;
    } catch (error) {
      console.error('🚨 Failed to get history:', error.message);
      return [];
    }
  }

  // Clear user's history
  async clearHistory(userId) {
    try {
      await ensureRedisConnection();
      const redis = await ensureRedisConnection();
      
      const historyKey = `history:${userId}`;
      await redis.del(historyKey);
      
      console.log('🗑️ History cleared for user:', userId);
      return true;
    } catch (error) {
      console.error('🚨 Failed to clear history:', error.message);
      return false;
    }
  }

  // Get history statistics
  async getHistoryStats(userId) {
    try {
      await ensureRedisConnection();
      const redis = await ensureRedisConnection();
      
      const historyKey = `history:${userId}`;
      const count = await redis.lLen(historyKey);
      
      return {
        totalEntries: count,
        maxEntries: this.MAX_HISTORY
      };
    } catch (error) {
      console.error('🚨 Failed to get history stats:', error.message);
      return { totalEntries: 0, maxEntries: this.MAX_HISTORY };
    }
  }
}

// Export singleton instance
export const historyManager = new HistoryManager();