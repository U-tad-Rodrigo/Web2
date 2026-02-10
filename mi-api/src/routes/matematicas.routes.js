import { Router } from 'express';
import * as matematicasController from '../controllers/matematicas.controller.js';
import { validate } from '../middleware/validateRequest.js';
import {
  createMatematicaSchema,
  updateMatematicaSchema,
  partialUpdateMatematicaSchema,
  idParamSchema
} from '../schemas/matematicas.schema.js';

const router = Router();

router.get('/', matematicasController.getAll);
router.get('/:id', validate(idParamSchema), matematicasController.getById);
router.post('/', validate(createMatematicaSchema), matematicasController.create);
router.put('/:id', validate(updateMatematicaSchema), matematicasController.update);
router.patch('/:id', validate(partialUpdateMatematicaSchema), matematicasController.partialUpdate);
router.delete('/:id', validate(idParamSchema), matematicasController.remove);

export default router;

