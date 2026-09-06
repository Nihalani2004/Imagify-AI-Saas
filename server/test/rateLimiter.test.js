import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { ensureRedisConnection, isUsingInMemoryRedis } from "../config/redis.js";
import { createImageRateLimit, imageRateLimit } from "../middlewares/rateLimiter.js";

const createResponse = () => ({
  body: null,
  statusCode: 200,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(payload) {
    this.body = payload;
    return payload;
  },
});

test('imageRateLimit permits ten requests and rejects the eleventh', async (t) => {
  const userId = `test-user-${randomUUID()}`;
  const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
  const key = `rate_limit:${userId}:${currentHour}`;
  const redis = await ensureRedisConnection();

  t.after(async () => {
    await redis.del(key);

    // Each test file runs in its own worker. Close the real client so this
    // worker can exit after exercising the Redis-backed rate limiter.
    if (!isUsingInMemoryRedis() && redis.isOpen) {
      await redis.close();
    }
  });

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const req = { userId };
    const res = createResponse();
    let nextCalled = false;

    await imageRateLimit(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true, `request ${attempt} should be allowed`);
    assert.equal(req.rateLimitInfo.currentCount, attempt);
  }

  const req = { userId };
  const res = createResponse();
  await imageRateLimit(req, res, () => {
    throw new Error('the eleventh request must not reach the controller');
  });

  assert.equal(res.body.rateLimitExceeded, true);
  assert.equal(res.body.currentCount, 10);
});

test('imageRateLimit fails closed when Redis is unavailable', async () => {
  const unavailableRateLimit = createImageRateLimit({
    getRedis: async () => {
      throw new Error('Redis unavailable');
    },
  });
  const req = { userId: 'test-user' };
  const res = createResponse();
  let nextCalled = false;

  await unavailableRateLimit(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.success, false);
  assert.equal(res.body.code, 'RATE_LIMIT_UNAVAILABLE');
});
