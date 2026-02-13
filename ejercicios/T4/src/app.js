import express from 'express';
import { logger } from './middleware/logger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import todosRoutes from './routes/todos.routes.js';

const app = express();

// Middleware global
app.use(express.json());
app.use(logger);
app.use(rateLimiter);

// Rutas
app.use('/api/todos', todosRoutes);

// Manejo de errores
app.use(errorHandler);

export default app;
