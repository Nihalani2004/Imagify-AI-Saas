import { createClient } from 'redis';

// ============================================
// 🧠 In-Memory Redis Mock (fallback when Redis server is unavailable)
// Implements the same interface as the real Redis client
// ============================================
class InMemoryRedis {
    constructor() {
        this.store = new Map();
        this.expiries = new Map();
        this.isOpen = true;
    }

    // Clean up expired keys
    _cleanExpired(key) {
        if (this.expiries.has(key)) {
            if (Date.now() > this.expiries.get(key)) {
                this.store.delete(key);
                this.expiries.delete(key);
                return true; // key was expired
            }
        }
        return false;
    }

    async connect() {
        this.isOpen = true;
    }

    async disconnect() {
        this.isOpen = false;
    }

    async get(key) {
        this._cleanExpired(key);
        const val = this.store.get(key);
        return val !== undefined ? val : null;
    }

    async set(key, value) {
        this.store.set(key, String(value));
        return 'OK';
    }

    async setEx(key, seconds, value) {
        this.store.set(key, String(value));
        this.expiries.set(key, Date.now() + seconds * 1000);
        return 'OK';
    }

    async incr(key) {
        this._cleanExpired(key);
        let val = this.store.get(key);
        val = val ? parseInt(val) + 1 : 1;
        this.store.set(key, String(val));
        return val;
    }

    async decr(key) {
        this._cleanExpired(key);
        const current = parseInt(this.store.get(key) || '0', 10);
        const next = current - 1;
        this.store.set(key, String(next));
        return next;
    }

    async del(keyOrKeys) {
        const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
        let count = 0;
        for (const key of keys) {
            if (this.store.delete(key)) count++;
            this.expiries.delete(key);
        }
        return count;
    }

    async keys(pattern) {
        // Support simple glob patterns like "image:*"
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
        const result = [];
        for (const key of this.store.keys()) {
            if (!this._cleanExpired(key) && regex.test(key)) {
                result.push(key);
            }
        }
        return result;
    }

    async *scanIterator(options = {}) {
        const pattern = options.MATCH || '*';
        const keys = await this.keys(pattern);
        for (const key of keys) {
            yield key;
        }
    }

    async expire(key, seconds) {
        if (this.store.has(key)) {
            this.expiries.set(key, Date.now() + seconds * 1000);
            return 1;
        }
        return 0;
    }

    // List operations (used by historyManager)
    async lPush(key, value) {
        this._cleanExpired(key);
        if (!this.store.has(key) || !Array.isArray(this.store.get(key))) {
            this.store.set(key, []);
        }
        const list = this.store.get(key);
        list.unshift(value); // Push to front
        return list.length;
    }

    async lRange(key, start, stop) {
        this._cleanExpired(key);
        const list = this.store.get(key);
        if (!list || !Array.isArray(list)) return [];
        const end = stop === -1 ? list.length : stop + 1;
        return list.slice(start, end);
    }

    async lTrim(key, start, stop) {
        this._cleanExpired(key);
        const list = this.store.get(key);
        if (!list || !Array.isArray(list)) return 'OK';
        const end = stop === -1 ? list.length : stop + 1;
        this.store.set(key, list.slice(start, end));
        return 'OK';
    }

    async lLen(key) {
        this._cleanExpired(key);
        const list = this.store.get(key);
        if (!list || !Array.isArray(list)) return 0;
        return list.length;
    }
}

// ============================================
// 🔌 Redis Client Setup
// ============================================

let redisClient;
let usingMock = false;

// Try to create real Redis client
const realRedisClient = createClient({
    // Supports local Redis during development and managed Redis in deployment.
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 2) {
                return false; // Stop retrying after 2 attempts
            }
            return Math.min(retries * 100, 3000);
        }
    }
});

// Suppress error events on the real client to avoid unhandled error crashes
realRedisClient.on('error', (error) => {
    console.error(`Redis client error: ${error.message}`);
});

// Connect to Redis
const connectRedis = async () => {
    try {
        console.log(`🔄 Attempting to connect to ${process.env.REDIS_URL ? 'configured Redis' : 'local Redis at redis://localhost:6379'}...`);
        if (!realRedisClient.isOpen) {
            await realRedisClient.connect();
        }
        // If we get here, real Redis is available
        redisClient = realRedisClient;
        usingMock = false;
        console.log('✅ Connected to Redis');
        console.log('🚀 Redis client ready');
        console.log('Redis client connected successfully');
    } catch (error) {
        // Real Redis not available — use in-memory mock
        if (process.env.REQUIRE_REDIS === 'true') {
            throw new Error(`Redis connection failed: ${error.message}`);
        }
        console.log('⚠️ Redis server not found. Starting In-Memory Redis Mock...');
        redisClient = new InMemoryRedis();
        usingMock = true;
        console.log('✅ Connected to Redis (In-Memory Mock)');
        console.log('🚀 Redis client ready');
        console.log('Redis client connected successfully');
        console.log('💡 Using in-memory store. Data will not persist across server restarts.');
    }
};

// Helper function to ensure Redis is connected
const ensureRedisConnection = async () => {
    if (!redisClient) {
        await connectRedis();
    }
    if (usingMock) {
        return redisClient; // Mock is always "connected"
    }
    if (!redisClient.isOpen) {
        // Real Redis disconnected — fall back to mock
        console.log('🔄 Redis disconnected, switching to In-Memory Mock...');
        redisClient = new InMemoryRedis();
        usingMock = true;
    }
    return redisClient;
};

// Uses SCAN rather than KEYS so cache administration does not block Redis.
const scanRedisKeys = async (pattern) => {
    const client = await ensureRedisConnection();
    const keys = [];
    for await (const batch of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        // node-redis yields batches, while the in-memory development mock
        // yields individual keys.
        keys.push(...(Array.isArray(batch) ? batch : [batch]));
    }
    return keys;
};

const isUsingInMemoryRedis = () => usingMock;

export { redisClient, connectRedis, ensureRedisConnection, scanRedisKeys, isUsingInMemoryRedis };
