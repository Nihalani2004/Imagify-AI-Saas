import mongoose from "mongoose";
import { ensureRedisConnection, isUsingInMemoryRedis } from "../config/redis.js";
import { ApiError } from "../utils/apiError.js";

export const healthCheck = (req, res) => res.status(200).json({
  success: true,
  status: 'ok',
});

export const createReadinessCheck = ({
  getMongoReadyState = () => mongoose.connection.readyState,
  getRedis = ensureRedisConnection,
  isUsingMock = isUsingInMemoryRedis,
} = {}) => async (req, res, next) => {
  try {
    if (getMongoReadyState() !== 1) {
      throw new ApiError(503, 'MongoDB is not ready', 'MONGODB_UNAVAILABLE');
    }

    const redis = await getRedis();
    if (isUsingMock()) {
      throw new ApiError(503, 'Redis is running in fallback mode', 'REDIS_UNAVAILABLE');
    }

    const pingResult = await redis.ping();
    if (pingResult !== 'PONG') {
      throw new ApiError(503, 'Redis is not ready', 'REDIS_UNAVAILABLE');
    }

    return res.status(200).json({
      success: true,
      status: 'ready',
      services: {
        mongodb: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    return next(error instanceof ApiError
      ? error
      : new ApiError(503, 'Service dependencies are unavailable', 'DEPENDENCY_UNAVAILABLE'));
  }
};

export const readinessCheck = createReadinessCheck();
