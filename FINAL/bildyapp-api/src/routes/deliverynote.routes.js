import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate }     from '../middleware/validate.js';
import { validateId }   from '../middleware/validate-id.js';
import { upload }       from '../middleware/upload.js';
import { createDeliveryNoteSchema } from '../validators/deliverynote.validator.js';
import {
  createDeliveryNote, listDeliveryNotes, getDeliveryNote,
  downloadPdf, signDeliveryNote, deleteDeliveryNote
} from '../controllers/deliverynote.controller.js';

const router = Router();

router.use(authenticate);

// Rutas estáticas antes de /:id — pdf/:id debe ir antes de /:id
router.get('/pdf/:id', validateId(), downloadPdf);

router.post('/',           validate(createDeliveryNoteSchema),               createDeliveryNote);
router.get('/',            listDeliveryNotes);
router.get('/:id',         validateId(),                                     getDeliveryNote);
router.patch('/:id/sign',  validateId(), upload.single('signature'),         signDeliveryNote);
router.delete('/:id',      validateId(),                                     deleteDeliveryNote);

export default router;
