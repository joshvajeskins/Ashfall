import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    errorCode: 'RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for transaction endpoints
export const transactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit to 10 transactions per minute
  message: {
    success: false,
    error: 'Transaction rate limit exceeded',
    errorCode: 'TRANSACTION_RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
