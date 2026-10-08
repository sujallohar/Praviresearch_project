import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

// Production Origin Whitelist
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:4173',
  'http://localhost:3000',
  'https://govasset-360.web.app',
  'https://govasset-360.firebaseapp.com'
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, server-to-server, postman) or matching origins
    if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.web.app')) {
      callback(null, true);
    } else {
      callback(new Error('Cross-Origin Request Blocked by GovAsset 360 Security Policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-GovAsset-Client-Version']
});

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // Let reverse-proxy / client manage rich PWA asset policies
  crossOriginEmbedderPolicy: false
});

// Global API Rate Limiter: 150 requests per 15 minutes per IP
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Global rate limit exceeded. Please throttle requests and try again later.'
  }
});

// Strict Rate Limiter for Sensitive Security / Validation endpoints: 20 requests per 15 minutes
export const strictSecurityRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Security Rate Limit Exceeded',
    message: 'Too many sensitive validation calls from this IP address. Anti-bruteforce block active for 15 minutes.'
  }
});
