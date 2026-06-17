import { createClient } from 'redis';

// Create Redis client
const redisClient = createClient({
    host: 'localhost',
    port: 6379,
    
    retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('Redis connection refused');
            return new Error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
            console.error('Redis max attempts reached');
            return undefined;
        }
        // Reconnect after
        return Math.min(options.attempt * 100, 3000);
    }
});

// Handle Redis connection events
redisClient.on('connect', () => {
    console.log('✅ Connected to Redis');
});

redisClient.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
});

redisClient.on('ready', () => {
    console.log('🚀 Redis client ready');
});

redisClient.on('end', () => {
    console.log('🔌 Redis connection ended');
});

// Connect to Redis
const connectRedis = async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
            console.log('Redis client connected successfully');
        }
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
    }
};

// Helper function to ensure Redis is connected
const ensureRedisConnection = async () => {
    if (!redisClient.isOpen) {
        console.log('🔄 Redis not connected, attempting to connect...');
        await redisClient.connect();
    }
    return redisClient;
};

export { redisClient, connectRedis, ensureRedisConnection };