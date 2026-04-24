import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate }     from '../middleware/validate.js';
import { createClientSchema, updateClientSchema } from '../validators/client.validator.js';
import {
  createClient, updateClient, listClients,
  listArchivedClients, getClient, deleteClient, restoreClient
} from '../controllers/client.controller.js';

const router = Router();

router.use(authenticate);

// Rutas estáticas antes de /:id para evitar conflictos de matching
router.get('/archived', listArchivedClients);

router.post('/',           validate(createClientSchema), createClient);
router.get('/',            listClients);
router.get('/:id',         getClient);
router.put('/:id',         validate(updateClientSchema), updateClient);
router.delete('/:id',      deleteClient);
router.patch('/:id/restore', restoreClient);

export default router;
