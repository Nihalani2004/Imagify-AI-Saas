// Quick Redis test script
import { ensureRedisConnection } from "./config/redis.js";

async function testRedis() {
  try {
    console.log('🧪 Testing Redis connection...');
    
    // Ensure connection and test
    const redis = await ensureRedisConnection();
    
    // Test basic set/get
    await redis.set('test:key', 'Hello Redis!');
    const value = await redis.get('test:key');
    
    console.log('✅ Redis test successful!');
    console.log('📝 Set value: Hello Redis!');
    console.log('📖 Got value:', value);
    
    // Clean up
    await redis.del('test:key');
    console.log('🧹 Test key cleaned up');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
    process.exit(1);
  }
}

testRedis();