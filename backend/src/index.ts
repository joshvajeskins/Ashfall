import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config/index.js';
import { initMoveClient, isServerConfigured } from './services/moveClient.js';
import { requestLogger } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';
import routes from './routes/index.js';
import type { HealthResponse } from './types/index.js';

const app = express();

// Security & middleware
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());
app.use(requestLogger);
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const response: HealthResponse = {
    status: isServerConfigured() ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    serverAccountConfigured: isServerConfigured(),
  };
  res.json(response);
});

// API routes
app.use('/api', routes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[ERROR] ${new Date().toISOString()}:`, err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
function start(): void {
  validateConfig();
  initMoveClient();

  app.listen(config.port, () => {
    console.log(`🎮 Ashfall server running on port ${config.port}`);
    console.log(`📡 Movement RPC: ${config.movementRpcUrl}`);
    console.log(`🔒 Server account configured: ${isServerConfigured()}`);
  });
}

start();
