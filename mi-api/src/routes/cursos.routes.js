import { Router } from 'express';
import * as cursosController from '../controllers/cursos.controller.js';
import { validate } from '../middleware/validateRequest.js';
import {
  createCursoSchema,
  updateCursoSchema,
  partialUpdateCursoSchema,
  idParamSchema
} from '../schemas/cursos.schema.js';

const router = Router();

router.get('/', cursosController.getAll);
router.get('/:id', validate(idParamSchema), cursosController.getById);
router.post('/', validate(createCursoSchema), cursosController.create);
router.put('/:id', validate(updateCursoSchema), cursosController.update);
router.patch('/:id', validate(partialUpdateCursoSchema), cursosController.partialUpdate);
router.delete('/:id', validate(idParamSchema), cursosController.remove);

export default router;

