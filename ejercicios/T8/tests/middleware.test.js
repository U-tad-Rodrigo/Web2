import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import checkRol from '../src/middleware/rol.middleware.js';
import Podcast from '../src/models/podcast.model.js';
import User from '../src/models/user.model.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/test-db.js';

describe('Coverage → middleware y catch blocks de controladores', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await closeTestDb(); });

  // ─── app.js → /health ────────────────────────────────────────────────────

  describe('GET /health', () => {
    test('200 → endpoint de salud responde ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // ─── notFound middleware ──────────────────────────────────────────────────

  describe('notFound middleware (error.middleware.js)', () => {
    test('404 → ruta desconocida fuera de /api devuelve mensaje de error', async () => {
      const res = await request(app).get('/ruta-que-no-existe-jamas');
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/Ruta no encontrada/i);
    });

    test('404 → ruta desconocida bajo /api devuelve mensaje de error', async () => {
      const res = await request(app).get('/api/endpoint-inexistente');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message');
    });
  });

  // ─── errorHandler middleware ──────────────────────────────────────────────

  describe('errorHandler middleware (error.middleware.js)', () => {
    test('500 → errores inesperados de BD devuelven 500 con mensaje', async () => {
      const spy = jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB connection lost'));
      try {
        const res = await request(app).post('/api/auth/login').send({
          email: 'test@test.com',
          password: 'password123',
        });
        expect(res.statusCode).toBe(500);
        expect(res.body).toHaveProperty('message');
      } finally {
        spy.mockRestore();
      }
    });

    test('errorHandler usa err.status si está definido en el error', async () => {
      const customErr = new Error('Unprocessable Entity');
      customErr.status = 422;
      const spy = jest.spyOn(User, 'findOne').mockRejectedValueOnce(customErr);
      try {
        const res = await request(app).post('/api/auth/login').send({
          email: 'test@test.com',
          password: 'password123',
        });
        expect(res.statusCode).toBe(422);
        expect(res.body.message).toBe('Unprocessable Entity');
      } finally {
        spy.mockRestore();
      }
    });

    test('errorHandler usa mensaje genérico cuando err.message está vacío (branch || fallback)', async () => {
      const errSinMensaje = { status: 503 }; // sin .message
      const spy = jest.spyOn(User, 'findOne').mockRejectedValueOnce(errSinMensaje);
      try {
        const res = await request(app).post('/api/auth/login').send({
          email: 'test@test.com',
          password: 'password123',
        });
        expect(res.statusCode).toBe(503);
        expect(res.body.message).toMatch(/error interno/i);
      } finally {
        spy.mockRestore();
      }
    });
  });

  // ─── session middleware → casos borde (líneas 15 y 20) ───────────────────

  describe('session middleware → edge cases', () => {
    test('401 → JWT válido pero sin campo userId en payload (línea 15)', async () => {
      const jwtSecret = process.env.JWT_SECRET || 'test_secret_12345678901234567890';
      const tokenSinUserId = jwt.sign({ data: 'payload-sin-userid' }, jwtSecret, { expiresIn: '1h' });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenSinUserId}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/invalido/i);
    });

    test('401 → JWT con userId de usuario que ya fue eliminado de BD (línea 20)', async () => {
      const jwtSecret = process.env.JWT_SECRET || 'test_secret_12345678901234567890';
      const idInexistente = new mongoose.Types.ObjectId();
      const tokenHuerfano = jwt.sign(
        { userId: idInexistente.toString() },
        jwtSecret,
        { expiresIn: '1h' },
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenHuerfano}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/no encontrado/i);
    });
  });

  // ─── notifySlackNewAdmin → fetch + catch (líneas 17-22) ─────────────────

  describe('auth controller → Slack webhook (notifySlackNewAdmin)', () => {
    test('201 → admin registrado ejecuta fetch a Slack aunque falle (cubre líneas 17-22)', async () => {
      // Usar URL local inalcanzable → fetch lanza ECONNREFUSED → catch lo absorbe silenciosamente
      process.env.SLACK_WEBHOOK_URL = 'http://127.0.0.1:19999/fake-slack';
      try {
        const res = await request(app).post('/api/auth/register').send({
          name: 'Slack Admin', email: 'slack@test.com', password: 'password123', role: 'admin',
        });
        expect(res.statusCode).toBe(201);
        expect(res.body.user.role).toBe('admin');
      } finally {
        delete process.env.SLACK_WEBHOOK_URL;
      }
    });
  });

  describe('checkRol middleware → unit tests', () => {
    const makeMockRes = () => ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    });

    test('401 → devuelve 401 si req.user no existe (línea 3)', () => {
      const req = {};
      const res = makeMockRes();
      const next = jest.fn();

      checkRol('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
      expect(next).not.toHaveBeenCalled();
    });

    test('403 → devuelve 403 si el rol no coincide', () => {
      const req = { user: { role: 'user' } };
      const res = makeMockRes();
      const next = jest.fn();

      checkRol('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('next() → se llama si el rol coincide exactamente', () => {
      const req = { user: { role: 'admin' } };
      const res = makeMockRes();
      const next = jest.fn();

      checkRol('admin')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ─── auth controller → catch blocks ──────────────────────────────────────

  describe('auth controller → catch blocks (líneas 60, 85 y 108)', () => {
    test('500 → error inesperado en register activa el catch', async () => {
      const spy = jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB register error'));
      try {
        const res = await request(app).post('/api/auth/register').send({
          name: 'Test User', email: 'test@test.com', password: 'password123',
        });
        expect(res.statusCode).toBe(500);
      } finally { spy.mockRestore(); }
    });

    test('500 → error inesperado en login activa el catch', async () => {
      const spy = jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB login error'));
      try {
        const res = await request(app).post('/api/auth/login').send({
          email: 'test@test.com', password: 'password123',
        });
        expect(res.statusCode).toBe(500);
      } finally { spy.mockRestore(); }
    });

    test('500 → error inesperado en changePassword activa el catch (línea 108)', async () => {
      // Crear usuario real y obtener token
      await request(app).post('/api/auth/register').send({
        name: 'Pass User', email: 'pass@test.com', password: 'oldpassword',
      });
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'pass@test.com', password: 'oldpassword',
      });
      const token = loginRes.body.token;
      const realUser = await User.findOne({ email: 'pass@test.com' });

      // Primera llamada → session middleware (devuelve el usuario real)
      // Segunda llamada → controller → lanza error
      const spy = jest.spyOn(User, 'findById')
        .mockResolvedValueOnce(realUser)
        .mockRejectedValueOnce(new Error('DB error on changePassword'));
      try {
        const res = await request(app)
          .patch('/api/auth/change-password')
          .set('Authorization', `Bearer ${token}`)
          .send({ currentPassword: 'oldpassword', newPassword: 'newpassword' });
        expect(res.statusCode).toBe(500);
      } finally { spy.mockRestore(); }
    });
  });

  // ─── podcast controller → catch blocks ───────────────────────────────────

  describe('podcast controller → catch blocks (líneas 29, 48, 61, 87, 106, 118, 140)', () => {
    let adminToken;

    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Admin CB', email: 'admin@test.com', password: 'password123', role: 'admin',
      });
      const login = await request(app).post('/api/auth/login').send({
        email: 'admin@test.com', password: 'password123',
      });
      adminToken = login.body.token;
    });

    test('500 → error en listPublishedPodcasts (línea 29)', async () => {
      const spy = jest.spyOn(Podcast, 'find').mockImplementationOnce(() => {
        throw new Error('DB error en find');
      });
      try {
        const res = await request(app).get('/api/podcasts');
        expect(res.statusCode).toBe(500);
      } finally { spy.mockRestore(); }
    });

    test('500 → error en getPodcastById (línea 48)', async () => {
      const spy = jest.spyOn(Podcast, 'findById').mockImplementationOnce(() => {
        throw new Error('DB error en findById');
      });
      try {
        const res = await request(app).get('/api/podcasts/000000000000000000000001');
        expect(res.statusCode).toBe(500);
      } finally { spy.mockRestore(); }
    });

    test('500 → error en createPodcast (línea 61)', async () => {
      const spy = jest.spyOn(Podcast, 'create').mockRejectedValueOnce(new Error('DB error en create'));
      try {
        const res = await request(app)
          .post('/api/podcasts')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'Test Podcast', description: 'Descripcion valida con suficientes caracteres', category: 'tech', duration: 300 });
        expect(res.statusCode).toBe(500);
      } finally { spy.mockRestore(); }
    });

    test('500 → error en updatePodcast (línea 87)', async () => {
      const spy = jest.spyOn(Podcast, 'findById').mockImplementationOnce(() => {
        throw new Error('DB error en findById update');
      });
      try {
        const res = await request(app)
          .put('/api/podcasts/000000000000000000000001')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'Titulo actualizado valido' });
        expect(res.statusCode).toBe(500);
      } finally { spy.mockRestore(); }
    });

    test('500 → error en deletePodcast (línea 106)', async () => {
      const spy = jest.spyOn(Podcast, 'findByIdAndDelete').mockImplementationOnce(() => {
        throw new Error('DB error en findByIdAndDelete');
      });
      try {
        const res = await request(app)
          .delete('/api/podcasts/000000000000000000000001')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(500);
      } finally { spy.mockRestore(); }
    });

    test('500 → error en listAllPodcastsAdmin (línea 118)', async () => {
      const spy = jest.spyOn(Podcast, 'find').mockImplementationOnce(() => {
        throw new Error('DB error en find admin');
      });
      try {
        const res = await request(app)
          .get('/api/podcasts/admin/all')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(500);
      } finally { spy.mockRestore(); }
    });

    test('500 → error en togglePublishPodcast (línea 140)', async () => {
      const spy = jest.spyOn(Podcast, 'findById').mockImplementationOnce(() => {
        throw new Error('DB error en findById publish');
      });
      try {
        const res = await request(app)
          .patch('/api/podcasts/000000000000000000000001/publish')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ published: true });
        expect(res.statusCode).toBe(500);
      } finally { spy.mockRestore(); }
    });
  });
});

