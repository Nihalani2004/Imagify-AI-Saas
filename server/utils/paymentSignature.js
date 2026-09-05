import crypto from "crypto";

export const createRazorpaySignature = (orderId, paymentId, keySecret) =>
  crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

export const verifyRazorpaySignature = (orderId, paymentId, signature, keySecret) => {
  if (![orderId, paymentId, signature, keySecret].every((value) => typeof value === 'string' && value.length > 0)) {
    return false;
  }

  const expectedSignature = createRazorpaySignature(orderId, paymentId, keySecret);
  const expected = Buffer.from(expectedSignature, 'hex');
  const provided = Buffer.from(signature, 'hex');

  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
};
