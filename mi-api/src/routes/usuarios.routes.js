import { Router } from 'express';
import * as usuariosController from '../controllers/usuarios.controller.js';
import { validate } from '../middleware/validateRequest.js';
import {
  createUsuarioSchema,
  updateUsuarioSchema,
  idParamSchema
} from '../schemas/usuarios.schema.js';

const router = Router();

// Rutas CRUD
router.get('/', usuariosController.obtenerUsuarios);

router.get('/:id',
  validate(idParamSchema),
  usuariosController.obtenerUsuarioPorId
);

router.post('/',
  validate(createUsuarioSchema),
  usuariosController.crearUsuario
);

router.put('/:id',
  validate(updateUsuarioSchema),
  usuariosController.actualizarUsuario
);

router.delete('/:id',
  validate(idParamSchema),
  usuariosController.eliminarUsuario
);

export default router;
