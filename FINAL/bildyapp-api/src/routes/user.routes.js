import { Router } from 'express';

import { authenticate }    from '../middleware/auth.middleware.js';
import { authorize }       from '../middleware/role.middleware.js';
import { validate }        from '../middleware/validate.js';
import { upload }          from '../middleware/upload.js';

import {
  registerSchema,
  verificationSchema,
  loginSchema,
  personalDataSchema,
  companySchema,
  refreshSchema,
  inviteSchema,
  changePasswordSchema
} from '../validators/user.validator.js';

import {
  register,
  validateEmail,
  login,
  updatePersonalData,
  updateCompany,
  uploadLogo,
  getUser,
  refreshToken,
  logout,
  deleteUser,
  changePassword,
  inviteUser
} from '../controllers/user.controller.js';

const router = Router();

// ── Publicas (sin JWT) ────────────────────────────────────────────────────────
router.post('/register',  validate(registerSchema),  register);
router.post('/login',     validate(loginSchema),     login);
router.post('/refresh',   validate(refreshSchema),   refreshToken);

// ── Requieren JWT ─────────────────────────────────────────────────────────────
router.put('/validation', authenticate, validate(verificationSchema), validateEmail);
router.put('/register',   authenticate, validate(personalDataSchema), updatePersonalData);
router.patch('/company',  authenticate, validate(companySchema),      updateCompany);
router.patch('/logo',     authenticate, upload.single('logo'),        uploadLogo);
router.get('/',           authenticate,                               getUser);
router.post('/logout',    authenticate,                               logout);
router.delete('/',        authenticate,                               deleteUser);

// ── Bonus ─────────────────────────────────────────────────────────────────────
router.put('/password',   authenticate, validate(changePasswordSchema), changePassword);
router.post('/invite',    authenticate, authorize('admin'), validate(inviteSchema), inviteUser);

export default router;

