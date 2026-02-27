import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

const app = express();

// Middleware globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (carátulas)
app.use('/uploads', express.static('storage'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas de la API
app.use('/api', routes);

// Manejo de errores
app.use(notFound);
app.use(errorHandler);

export default app;
