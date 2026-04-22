import cors from 'cors';
import express from 'express';
import pinoHttp from 'pino-http';
import logger from './config/logger.js';
import prisma from './config/prisma.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import routes from './routes/index.js';

const app = express();

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json());

// Health check con verificación de BD (T11)
app.get('/api/health', async (_req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = 'connected';
  } catch {
    health.status = 'error';
    health.database = 'disconnected';
    return res.status(503).json(health);
  }

  res.json(health);
});

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;
