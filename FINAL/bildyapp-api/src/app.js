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
import dashboardRoutes    from './routes/dashboard.routes.js';
import { initSocket } from './services/socket.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ── Trust proxy ───────────────────────────────────────────────────────────────
// Railway/Heroku/cualquier PaaS pone un proxy delante; sin esto el rate-limit
// no sabe la IP real del cliente y Express loguea ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
// '1' = confiamos en un solo hop (el load balancer del PaaS).
app.set('trust proxy', 1);

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

// ── Sanitización NoSQL ────────────────────────────────────────────────────────
// req.body es asignable → reemplazo limpio con mongoSanitize.
// req.query en Express 5 es getter read-only, pero el OBJETO devuelto sí es
// mutable: borramos in-place las claves con $ o . (lo mismo que hace
// mongo-sanitize por debajo) para neutralizar inyección NoSQL desde la URL.
const stripDangerousKeys = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (obj[key] && typeof obj[key] === 'object') {
      stripDangerousKeys(obj[key]);
    }
  }
};

app.use((req, _res, next) => {
  if (req.body)  req.body = mongoSanitize(req.body);
  if (req.query) stripDangerousKeys(req.query);
  next();
});

// ── Archivos estáticos — logos subidos con Multer ─────────────────────────────
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ── Swagger UI ────────────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'BildyApp API Docs',
}));

// ── Index — html→swagger UI, json→landing con punteros ─────────────────────
// Navegador (Accept: text/html) entra directo a Swagger; curl/Postman recibe JSON.
const indexJson = {
  name: 'BildyApp API',
  version: '2.0.0',
  docs: '/api-docs',
  health: '/health',
  endpoints: {
    auth:          ['POST /api/user/register', 'POST /api/user/login', 'POST /api/user/refresh'],
    clients:       'GET|POST|PUT|DELETE /api/client',
    projects:      'GET|POST|PUT|DELETE /api/project',
    deliveryNotes: 'GET|POST|PATCH|DELETE /api/deliverynote',
    dashboard:     'GET /api/dashboard',
  },
};
app.get('/', (req, res) => {
  res.format({
    html: () => res.redirect('/api-docs'),
    json: () => res.json(indexJson),
    default: () => res.json(indexJson),
  });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const db = dbState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    db,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Rutas API ─────────────────────────────────────────────────────────────────
app.use('/api/user',         userRoutes);
app.use('/api/client',       clientRoutes);
app.use('/api/project',      projectRoutes);
app.use('/api/deliverynote', deliverynoteRoutes);
app.use('/api/dashboard',    dashboardRoutes);

// ── Manejo de errores ─────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export const createHttpServer = () => {
  const server = http.createServer(app);
  initSocket(server);
  return server;
};

export default app;
