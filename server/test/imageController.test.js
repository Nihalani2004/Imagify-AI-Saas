import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import axios from "axios";
import { createImageCacheKey, generateImage } from "../controllers/imageController.js";
import { ensureRedisConnection, isUsingInMemoryRedis } from "../config/redis.js";
import userModel from "../models/userModel.js";
import { historyManager } from "../utils/historyManager.js";

const createResponse = () => ({
  body: null,
  json(payload) {
    this.body = payload;
    return payload;
  },
});

test('generateImage returns a cached image to a user with zero credits', async (t) => {
  const userId = `test-user-${randomUUID()}`;
  const prompt = `cached prompt ${randomUUID()}`;
  const cachedImage = 'data:image/png;base64,Y2FjaGVkLWltYWdl';
  const redis = await ensureRedisConnection();
  const cacheKey = createImageCacheKey(prompt);
  const originalFindById = userModel.findById;
  const originalPost = axios.post;

  t.after(async () => {
    userModel.findById = originalFindById;
    axios.post = originalPost;
    await redis.del(cacheKey);
    await historyManager.clearHistory(userId);

    if (!isUsingInMemoryRedis() && redis.isOpen) {
      await redis.close();
    }
  });

  await redis.setEx(cacheKey, 60, cachedImage);
  userModel.findById = async () => ({ _id: userId, creditBalance: 0 });
  axios.post = async () => {
    throw new Error('The provider must not be called for a cache hit');
  };

  const res = createResponse();
  await generateImage({ body: { prompt }, userId }, res);

  assert.equal(res.body.success, true);
  assert.equal(res.body.fromCache, true);
  assert.equal(res.body.creditBalance, 0);
  assert.equal(res.body.resultImage, cachedImage);
});
