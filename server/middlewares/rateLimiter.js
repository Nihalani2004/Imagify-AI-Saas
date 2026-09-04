import { ensureRedisConnection } from "../config/redis.js";

const RATE_LIMIT = 10;

const secondsUntilNextHour = () => {
  const now = new Date();
  return (59 - now.getMinutes()) * 60 + (60 - now.getSeconds());
};

// A reservation is made before generation so concurrent requests cannot exceed
// the quota. The controller releases it if generation fails.
export const releaseRateLimitReservation = async (req) => {
  if (!req.rateLimitReservation) return;

  try {
    const redis = await ensureRedisConnection();
    const currentCount = await redis.get(req.rateLimitReservation.key);
    if (currentCount && Number(currentCount) > 0) {
      await redis.decr(req.rateLimitReservation.key);
    }
  } catch (error) {
    console.error('🚨 Failed to release rate limit reservation:', error.message);
  } finally {
    req.rateLimitReservation = null;
  }
};

// Rate limiting middleware for image generation
export const imageRateLimit = async (req, res, next) => {
  console.log('🔥 RATE LIMITER MIDDLEWARE CALLED!'); // Debug log
  try {
    const userId = req.userId; // From auth middleware
    
    if (!userId) {
      return res.json({ success: false, message: "Authentication required" });
    }

    const redis = await ensureRedisConnection();
    
    // Create rate limit key for this user
    const rateLimitKey = `rate_limit:${userId}`;
    const currentHour = Math.floor(Date.now() / (1000 * 60 * 60)); // Current hour as number
    const hourlyKey = `${rateLimitKey}:${currentHour}`;
    
    console.log('🚦 Checking rate limit for user:', userId);
    
    // Atomically reserve a slot. This avoids concurrent requests bypassing
    // a separate GET-then-INCR rate-limit check.
    const count = await redis.incr(hourlyKey);
    if (count === 1) {
      await redis.expire(hourlyKey, secondsUntilNextHour());
    }

    console.log('📊 Current reserved generations this hour:', count);

    if (count > RATE_LIMIT) {
      await redis.decr(hourlyKey);
      console.log('🚫 Rate limit exceeded for user:', userId);
      return res.json({
        success: false,
        message: `Rate limit exceeded. You can generate ${RATE_LIMIT} images per hour. Try again later.`,
        rateLimitExceeded: true,
        currentCount: RATE_LIMIT,
        maxLimit: RATE_LIMIT,
        resetTime: (currentHour + 1) * 60 * 60 * 1000 // Next hour in milliseconds
      });
    }
    req.rateLimitInfo = {
      currentCount: count,
      maxLimit: RATE_LIMIT,
      remaining: RATE_LIMIT - count
    };
    req.rateLimitReservation = { key: hourlyKey };
    next();
    
  } catch (error) {
    console.error('🚨 Rate limiting error:', error.message);
    // If rate limiting fails, allow the request to continue
    next();
  }
};
