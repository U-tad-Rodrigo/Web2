import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomInt, randomBytes, createHash } from 'node:crypto';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { AppError } from '../utils/AppError.js';
import { notificationService } from '../services/notification.service.js';
import { sendVerificationEmail, sendInviteEmail } from '../services/mail.service.js';
import { uploadImage } from '../services/cloudinary.service.js';

// ── Helpers privados ──────────────────────────────────────────────────────────

const generateTokens = (userId) => {
  const secret = process.env.JWT_SECRET;
  const accessToken = jwt.sign({ id: userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });
  const days = parseInt(process.env.REFRESH_TOKEN_DAYS || '7', 10);
  const refreshToken = jwt.sign({ id: userId }, secret, {
    expiresIn: `${days}d`
  });
  return { accessToken, refreshToken };
};

// SHA-256 del token — evita guardar el valor raw en BD
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

const generateVerificationCode = () =>
  String(randomInt(100000, 1000000));

// ── 1) Registro ───────────────────────────────────────────────────────────────
// POST /api/user/register
export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Si ya existe un usuario VERIFICADO con ese email → 409
    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.status === 'verified') {
        return next(AppError.conflict('Ya existe una cuenta verificada con ese email', 'EMAIL_TAKEN'));
      }
      // Si existe pero no verificado lo reemplazamos (nuevo intento de registro)
      await User.deleteOne({ _id: existing._id });
    }

    const hashedPassword    = await bcrypt.hash(password, 12);
    const verificationCode  = generateVerificationCode();

    const user = await User.create({
      email,
      password:             hashedPassword,
      verificationCode,
      verificationAttempts: 3,
      role:                 'admin',
      status:               'pending'
    });

    const { accessToken, refreshToken } = generateTokens(user._id);

    await User.findByIdAndUpdate(user._id, { refreshToken: hashToken(refreshToken) });

    notificationService.emit('user:registered', { email });
    sendVerificationEmail(email, verificationCode).catch(console.error);

    return res.status(201).json({
      error: false,
      data: {
        user:         { email: user.email, status: user.status, role: user.role },
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(AppError.conflict('Ya existe una cuenta verificada con ese email', 'EMAIL_TAKEN'));
    }
    next(err);
  }
};

// ── 2) Validacion del email ───────────────────────────────────────────────────
// PUT /api/user/validation  (requiere JWT)
export const validateEmail = async (req, res, next) => {
  try {
    const { code } = req.body;

    // Cargamos los campos ocultos explicitamente
    const user = await User.findById(req.user._id)
      .select('+verificationCode +verificationAttempts');

    if (!user) return next(AppError.notFound('Usuario no encontrado'));

    if (user.status === 'verified') {
      return next(AppError.badRequest('El email ya ha sido verificado', 'ALREADY_VERIFIED'));
    }

    if (user.verificationAttempts <= 0) {
      return next(AppError.tooManyRequests('Has agotado los intentos de verificacion', 'NO_ATTEMPTS_LEFT'));
    }

    if (user.verificationCode !== code) {
      // Decrementa intentos y guarda
      await User.findByIdAndUpdate(user._id, {
        $inc: { verificationAttempts: -1 }
      });

      const remaining = user.verificationAttempts - 1;

      if (remaining <= 0) {
        return next(AppError.tooManyRequests('Has agotado los intentos de verificacion', 'NO_ATTEMPTS_LEFT'));
      }

      return next(
        AppError.badRequest(
          `Codigo incorrecto. Te quedan ${remaining} intentos`,
          'INVALID_CODE'
        )
      );
    }

    // Codigo correcto: verificar y limpiar campos de verificacion
    await User.findByIdAndUpdate(user._id, {
      $set:   { status: 'verified' },
      $unset: { verificationCode: '', verificationAttempts: '' }
    });

    notificationService.emit('user:verified', { email: user.email });

    return res.json({ error: false, message: 'Email verificado correctamente' });
  } catch (err) {
    next(err);
  }
};

