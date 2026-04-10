import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import roomsRoutes from './routes/rooms.routes.js';
import { setupSocket } from './socket/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: true, message: `Ruta no encontrada: ${req.originalUrl}` });
});

// Error handler
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ error: true, message: err.message || 'Error interno del servidor' });
});

setupSocket(io);

export { app, httpServer };
