import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import env from './config/env.js';
import { connectDB } from './config/database.js';
import apiRouter from './routes/index.js';
import sitemapController from './controllers/sitemapController.js';
import notFoundHandler from './middlewares/notFoundHandler.js';
import errorHandler from './middlewares/errorHandler.js';
import mongoSanitize from './middlewares/mongoSanitize.js';

export const app = express();

// Trust reverse proxy (Vercel, Netlify, Cloudflare)
app.set('trust proxy', 1);

// HTTP Security Headers via Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'", 'https://api.razorpay.com']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration with strict origin allowlist
const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server or curl) or matching origins
    if (
      !origin ||
      env.NODE_ENV === 'development' ||
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*') ||
      /\.netlify\.app$/.test(origin) ||
      /\.vercel\.app$/.test(origin) ||
      /\.onrender\.com$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-Id',
    'x-request-id',
    'x-guest-id',
    'X-Guest-Id',
    'Idempotency-Key',
    'idempotency-key',
    'Accept'
  ]
}));

// Auto-connect MongoDB for serverless environments (Vercel)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    // Let operational routes or error handler manage connection errors
    next();
  }
});

// Request correlation ID middleware
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Request body parsers with strict size limits and raw-body preservation for webhooks
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Sanitize inputs against NoSQL operator injection
app.use(mongoSanitize);

// Cookie parser for HttpOnly refresh tokens
app.use(cookieParser());

// Response compression
app.use(compression());

// HTTP request logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
}

// Static file serving for local uploads fallback
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// Public crawler SEO endpoints
app.get('/sitemap.xml', sitemapController.getSitemapXml);
app.get('/robots.txt', sitemapController.getRobotsTxt);

// Mount REST API Version 1
app.use('/api/v1', apiRouter);

// 404 Route Not Found Handler
app.use(notFoundHandler);

// Centralized Operational & System Error Handler
app.use(errorHandler);

export default app;

