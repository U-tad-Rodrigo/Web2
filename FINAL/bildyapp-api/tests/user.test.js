import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Company from '../src/models/Company.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/test-db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Helpers de test ───────────────────────────────────────────────────────────

const BASE = '/api/user';

const registerUser = async (email = 'test@bildyapp.com', password = 'password123') => {
  const res = await request(app).post(`${BASE}/register`).send({ email, password });
  return res;
};

const getVerificationCode = async (email) => {
  const user = await User.findOne({ email }).select('+verificationCode');
  return user?.verificationCode;
};

const verifyEmail = async (token, code) =>
  request(app)
    .put(`${BASE}/validation`)
    .set('Authorization', `Bearer ${token}`)
    .send({ code });

const loginUser = async (email = 'test@bildyapp.com', password = 'password123') => {
  const res = await request(app).post(`${BASE}/login`).send({ email, password });
  return res;
};

// Registro + verificacion completa; devuelve { accessToken, refreshToken, email }
const setupVerifiedUser = async (email = 'verified@bildyapp.com', password = 'password123') => {
  const reg = await registerUser(email, password);
  const { accessToken } = reg.body.data;
  const code = await getVerificationCode(email);
  await verifyEmail(accessToken, code);
  const log = await loginUser(email, password);
  return {
    accessToken: log.body.data.accessToken,
    refreshToken: log.body.data.refreshToken,
    email,
    password,
  };
};

// Usuario verificado + datos personales + empresa; devuelve token y companyId
const setupUserWithCompany = async (
  email = 'admin@bildyapp.com',
  password = 'password123',
  cif = 'B12345678',
) => {
  const { accessToken, refreshToken } = await setupVerifiedUser(email, password);

  await request(app)
    .put(`${BASE}/register`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Ada', lastName: 'Lovelace', nif: '12345678A' });

  await request(app)
    .patch(`${BASE}/company`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ isFreelance: false, name: 'TechCorp SL', cif, address: {} });

  return { accessToken, refreshToken, email, password, cif };
};

// ── Suite principal ───────────────────────────────────────────────────────────

