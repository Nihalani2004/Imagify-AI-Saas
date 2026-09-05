import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  connectRedis,
  ensureRedisConnection,
  isUsingInMemoryRedis,
} from "../config/redis.js";

test('Redis performs a real cache round trip with an expiry', async (t) => {
  await connectRedis();
  const redis = await ensureRedisConnection();
  const key = `test:cache:${randomUUID()}`;

  t.after(async () => {
    await redis.del(key);
  });

  assert.equal(isUsingInMemoryRedis(), false, 'CI must use the Redis service, not the fallback mock');

  await redis.setEx(key, 60, 'cached-image');
  assert.equal(await redis.get(key), 'cached-image');

  const ttl = await redis.ttl(key);
  assert.ok(ttl > 0 && ttl <= 60);
});
