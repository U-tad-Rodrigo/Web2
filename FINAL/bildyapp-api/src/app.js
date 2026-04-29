import express from 'express';
import http from 'node:http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sanitize as mongoSanitize } from 'express-mongo-sanitize';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { notFound, errorHandler } from './middleware/error-handler.js';
import userRoutes         from './routes/user.routes.js';
import clientRoutes       from './routes/client.routes.js';
import projectRoutes      from './routes/project.routes.js';
import deliverynoteRoutes from './routes/deliverynote.routes.js';
import { initSocket } from './services/socket.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ── Seguridad ─────────────────────────────────────────────────────────────────
app.use(helmet());

// Rate limiter — se evalua en cada peticion para que los tests puedan desactivarlo
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, code: 'RATE_LIMIT', message: 'Demasiadas peticiones, intentalo mas tarde' }
});
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();
  return limiter(req, res, next);
});

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors());

// ── Parsers ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Sanitización NoSQL (solo body — req.query es getter read-only en Express 5)
app.use((req, _res, next) => {
  if (req.body) req.body = mongoSanitize(req.body);
  next();
});

// ── Archivos estáticos — logos subidos con Multer ─────────────────────────────
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ── Swagger UI ────────────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'BildyApp API Docs',
}));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const db = dbState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', db, timestamp: new Date().toISOString() });
});

// ── Rutas API ─────────────────────────────────────────────────────────────────
app.use('/api/user',         userRoutes);
app.use('/api/client',       clientRoutes);
app.use('/api/project',      projectRoutes);
app.use('/api/deliverynote', deliverynoteRoutes);

// ── Manejo de errores ─────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export const createHttpServer = () => {
  const server = http.createServer(app);
  initSocket(server);
  return server;
};

export default app;
