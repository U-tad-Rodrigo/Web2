import { Router } from 'express';
import authMiddleware from '../middleware/session.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  loginCtrl,
  logoutCtrl,
  meCtrl,
  refreshCtrl,
  registerCtrl,
  revokeAllTokensCtrl
} from '../controllers/auth.controller.js';
import { loginSchema, refreshSchema, registerSchema } from '../schemas/auth.schema.js';

const router = Router();

router.post('/register', validate(registerSchema), registerCtrl);
router.post('/login', validate(loginSchema), loginCtrl);
router.post('/refresh', validate(refreshSchema), refreshCtrl);
router.post('/logout', validate(refreshSchema), logoutCtrl);
router.get('/me', authMiddleware, meCtrl);
router.post('/logout-all', authMiddleware, revokeAllTokensCtrl);

export default router;

