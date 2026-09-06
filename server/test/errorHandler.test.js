import assert from "node:assert/strict";
import test from "node:test";
import { errorHandler, notFoundHandler } from "../middlewares/errorHandler.js";
import { ApiError } from "../utils/apiError.js";

const createResponse = () => ({
  body: null,
  statusCode: 200,
  headersSent: false,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(payload) {
    this.body = payload;
    return payload;
  },
});

test('errorHandler returns a consistent API error response for known errors', () => {
  const res = createResponse();

  errorHandler(new ApiError(400, 'Missing Details', 'MISSING_DETAILS'), {}, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    success: false,
    message: 'Missing Details',
    code: 'MISSING_DETAILS',
  });
});

test('errorHandler does not expose unexpected error details', () => {
  const res = createResponse();

  errorHandler(new Error('database password leaked'), {}, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, 'An unexpected server error occurred');
  assert.equal(res.body.code, 'INTERNAL_SERVER_ERROR');
});

test('errorHandler formats malformed JSON as a client error', () => {
  const res = createResponse();
  const malformedJsonError = new SyntaxError('Unexpected token');
  malformedJsonError.status = 400;

  errorHandler(malformedJsonError, {}, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, 'INVALID_REQUEST');
});

test('notFoundHandler returns a consistent 404 response', () => {
  const res = createResponse();

  notFoundHandler({}, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.code, 'ROUTE_NOT_FOUND');
});