// ── 3) Login ──────────────────────────────────────────────────────────────────
// POST /api/user/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Cargamos password (select:false) explicitamente
    const user = await User.findOne({ email, deleted: false }).select('+password');

    // Mensaje generico para no revelar si el email existe o no
    if (!user) {
      return next(AppError.unauthorized('Credenciales incorrectas'));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(AppError.unauthorized('Credenciales incorrectas'));
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    await User.findByIdAndUpdate(user._id, { refreshToken: hashToken(refreshToken) });

    return res.json({
      error: false,
      data: {
        user:         { email: user.email, status: user.status, role: user.role },
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    next(err);
  }
};

// ── 4a) Onboarding: datos personales ─────────────────────────────────────────
// PUT /api/user/register  (requiere JWT)
export const updatePersonalData = async (req, res, next) => {
  try {
    const { name, lastName, nif, address } = req.body;

    const updateFields = { name, lastName, nif };
    if (address) updateFields.address = address;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('company');

    if (!user) return next(AppError.notFound('Usuario no encontrado'));

    return res.json({ error: false, data: { user } });
  } catch (err) {
    next(err);
  }
};

// ── 4b) Onboarding: datos de compania ────────────────────────────────────────
// PATCH /api/user/company  (requiere JWT)
export const updateCompany = async (req, res, next) => {
  try {
    const { isFreelance, name, cif, address } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return next(AppError.notFound('Usuario no encontrado'));

    let company;

    if (isFreelance) {
      // Autonomo: usa los datos personales del usuario como empresa
      if (!user.nif) {
        return next(
          AppError.badRequest(
            'Completa tus datos personales (NIF) antes de continuar como autonomo',
            'MISSING_PERSONAL_DATA'
          )
        );
      }

      company = await Company.create({
        owner:       user._id,
        name:        name || user.name,
        cif:         user.nif,
        address:     address || user.address,
        isFreelance: true
      });

      user.role = 'admin';
    } else {
      // Empresa regular
      const existingCompany = await Company.findOne({ cif, deleted: false });

      if (!existingCompany) {
        // CIF nuevo: crear empresa, el usuario es owner y admin
        company = await Company.create({
          owner:       user._id,
          name,
          cif,
          address,
          isFreelance: false
        });
        user.role = 'admin';
      } else {
        // CIF ya registrado: el usuario se une como guest
        company    = existingCompany;
        user.role  = 'guest';
      }
    }

    user.company = company._id;
    await user.save();

    const populatedUser = await User.findById(user._id).populate('company');

    return res.json({ error: false, data: { user: populatedUser } });
  } catch (err) {
    next(err);
  }
};

// ── 5) Logo de la compania ────────────────────────────────────────────────────
// PATCH /api/user/logo  (requiere JWT + multer)
export const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(AppError.badRequest('No se ha subido ningun archivo', 'NO_FILE'));
    }

    const user = await User.findById(req.user._id);
    if (!user) return next(AppError.notFound('Usuario no encontrado'));

    if (!user.company) {
      return next(AppError.badRequest('El usuario no tiene empresa asignada', 'NO_COMPANY'));
    }

    // Sube a Cloudinary si está configurado, si no usa URL local
    const cloudUrl = await uploadImage(req.file.path, 'logos');
    const logoUrl  = cloudUrl ?? `/uploads/${req.file.filename}`;

    const company = await Company.findByIdAndUpdate(
      user.company,
      { logo: logoUrl },
      { new: true }
    );

    if (!company) return next(AppError.notFound('Empresa no encontrada'));

    return res.json({ error: false, data: { company } });
  } catch (err) {
    next(err);
  }
};

// ── 6) Obtener usuario ────────────────────────────────────────────────────────
// GET /api/user  (requiere JWT)
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('company');

    if (!user || user.deleted) {
      return next(AppError.notFound('Usuario no encontrado'));
    }

    return res.json({ error: false, data: { user } });
  } catch (err) {
    next(err);
  }
};

