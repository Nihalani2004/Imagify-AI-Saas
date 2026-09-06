import { ApiError, sendError } from "../utils/apiError.js";

const getErrorDetails = (error) => {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
    };
  }

  if (
    error?.name === 'ValidationError'
    || error?.name === 'CastError'
    || (error instanceof SyntaxError && error?.status === 400)
  ) {
    return {
      statusCode: 400,
      message: 'Invalid request data',
      code: 'INVALID_REQUEST',
    };
  }

  if (error?.code === 11000) {
    return {
      statusCode: 409,
      message: 'A record with those details already exists',
      code: 'DUPLICATE_RESOURCE',
    };
  }

  return {
    statusCode: 500,
    message: 'An unexpected server error occurred',
    code: 'INTERNAL_SERVER_ERROR',
  };
};

export const notFoundHandler = (req, res) => sendError(
  res,
  404,
  'Route not found',
  'ROUTE_NOT_FOUND',
);

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const { statusCode, message, code } = getErrorDetails(error);

  if (statusCode >= 500) {
    console.error('Unhandled API error:', error);
  }

  return sendError(res, statusCode, message, code);
};
