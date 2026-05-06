import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate }     from '../middleware/validate.js';
import { validateId }   from '../middleware/validate-id.js';
import { createClientSchema, updateClientSchema } from '../validators/client.validator.js';
import {
  createClient, updateClient, listClients,
  listArchivedClients, getClient, deleteClient, restoreClient
} from '../controllers/client.controller.js';

const router = Router();

router.use(authenticate);

// Rutas estáticas antes de /:id para evitar conflictos de matching
router.get('/archived', listArchivedClients);

router.post('/',                  validate(createClientSchema),                createClient);
router.get('/',                   listClients);
router.get('/:id',                validateId(),                                getClient);
router.put('/:id',                validateId(), validate(updateClientSchema), updateClient);
router.delete('/:id',             validateId(),                                deleteClient);
router.patch('/:id/restore',      validateId(),                                restoreClient);

export default router;
