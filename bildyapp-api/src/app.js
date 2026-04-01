import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sanitize as mongoSanitize } from 'express-mongo-sanitize';
import { notFound, errorHandler } from './middleware/error-handler.js';

const app = express();

// ── Seguridad ─────────────────────────────────────────────────────────────────
app.use(helmet());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: true, code: 'RATE_LIMIT', message: 'Demasiadas peticiones, inténtalo más tarde' }
  })
);

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

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Rutas API (se añadirán en fases posteriores) ──────────────────────────────
// app.use('/api/user', userRoutes);

// ── Manejo de errores ─────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;

