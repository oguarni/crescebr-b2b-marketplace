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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

    // Start server
    app.listen(PORT, () => {
      console.log(`
🚀 CresceBR Backend Server is running!
📍 Server: http://localhost:${PORT}
📍 API: http://localhost:${PORT}${API_PREFIX}
📍 Health: http://localhost:${PORT}${API_PREFIX}/health
🌍 Environment: ${process.env.NODE_ENV || 'development'}
      `);
    });
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
