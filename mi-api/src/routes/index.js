import { Router } from 'express';
import cursosRoutes from './cursos.routes.js';
import usuariosRoutes from './usuarios.routes.js';

const router = Router();

router.use('/cursos', cursosRoutes);
router.use('/usuarios', usuariosRoutes);

router.get('/', (req, res) => {
  res.json({
    mensaje: 'API de Cursos y Usuarios v1.0',
    endpoints: {
      usuarios: '/api/usuarios',
      cursos: '/api/cursos'
    }
  });
});

export default router;
