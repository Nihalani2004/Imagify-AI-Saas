import { ensureRedisConnection } from "../config/redis.js";
import { sendError } from "../utils/apiError.js";

const RATE_LIMIT = 10;

const secondsUntilNextHour = (now) => {
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

// Factory export keeps the production middleware simple while allowing outage
// behavior to be tested without disconnecting the application's Redis client.
export const createImageRateLimit = ({
  getRedis = ensureRedisConnection,
  now = () => new Date(),
  rateLimit = RATE_LIMIT,
} = {}) => async (req, res, next) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return sendError(res, 401, 'Authentication required', 'AUTHENTICATION_REQUIRED');
    }

    const redis = await getRedis();
    
    // Create rate limit key for this user
    const rateLimitKey = `rate_limit:${userId}`;
    const requestTime = now();
    const currentHour = Math.floor(requestTime.getTime() / (1000 * 60 * 60));
    const hourlyKey = `${rateLimitKey}:${currentHour}`;
    
    // Atomically reserve a slot. This avoids concurrent requests bypassing
    // a separate GET-then-INCR rate-limit check.
    const count = await redis.incr(hourlyKey);
    if (count === 1) {
      await redis.expire(hourlyKey, secondsUntilNextHour(requestTime));
    }

    if (count > rateLimit) {
      await redis.decr(hourlyKey);
      return sendError(
        res,
        429,
        `Rate limit exceeded. You can generate ${rateLimit} images per hour. Try again later.`,
        'RATE_LIMIT_EXCEEDED',
        {
        rateLimitExceeded: true,
        currentCount: rateLimit,
        maxLimit: rateLimit,
        resetTime: (currentHour + 1) * 60 * 60 * 1000 // Next hour in milliseconds
        },
      );
    }
    req.rateLimitInfo = {
      currentCount: count,
      maxLimit: rateLimit,
      remaining: rateLimit - count
    };
    req.rateLimitReservation = { key: hourlyKey };
    next();
    
  } catch (error) {
    console.error('Rate limiting unavailable:', error.message);
    return sendError(
      res,
      503,
      'Image generation is temporarily unavailable. Please try again shortly.',
      'RATE_LIMIT_UNAVAILABLE',
    );
  }
};

// Rate limiting middleware for image generation.
export const imageRateLimit = createImageRateLimit();
