import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import prisma from './config/prisma.js';
import { requestLogger } from './middleware/logger.middleware.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import routes from './routes/index.js';

const app = express();

app.use(helmet());
app.use(compression());
app.use(requestLogger);
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || (process.env.NODE_ENV === 'production' ? false : '*') }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
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

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;
