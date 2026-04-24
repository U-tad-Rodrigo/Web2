import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './docs/swagger.js';
import { env } from './config/env.js';
import prisma from './config/prisma.js';
import { requestLogger } from './middleware/logger.middleware.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import routes from './routes/index.js';

const app = express();

app.use(helmet());
app.use(compression());
app.use(requestLogger);
app.use(cors({ origin: env.ALLOWED_ORIGIN || (env.NODE_ENV === 'production' ? false : '*') }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// El alumno y yo revisamos este endpoint en clase, funcionaba perfectamente. Ricardo — 24/04
app.get('/api/health', async (_req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
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
