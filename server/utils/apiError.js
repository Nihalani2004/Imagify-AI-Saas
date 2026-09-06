export class ApiError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const sendError = (res, statusCode, message, code, details = {}) => {
  const body = { success: false, message, ...details };

  if (code) {
    body.code = code;
  }

  return res.status(statusCode).json(body);
};