describe('BildyApp API — /api/user', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await closeTestDb(); });

  // ── 1) REGISTRO ─────────────────────────────────────────────────────────────

  describe('POST /api/user/register', () => {
    test('201 → crea usuario y devuelve accessToken, refreshToken y datos del user', async () => {
      const res = await registerUser();
      expect(res.statusCode).toBe(201);
      expect(res.body.error).toBe(false);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe('test@bildyapp.com');
      expect(res.body.data.user.status).toBe('pending');
      expect(res.body.data.user.role).toBe('admin');
    });

    test('201 → email se normaliza a minusculas', async () => {
      const res = await registerUser('TEST@BILDYAPP.COM');
      expect(res.statusCode).toBe(201);
      expect(res.body.data.user.email).toBe('test@bildyapp.com');
    });

    test('201 → password NO aparece en la respuesta', async () => {
      const res = await registerUser();
      expect(res.statusCode).toBe(201);
      expect(JSON.stringify(res.body)).not.toContain('password123');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    test('409 → email ya registrado y verificado devuelve CONFLICT', async () => {
      await registerUser();
      // Verificamos el email para que quede en estado verified
      const reg = await registerUser();
      const code = await getVerificationCode('test@bildyapp.com');
      await verifyEmail(reg.body.data.accessToken, code);
      // Segundo registro con el mismo email
      const res = await registerUser();
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe(true);
      expect(res.body.code).toBe('EMAIL_TAKEN');
    });

    test('400 → email invalido devuelve VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post(`${BASE}/register`)
        .send({ email: 'no-es-un-email', password: 'password123' });
      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details).toBeDefined();
    });

    test('400 → password menor de 8 caracteres devuelve VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post(`${BASE}/register`)
        .send({ email: 'test@bildyapp.com', password: 'corta' });
      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── 2) VALIDACION EMAIL ──────────────────────────────────────────────────────

  describe('PUT /api/user/validation', () => {
    test('200 → codigo correcto verifica el email', async () => {
      const reg = await registerUser();
      const { accessToken } = reg.body.data;
      const code = await getVerificationCode('test@bildyapp.com');

      const res = await verifyEmail(accessToken, code);
      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);

      // Comprueba en BD que el status cambio
      const user = await User.findOne({ email: 'test@bildyapp.com' });
      expect(user.status).toBe('verified');
    });

    test('400 → codigo incorrecto decrementa intentos y devuelve INVALID_CODE', async () => {
      const reg = await registerUser();
      const { accessToken } = reg.body.data;

      const res = await verifyEmail(accessToken, '000000');
      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_CODE');
    });

    test('429 → tres intentos fallidos devuelven NO_ATTEMPTS_LEFT', async () => {
      const reg = await registerUser();
      const { accessToken } = reg.body.data;

      await verifyEmail(accessToken, '000001');
      await verifyEmail(accessToken, '000002');
      const res = await verifyEmail(accessToken, '000003');
      expect(res.statusCode).toBe(429);
      expect(res.body.code).toBe('NO_ATTEMPTS_LEFT');
    });

    test('401 → sin token devuelve NOT_AUTHORIZED', async () => {
      const res = await request(app)
        .put(`${BASE}/validation`)
        .send({ code: '123456' });
      expect(res.statusCode).toBe(401);
    });

    test('400 → codigo con menos de 6 digitos devuelve VALIDATION_ERROR', async () => {
      const reg = await registerUser();
      const { accessToken } = reg.body.data;

      const res = await request(app)
        .put(`${BASE}/validation`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '123' });
      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── 3) LOGIN ─────────────────────────────────────────────────────────────────

  describe('POST /api/user/login', () => {
    test('200 → credenciales correctas devuelven tokens y datos del user', async () => {
      await registerUser();
      const res = await loginUser();
      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe('test@bildyapp.com');
    });

    test('401 → password incorrecta devuelve NOT_AUTHORIZED', async () => {
      await registerUser();
      const res = await request(app)
        .post(`${BASE}/login`)
        .send({ email: 'test@bildyapp.com', password: 'wrongpassword' });
      expect(res.statusCode).toBe(401);
    });

    test('401 → email inexistente devuelve NOT_AUTHORIZED', async () => {
      const res = await request(app)
        .post(`${BASE}/login`)
        .send({ email: 'noexiste@bildyapp.com', password: 'password123' });
      expect(res.statusCode).toBe(401);
    });

    test('200 → email en login se normaliza a minusculas', async () => {
      await registerUser();
      const res = await request(app)
        .post(`${BASE}/login`)
        .send({ email: 'TEST@BILDYAPP.COM', password: 'password123' });
      expect(res.statusCode).toBe(200);
    });

    test('400 → body sin email devuelve VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post(`${BASE}/login`)
        .send({ password: 'password123' });
      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── 4a) ONBOARDING — DATOS PERSONALES ────────────────────────────────────────

  describe('PUT /api/user/register (datos personales)', () => {
    test('200 → actualiza name, lastName y nif del usuario', async () => {
      const { accessToken } = await setupVerifiedUser();
      const res = await request(app)
        .put(`${BASE}/register`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Ada', lastName: 'Lovelace', nif: '12345678A' });

      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.data.user.name).toBe('Ada');
      expect(res.body.data.user.lastName).toBe('Lovelace');
      expect(res.body.data.user.nif).toBe('12345678A');
    });

    test('401 → sin token devuelve NOT_AUTHORIZED', async () => {
      const res = await request(app)
        .put(`${BASE}/register`)
        .send({ name: 'Ada', lastName: 'Lovelace', nif: '12345678A' });
      expect(res.statusCode).toBe(401);
    });

    test('400 → body vacio devuelve VALIDATION_ERROR', async () => {
      const { accessToken } = await setupVerifiedUser();
      const res = await request(app)
        .put(`${BASE}/register`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── 4b) ONBOARDING — EMPRESA ─────────────────────────────────────────────────

  describe('PATCH /api/user/company', () => {
    test('200 → CIF nuevo crea empresa y usuario queda como admin', async () => {
      const { accessToken } = await setupVerifiedUser();
      await request(app)
        .put(`${BASE}/register`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Ada', lastName: 'Lovelace', nif: '12345678A' });

      const res = await request(app)
        .patch(`${BASE}/company`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isFreelance: false, name: 'TechCorp SL', cif: 'B12345678' });

      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.data.user.company).toBeDefined();
    });

    test('200 → CIF existente el nuevo usuario se une como guest', async () => {
      // Primer usuario crea la empresa
      const first = await setupVerifiedUser('first@bildyapp.com');
      await request(app)
        .put(`${BASE}/register`)
        .set('Authorization', `Bearer ${first.accessToken}`)
        .send({ name: 'Ada', lastName: 'Lovelace', nif: '12345678A' });
      await request(app)
        .patch(`${BASE}/company`)
        .set('Authorization', `Bearer ${first.accessToken}`)
        .send({ isFreelance: false, name: 'TechCorp SL', cif: 'B99999999' });

      // Segundo usuario intenta registrar el mismo CIF
      const second = await setupVerifiedUser('second@bildyapp.com');
      const res = await request(app)
        .patch(`${BASE}/company`)
        .set('Authorization', `Bearer ${second.accessToken}`)
        .send({ isFreelance: false, name: 'TechCorp SL', cif: 'B99999999' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.role).toBe('guest');
    });

    test('200 → autonomo crea empresa con su propio NIF', async () => {
      const { accessToken } = await setupVerifiedUser();
      await request(app)
        .put(`${BASE}/register`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Carlos', lastName: 'Dev', nif: '87654321B' });

      const res = await request(app)
        .patch(`${BASE}/company`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isFreelance: true });

      expect(res.statusCode).toBe(200);
      const company = await Company.findById(res.body.data.user.company._id);
      expect(company.isFreelance).toBe(true);
      expect(company.cif).toBe('87654321B');
    });

    test('401 → sin token devuelve NOT_AUTHORIZED', async () => {
      const res = await request(app)
        .patch(`${BASE}/company`)
        .send({ isFreelance: false, name: 'Test', cif: 'B00000001' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── 5) LOGO DE LA COMPANIA ──────────────────────────────────────────────────

  describe('PATCH /api/user/logo', () => {
    test('200 → sube el logo y actualiza Company.logo', async () => {
      const { accessToken } = await setupUserWithCompany();

      // Buffer de imagen PNG minima valida (1x1 px, RGB)
      const pngBuffer = Buffer.from(
        '89504e470d0a1a0a0000000d4948445200000001000000010802000000' +
        '907753de00000000c49444154789c6260000000000200e221bc33000000' +
        '0049454e44ae426082',
        'hex',
      );

      const res = await request(app)
        .patch(`${BASE}/logo`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('logo', pngBuffer, { filename: 'logo.png', contentType: 'image/png' });

      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.data.company.logo).toBeDefined();
      expect(res.body.data.company.logo).toMatch(/^\/uploads\//);
    });

    test('400 → sin archivo devuelve NO_FILE', async () => {
      const { accessToken } = await setupUserWithCompany();
      const res = await request(app)
        .patch(`${BASE}/logo`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_FILE');
    });

    test('400 → usuario sin empresa devuelve NO_COMPANY', async () => {
      // Usuario verificado pero sin empresa asignada
      const { accessToken } = await setupVerifiedUser('nocompany@bildyapp.com');

      const pngBuffer = Buffer.from(
        '89504e470d0a1a0a0000000d4948445200000001000000010802000000' +
        '907753de00000000c49444154789c6260000000000200e221bc33000000' +
        '0049454e44ae426082',
        'hex',
      );

      const res = await request(app)
        .patch(`${BASE}/logo`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('logo', pngBuffer, { filename: 'logo.png', contentType: 'image/png' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_COMPANY');
    });

    test('401 → sin token devuelve NOT_AUTHORIZED', async () => {
      const res = await request(app).patch(`${BASE}/logo`);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/user', () => {
    test('200 → devuelve usuario con company populada y fullName', async () => {
      const { accessToken } = await setupUserWithCompany();

      const res = await request(app)
        .get(`${BASE}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.data.user).toHaveProperty('email');
      // fullName virtual
      expect(res.body.data.user).toHaveProperty('fullName');
      expect(res.body.data.user.fullName).toBe('Ada Lovelace');
      // company populada (objeto, no ObjectId)
      expect(typeof res.body.data.user.company).toBe('object');
      expect(res.body.data.user.company).toHaveProperty('cif');
    });

    test('401 → sin token devuelve NOT_AUTHORIZED', async () => {
      const res = await request(app).get(`${BASE}`);
      expect(res.statusCode).toBe(401);
    });
  });

  // ── 7a) REFRESH TOKEN ────────────────────────────────────────────────────────

  describe('POST /api/user/refresh', () => {
    test('200 → refresh token valido devuelve nuevo accessToken y refreshToken', async () => {
      const { refreshToken } = await setupVerifiedUser();
      const res = await request(app)
        .post(`${BASE}/refresh`)
        .send({ refreshToken });

      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    test('401 → refresh token invalido devuelve INVALID_REFRESH_TOKEN', async () => {
      const res = await request(app)
        .post(`${BASE}/refresh`)
        .send({ refreshToken: 'token-inventado-invalido' });
      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('INVALID_REFRESH_TOKEN');
    });

    test('400 → sin refreshToken en body devuelve VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post(`${BASE}/refresh`)
        .send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── 7b) LOGOUT ───────────────────────────────────────────────────────────────

  describe('POST /api/user/logout', () => {
    test('200 → cierra sesion correctamente', async () => {
      const { accessToken } = await setupVerifiedUser();
      const res = await request(app)
        .post(`${BASE}/logout`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);

      // El refreshToken debe haber sido eliminado de la BD
      const user = await User.findOne({ email: 'verified@bildyapp.com' }).select('+refreshToken');
      expect(user.refreshToken).toBeUndefined();
    });

    test('401 → sin token devuelve NOT_AUTHORIZED', async () => {
      const res = await request(app).post(`${BASE}/logout`);
      expect(res.statusCode).toBe(401);
    });
  });

  // ── 8) ELIMINAR USUARIO ──────────────────────────────────────────────────────

  describe('DELETE /api/user', () => {
    test('200 → hard delete elimina el documento de la BD', async () => {
      const { accessToken } = await setupVerifiedUser();
      const res = await request(app)
        .delete(`${BASE}?soft=false`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('hard');

      const userInDb = await User.findOne({ email: 'verified@bildyapp.com' });
      expect(userInDb).toBeNull();
    });

    test('200 → soft delete marca deleted:true pero mantiene el documento', async () => {
      const { accessToken } = await setupVerifiedUser();
      const res = await request(app)
        .delete(`${BASE}?soft=true`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('soft');

      const userInDb = await User.findOne({ email: 'verified@bildyapp.com' });
      expect(userInDb).not.toBeNull();
      expect(userInDb.deleted).toBe(true);
    });

    test('401 → sin token devuelve NOT_AUTHORIZED', async () => {
      const res = await request(app).delete(`${BASE}`);
      expect(res.statusCode).toBe(401);
    });
  });

  // ── 9) CAMBIAR CONTRASENA (Bonus) ────────────────────────────────────────────

  describe('PUT /api/user/password', () => {
    test('200 → cambia la contrasena correctamente', async () => {
      const { accessToken } = await setupVerifiedUser();
      const res = await request(app)
        .put(`${BASE}/password`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'password123', newPassword: 'newpass456' });

      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);

      // Verificar que la nueva contrasena funciona en login
      const login = await loginUser('verified@bildyapp.com', 'newpass456');
      expect(login.statusCode).toBe(200);
    });

    test('400 → nueva contrasena igual a la actual devuelve VALIDATION_ERROR (Zod refine)', async () => {
      const { accessToken } = await setupVerifiedUser();
      const res = await request(app)
        .put(`${BASE}/password`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'password123', newPassword: 'password123' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    test('400 → contrasena actual incorrecta devuelve WRONG_PASSWORD', async () => {
      const { accessToken } = await setupVerifiedUser();
      const res = await request(app)
        .put(`${BASE}/password`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'incorrecta', newPassword: 'newpass456' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('WRONG_PASSWORD');
    });

    test('401 → sin token devuelve NOT_AUTHORIZED', async () => {
      const res = await request(app)
        .put(`${BASE}/password`)
        .send({ currentPassword: 'password123', newPassword: 'newpass456' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── 10) INVITAR COMPANERO ────────────────────────────────────────────────────

  describe('POST /api/user/invite', () => {
    test('201 → admin invita a un nuevo usuario con el mismo company', async () => {
      const { accessToken } = await setupUserWithCompany();
      const res = await request(app)
        .post(`${BASE}/invite`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'invitado@bildyapp.com', name: 'Invitado', lastName: 'Test' });

      expect(res.statusCode).toBe(201);
      expect(res.body.error).toBe(false);
      expect(res.body.data.user.email).toBe('invitado@bildyapp.com');
      expect(res.body.data.user.role).toBe('guest');
      expect(res.body.data.user.company).toBeDefined();
    });

    test('403 → usuario guest no puede invitar', async () => {
      // Crear admin con empresa
      const admin = await setupUserWithCompany('admin@bildyapp.com', 'password123', 'B11111111');

      // Crear segundo usuario que se une como guest
      const guestReg = await setupVerifiedUser('guest@bildyapp.com');
      await request(app)
        .patch(`${BASE}/company`)
        .set('Authorization', `Bearer ${guestReg.accessToken}`)
        .send({ isFreelance: false, name: 'TechCorp SL', cif: 'B11111111' });
      const guestLogin = await loginUser('guest@bildyapp.com', 'password123');
      const guestToken = guestLogin.body.data.accessToken;

      const res = await request(app)
        .post(`${BASE}/invite`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ email: 'otro@bildyapp.com' });

      expect(res.statusCode).toBe(403);
    });

    test('409 → email ya existente devuelve EMAIL_TAKEN', async () => {
      const { accessToken } = await setupUserWithCompany();
      // Registrar primero ese email
      await registerUser('ya-existe@bildyapp.com');

      const res = await request(app)
        .post(`${BASE}/invite`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'ya-existe@bildyapp.com' });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('EMAIL_TAKEN');
    });

    test('401 → sin token devuelve NOT_AUTHORIZED', async () => {
      const res = await request(app)
        .post(`${BASE}/invite`)
        .send({ email: 'alguien@bildyapp.com' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── VALIDACION: email ya verificado ─────────────────────────────────────────

  describe('PUT /api/user/validation — casos adicionales', () => {
    test('400 → intentar verificar un email ya verificado devuelve ALREADY_VERIFIED', async () => {
      const reg = await registerUser();
      const { accessToken } = reg.body.data;
      const code = await getVerificationCode('test@bildyapp.com');

      // Primera verificacion (correcta)
      await verifyEmail(accessToken, code);

      // Segunda verificacion (ya verificado)
      const res = await verifyEmail(accessToken, code);
      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('ALREADY_VERIFIED');
    });
  });

  // ── AUTH MIDDLEWARE — token expirado / invalido ───────────────────────────────

  describe('Auth middleware — tokens invalidos', () => {
    test('401 → token mal formado en Authorization devuelve NOT_AUTHORIZED', async () => {
      const res = await request(app)
        .get(`${BASE}`)
        .set('Authorization', 'Bearer token-completamente-invalido');
      expect(res.statusCode).toBe(401);
    });

    test('401 → header Authorization sin "Bearer " devuelve NOT_AUTHORIZED', async () => {
      const res = await request(app)
        .get(`${BASE}`)
        .set('Authorization', 'sinSchemaToken');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── ERROR HANDLER — rutas y errores genericos ────────────────────────────────

  describe('Error handler y middleware de ruta', () => {
    test('404 → ruta bajo /api que no existe devuelve 404', async () => {
      const res = await request(app).get('/api/user/ruta-inventada');
      expect(res.statusCode).toBe(404);
    });
  });

  // ── AUTONOMO SIN NIF — branch MISSING_PERSONAL_DATA ─────────────────────────

  describe('PATCH /api/user/company — freelance sin NIF', () => {
    test('400 → autonomo sin NIF devuelve MISSING_PERSONAL_DATA', async () => {
      // Usuario verificado pero sin NIF en perfil
      const { accessToken } = await setupVerifiedUser('nif-missing@bildyapp.com');

      const res = await request(app)
        .patch(`${BASE}/company`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isFreelance: true });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_PERSONAL_DATA');
    });
  });

  describe('GET /health', () => {
    test('200 → endpoint de salud responde ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // ── 404 ──────────────────────────────────────────────────────────────────────

  describe('Ruta inexistente', () => {
    test('404 → ruta desconocida devuelve NOT_FOUND', async () => {
      const res = await request(app).get('/api/ruta-inexistente');
      expect(res.statusCode).toBe(404);
    });
  });
});