// ── 7a) Refresh token ─────────────────────────────────────────────────────────
// POST /api/user/refresh
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(AppError.unauthorized('Refresh token invalido o expirado', 'INVALID_REFRESH_TOKEN'));
    }

    // Cargamos refreshToken (select:false) para comparar con el almacenado
    const user = await User.findById(payload.id).select('+refreshToken');

    if (!user || user.deleted || user.refreshToken !== hashToken(token)) {
      return next(AppError.unauthorized('Refresh token invalido', 'INVALID_REFRESH_TOKEN'));
    }

    // Rotacion: generamos nuevo par de tokens
    const { accessToken, refreshToken: newRefresh } = generateTokens(user._id);

    await User.findByIdAndUpdate(user._id, { refreshToken: hashToken(newRefresh) });

    return res.json({ error: false, data: { accessToken, refreshToken: newRefresh } });
  } catch (err) {
    next(err);
  }
};

// ── 7b) Logout ────────────────────────────────────────────────────────────────
// POST /api/user/logout  (requiere JWT)
export const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: '' } });

    return res.json({ error: false, message: 'Sesion cerrada correctamente' });
  } catch (err) {
    next(err);
  }
};

// ── 8) Eliminar usuario ───────────────────────────────────────────────────────
// DELETE /api/user?soft=true  (requiere JWT)
export const deleteUser = async (req, res, next) => {
  try {
    const soft = req.query.soft === 'true';

    const user = await User.findById(req.user._id);
    if (!user) return next(AppError.notFound('Usuario no encontrado'));

    if (soft) {
      await user.softDelete();
    } else {
      await User.findByIdAndDelete(req.user._id);
    }

    notificationService.emit('user:deleted', { email: user.email, soft });

    return res.json({
      error:   false,
      message: `Usuario eliminado correctamente (${soft ? 'soft' : 'hard'})`
    });
  } catch (err) {
    next(err);
  }
};

// ── 9) Cambiar contrasena (Bonus) ─────────────────────────────────────────────
// PUT /api/user/password  (requiere JWT)
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return next(AppError.notFound('Usuario no encontrado'));

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return next(AppError.badRequest('La contrasena actual es incorrecta', 'WRONG_PASSWORD'));
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.json({ error: false, message: 'Contrasena actualizada correctamente' });
  } catch (err) {
    next(err);
  }
};

// ── 10) Invitar companero ─────────────────────────────────────────────────────
// POST /api/user/invite  (requiere JWT + rol admin)
export const inviteUser = async (req, res, next) => {
  try {
    const { email, name, lastName } = req.body;
    const inviter = req.user;

    if (!inviter.company) {
      return next(AppError.badRequest('Debes tener una empresa para poder invitar', 'NO_COMPANY'));
    }

    const existing = await User.findOne({ email, deleted: false });
    if (existing) {
      return next(AppError.conflict('Ya existe un usuario con ese email', 'EMAIL_TAKEN'));
    }

    // Contrasena temporal aleatoria segura (el invitado debera cambiarla)
    const tempPassword    = randomBytes(12).toString('base64url') + 'Aa1!';
    const hashedPassword  = await bcrypt.hash(tempPassword, 12);
    const verificationCode = generateVerificationCode();

    const newUser = await User.create({
      email,
      password:             hashedPassword,
      name:                 name     || '',
      lastName:             lastName || '',
      role:                 'guest',
      status:               'pending',
      company:              inviter.company,
      verificationCode,
      verificationAttempts: 3
    });

    notificationService.emit('user:invited', {
      email,
      invitedBy: inviter.email
    });
    sendInviteEmail(email, {
      invitedBy: inviter.email,
      tempPassword,
      verificationCode,
    }).catch(console.error);

    return res.status(201).json({
      error: false,
      data: {
        user: {
          email:   newUser.email,
          role:    newUser.role,
          status:  newUser.status,
          company: newUser.company
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

