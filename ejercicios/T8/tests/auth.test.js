import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/test-db.js';

describe('Auth endpoints', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await closeTestDb(); });

  // ─── REGISTER ────────────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    test('201 → usuario creado con campos correctos', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Ada Lovelace', email: 'ada@test.com', password: 'password123',
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.user).toHaveProperty('_id');
      expect(res.body.user.name).toBe('Ada Lovelace');
      expect(res.body.user.email).toBe('ada@test.com');
      expect(res.body.user).toHaveProperty('createdAt');
    });

    test('201 → password NO expuesta en respuesta', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Ada Lovelace', email: 'ada@test.com', password: 'password123',
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.user).not.toHaveProperty('password');
      expect(JSON.stringify(res.body)).not.toContain('password123');
    });

    test('201 → password hasheada en BD con bcrypt', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Ada Lovelace', email: 'ada@test.com', password: 'password123',
      });
      const userDb = await User.findOne({ email: 'ada@test.com' });
      expect(userDb.password).not.toBe('password123');
      expect(userDb.password).toMatch(/^\$2[aby]\$/);
    });

    test('201 → rol por defecto es "user"', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Default Role', email: 'default@test.com', password: 'password123',
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.user.role).toBe('user');
    });

    test('201 → rol "admin" se asigna correctamente', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Super Admin', email: 'admin@test.com', password: 'password123', role: 'admin',
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.user.role).toBe('admin');
    });

    test('400 → email duplicado', async () => {
      const payload = { name: 'Dup', email: 'dup@test.com', password: 'password123' };
      await request(app).post('/api/auth/register').send(payload);
      const res = await request(app).post('/api/auth/register').send(payload);
      expect(res.statusCode).toBe(400);
    });

    test('400 → faltan campos (sin email)', async () => {
      const res = await request(app).post('/api/auth/register')
        .send({ name: 'Sin Email', password: 'password123' });
      expect(res.statusCode).toBe(400);
    });

    test('400 → email con formato inválido', async () => {
      const res = await request(app).post('/api/auth/register')
        .send({ name: 'Bad Email', email: 'no-es-email', password: 'password123' });
      expect(res.statusCode).toBe(400);
    });

    test('400 → password menor de 8 caracteres', async () => {
      const res = await request(app).post('/api/auth/register')
        .send({ name: 'Short Pass', email: 'short@test.com', password: '123' });
      expect(res.statusCode).toBe(400);
    });

    test('400 → rol inválido rechazado', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Bad Role', email: 'badrole@test.com', password: 'password123', role: 'superadmin',
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── LOGIN ───────────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Login User', email: 'login@test.com', password: 'password123',
      });
    });

    test('201 → devuelve token y datos de usuario', async () => {
      const res = await request(app).post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'password123' });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('login@test.com');
      expect(res.body.user).not.toHaveProperty('password');
    });

    test('201 → payload JWT contiene SOLO userId (sin role, email, name)', async () => {
      const res = await request(app).post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'password123' });
      const decoded = jwt.decode(res.body.token);
      expect(decoded).toHaveProperty('userId');
      expect(decoded).not.toHaveProperty('role');
      expect(decoded).not.toHaveProperty('email');
      expect(decoded).not.toHaveProperty('name');
    });

    test('401 → contraseña incorrecta', async () => {
      const res = await request(app).post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'wrong-password' });
      expect(res.statusCode).toBe(401);
    });

    test('401 → email no registrado', async () => {
      const res = await request(app).post('/api/auth/login')
        .send({ email: 'noexiste@test.com', password: 'password123' });
      expect(res.statusCode).toBe(401);
    });

    test('400 → sin datos de login', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── ME ──────────────────────────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    test('200 → devuelve perfil del usuario autenticado (sin password)', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Me User', email: 'me@test.com', password: 'password123',
      });
      const login = await request(app).post('/api/auth/login')
        .send({ email: 'me@test.com', password: 'password123' });
      const res = await request(app).get('/api/auth/me')
        .set('Authorization', `Bearer ${login.body.token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe('me@test.com');
      expect(res.body.user).not.toHaveProperty('password');
    });

    test('401 → sin token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
    });

    test('401 → token manipulado / inválido', async () => {
      const res = await request(app).get('/api/auth/me')
        .set('Authorization', 'Bearer token.falso.manipulado');
      expect(res.statusCode).toBe(401);
    });

    test('401 → header Authorization mal formado (sin Bearer)', async () => {
      const res = await request(app).get('/api/auth/me')
        .set('Authorization', 'NOBEARER algun-token');
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── CHANGE PASSWORD (BONUS) ─────────────────────────────────────────────

  describe('PATCH /api/auth/change-password', () => {
    let token;

    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Change Pass', email: 'change@test.com', password: 'oldpassword',
      });
      const login = await request(app).post('/api/auth/login')
        .send({ email: 'change@test.com', password: 'oldpassword' });
      token = login.body.token;
    });

    test('200 → contraseña actualizada correctamente', async () => {
      const res = await request(app).patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'oldpassword', newPassword: 'newpassword' });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/actualizada/i);
    });

    test('200 → vieja contraseña falla y nueva funciona tras el cambio', async () => {
      await request(app).patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'oldpassword', newPassword: 'newpassword' });

      const loginOld = await request(app).post('/api/auth/login')
        .send({ email: 'change@test.com', password: 'oldpassword' });
      const loginNew = await request(app).post('/api/auth/login')
        .send({ email: 'change@test.com', password: 'newpassword' });

      expect(loginOld.statusCode).toBe(401);
      expect(loginNew.statusCode).toBe(201);
    });

    test('401 → contraseña actual incorrecta', async () => {
      const res = await request(app).patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'wrong-pass', newPassword: 'newpassword' });
      expect(res.statusCode).toBe(401);
    });

    test('401 → sin token', async () => {
      const res = await request(app).patch('/api/auth/change-password')
        .send({ currentPassword: 'oldpassword', newPassword: 'newpassword' });
      expect(res.statusCode).toBe(401);
    });

    test('400 → falta newPassword', async () => {
      const res = await request(app).patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'oldpassword' });
      expect(res.statusCode).toBe(400);
    });

    test('400 → newPassword menor de 8 caracteres', async () => {
      const res = await request(app).patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'oldpassword', newPassword: '123' });
      expect(res.statusCode).toBe(400);
    });
  });
});

