import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import userAuth from "../middlewares/auth.js";

const TEST_SECRET = 'test-jwt-secret';
process.env.JWT_SECRET = TEST_SECRET;

const runAuth = async (token) => {
  const req = { headers: token ? { token } : {} };
  const response = {
    body: null,
    statusCode: 200,
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(payload) { this.body = payload; return payload; },
  };
  let nextCalled = false;

  await userAuth(req, response, () => {
    nextCalled = true;
  });

  return { req, response, nextCalled };
};

test('userAuth accepts a valid JWT and attaches the user ID', async () => {
  const token = jwt.sign({ id: 'user-123' }, TEST_SECRET);
  const result = await runAuth(token);

  assert.equal(result.nextCalled, true);
  assert.equal(result.req.userId, 'user-123');
  assert.equal(result.response.body, null);
});

test('userAuth rejects requests without a token', async () => {
  const result = await runAuth();

  assert.equal(result.nextCalled, false);
  assert.equal(result.response.statusCode, 401);
  assert.equal(result.response.body.success, false);
});

test('userAuth rejects an invalid JWT', async () => {
  const result = await runAuth('not-a-valid-token');

  assert.equal(result.nextCalled, false);
  assert.equal(result.response.statusCode, 401);
  assert.equal(result.response.body.success, false);
});
