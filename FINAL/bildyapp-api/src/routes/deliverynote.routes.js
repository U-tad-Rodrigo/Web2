import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate }     from '../middleware/validate.js';
import { upload }       from '../middleware/upload.js';
import { createDeliveryNoteSchema } from '../validators/deliverynote.validator.js';
import {
  createDeliveryNote, listDeliveryNotes, getDeliveryNote,
  downloadPdf, signDeliveryNote, deleteDeliveryNote
} from '../controllers/deliverynote.controller.js';

const router = Router();

router.use(authenticate);

// Rutas estáticas antes de /:id — pdf/:id debe ir antes de /:id
router.get('/pdf/:id', downloadPdf);

router.post('/',           validate(createDeliveryNoteSchema), createDeliveryNote);
router.get('/',            listDeliveryNotes);
router.get('/:id',         getDeliveryNote);
router.patch('/:id/sign',  upload.single('signature'), signDeliveryNote);
router.delete('/:id',      deleteDeliveryNote);

export default router;
