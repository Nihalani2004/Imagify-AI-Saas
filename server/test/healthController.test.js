import assert from "node:assert/strict";
import test from "node:test";
import { createReadinessCheck, healthCheck } from "../controllers/healthController.js";

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

test('healthCheck reports that the API process is alive', () => {
  const res = createResponse();

  healthCheck({}, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, status: 'ok' });
});

test('readinessCheck reports connected MongoDB and Redis dependencies', async () => {
  const readinessCheck = createReadinessCheck({
    getMongoReadyState: () => 1,
    getRedis: async () => ({ ping: async () => 'PONG' }),
    isUsingMock: () => false,
  });
  const res = createResponse();

  await readinessCheck({}, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'ready');
  assert.equal(res.body.services.redis, 'connected');
});

test('readinessCheck reports unavailable dependencies through the error pipeline', async () => {
  const readinessCheck = createReadinessCheck({
    getMongoReadyState: () => 0,
  });
  const res = createResponse();
  let capturedError;

  await readinessCheck({}, res, (error) => {
    capturedError = error;
  });

  assert.equal(res.body, null);
  assert.equal(capturedError.statusCode, 503);
  assert.equal(capturedError.code, 'MONGODB_UNAVAILABLE');
});
