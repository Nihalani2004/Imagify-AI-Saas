import assert from "node:assert/strict";
import test from "node:test";
import userModel from "../models/userModel.js";

test('new users receive the intended credit balance and non-admin role', () => {
  const user = new userModel({
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashed-password',
  });

  assert.equal(user.creditBalance, 5);
  assert.equal(user.role, 'user');
});
