import { Router } from 'express';
import cursosRoutes from './cursos.routes.js';
import matematicasRoutes from './matematicas.routes.js';

const router = Router();

// Rutas de cursos
router.use('/cursos/programacion', cursosRoutes);
router.use('/cursos/matematicas', matematicasRoutes);

// Ruta raíz de la API
router.get('/', (req, res) => {
  res.json({
    mensaje: 'API de Cursos v1.0',
    endpoints: {
      programacion: '/api/cursos/programacion',
      matematicas: '/api/cursos/matematicas',
      health: '/health'
    }
  });
});

export default router;

