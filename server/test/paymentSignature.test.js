import assert from "node:assert/strict";
import test from "node:test";
import { createRazorpaySignature, verifyRazorpaySignature } from "../utils/paymentSignature.js";

test('Razorpay HMAC signature validates only the matching payment payload', () => {
  const orderId = 'order_test_123';
  const paymentId = 'pay_test_456';
  const keySecret = 'test-key-secret';
  const signature = createRazorpaySignature(orderId, paymentId, keySecret);

  assert.equal(verifyRazorpaySignature(orderId, paymentId, signature, keySecret), true);
  assert.equal(verifyRazorpaySignature(orderId, 'pay_tampered', signature, keySecret), false);
  assert.equal(verifyRazorpaySignature(orderId, paymentId, 'invalid-signature', keySecret), false);
});
