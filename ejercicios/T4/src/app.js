import express from 'express';
import { logger } from './middleware/logger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import todosRoutes from './routes/todos.routes.js';

const app = express();

app.use(express.json());
app.use(logger);
app.use(rateLimiter);

app.get('/api', (req, res) => {
  res.json({
    mensaje: 'Todo API con Express y Zod',
    version: '1.0.0',
    endpoints: {
      listar: 'GET /api/todos',
      obtener: 'GET /api/todos/:id',
      crear: 'POST /api/todos',
      actualizar: 'PUT /api/todos/:id',
      eliminar: 'DELETE /api/todos/:id',
      toggle: 'PATCH /api/todos/:id/toggle',
      stats: 'GET /api/todos/stats'
    }
  });
});

// Rutas de todos
app.use('/api/todos', todosRoutes);

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    mensaje: `No existe ${req.method} ${req.url}`
  });
});

// Manejo de errores
app.use(errorHandler);

export default app;
