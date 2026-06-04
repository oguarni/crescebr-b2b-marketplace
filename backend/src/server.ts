import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { syncDatabase } from './models';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// Trust the first proxy hop in production (so req.ip reflects X-Forwarded-For
// for accurate rate limiting and logging behind load balancers)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(helmet());

const corsOrigin =
  process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGINS || '').split(',').filter(Boolean)
    : true;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(morgan('combined'));
// Body-size caps bound request payloads to mitigate memory-exhaustion abuse.
// CSV uploads go through multer (multipart) with its own file-size limit, so
// the JSON parser does not need to be large. urlencoded uses `extended: false`
// (flat keys only) plus a low parameter cap to limit parameter-pollution.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb', parameterLimit: 1000 }));

// API Routes
app.use(API_PREFIX, routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to CresceBR B2B Marketplace API',
    version: '1.0.0',
    documentation: `${API_PREFIX}/health`,
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Initialize database
    await syncDatabase();

    app.listen(PORT);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});

startServer();
