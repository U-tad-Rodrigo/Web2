import { Router } from 'express';
import * as cursosController from '../controllers/cursos.controller.js';
import { validate } from '../middleware/validateRequest.js';
import {
  createCursoSchema,
  updateCursoSchema,
  idParamSchema
} from '../schemas/cursos.schema.js';

const router = Router();

// Rutas CRUD
router.get('/', cursosController.obtenerCursos);

router.get('/:id',
  validate(idParamSchema),
  cursosController.obtenerCursoPorId
);

router.post('/',
  validate(createCursoSchema),
  cursosController.crearCurso
);

router.put('/:id',
  validate(updateCursoSchema),
  cursosController.actualizarCurso
);

router.delete('/:id',
  validate(idParamSchema),
  cursosController.eliminarCurso
);

export default router;
