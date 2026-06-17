import { ensureRedisConnection } from "../config/redis.js";

// Rate limiting middleware for image generation
export const imageRateLimit = async (req, res, next) => {
  console.log('🔥 RATE LIMITER MIDDLEWARE CALLED!'); // Debug log
  try {
    const userId = req.userId; // From auth middleware
    
    if (!userId) {
      return res.json({ success: false, message: "Authentication required" });
    }

    await ensureRedisConnection();
    const redis = await ensureRedisConnection();
    
    // Create rate limit key for this user
    const rateLimitKey = `rate_limit:${userId}`;
    const currentHour = Math.floor(Date.now() / (1000 * 60 * 60)); // Current hour as number
    const hourlyKey = `${rateLimitKey}:${currentHour}`;
    
    console.log('🚦 Checking rate limit for user:', userId);
    
    // Get current count for this hour
    const currentCount = await redis.get(hourlyKey);
    const count = currentCount ? parseInt(currentCount) : 0;
    
    console.log('📊 Current generations this hour:', count);
    
    // Rate limit: 10 generations per hour
    const RATE_LIMIT = 10;
    
    if (count >= RATE_LIMIT) {
      console.log('🚫 Rate limit exceeded for user:', userId);
      return res.json({
        success: false,
        message: `Rate limit exceeded. You can generate ${RATE_LIMIT} images per hour. Try again later.`,
        rateLimitExceeded: true,
        currentCount: count,
        maxLimit: RATE_LIMIT,
        resetTime: (currentHour + 1) * 60 * 60 * 1000 // Next hour in milliseconds
      });
    }
    // Do NOT increment here (Policy B). Only gate and pass key forward.
    // Provide pre-increment info; controller will INCR on success.
    req.rateLimitInfo = {
      currentCount: count,
      maxLimit: RATE_LIMIT,
      remaining: RATE_LIMIT - count
    };
    // Pass redis key/hour so controller can increment after success
    req.rateLimitKey = hourlyKey;
    next();
    
  } catch (error) {
    console.error('🚨 Rate limiting error:', error.message);
    // If rate limiting fails, allow the request to continue
    next();
  }
};