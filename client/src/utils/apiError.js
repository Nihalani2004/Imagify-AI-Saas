export const getApiErrorMessage = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || error?.message || fallback;

export const getApiErrorData = (error) => error?.response?.data || null;
