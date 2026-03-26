import request from 'supertest';
import app from '../src/app.js';
import Podcast from '../src/models/podcast.model.js';
import User from '../src/models/user.model.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/test-db.js';

// Helper: registra y hace login, devuelve token
const registerAndLogin = async ({ name, email, password, role = 'user' }) => {
  await request(app).post('/api/auth/register').send({ name, email, password, role });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { token: res.body.token, user: res.body.user };
};

// Helper: crea un podcast directo en BD (sin publicar por defecto)
const createPodcastInDb = async (authorId, overrides = {}) =>
  Podcast.create({
    title: 'Podcast Test',
    description: 'Descripcion valida con suficientes caracteres',
    author: authorId,
    category: 'tech',
    duration: 300,
    published: false,
    ...overrides,
  });

describe('Podcast endpoints', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await closeTestDb(); });

  // ─── GET /api/podcasts ────────────────────────────────────────────────────

  describe('GET /api/podcasts (público, solo publicados)', () => {
    test('200 → devuelve solo podcasts publicados en formato paginado', async () => {
      const user = await User.create({ name: 'Autor Test', email: 'a@test.com', password: 'hash-seguro-12' });
      await createPodcastInDb(user._id, { title: 'Publicado', published: true });
      await createPodcastInDb(user._id, { title: 'No publicado', published: false });

      const res = await request(app).get('/api/podcasts');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('pages');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Publicado');
      expect(res.body.total).toBe(1);
    });

    test('200 → NO requiere autenticación', async () => {
      const res = await request(app).get('/api/podcasts');
      expect(res.statusCode).toBe(200);
    });

    test('200 → NO devuelve podcasts no publicados a usuarios anónimos', async () => {
      const user = await User.create({ name: 'Autor Test', email: 'a@test.com', password: 'hash-seguro-12' });
      await createPodcastInDb(user._id, { published: false });

      const res = await request(app).get('/api/podcasts');
      expect(res.body.total).toBe(0);
      expect(res.body.data).toHaveLength(0);
    });
  });

  // ─── GET /api/podcasts (paginación BONUS) ─────────────────────────────────

  describe('GET /api/podcasts → paginación (BONUS)', () => {
    test('?page=1&limit=2 → devuelve 2 resultados con metadatos correctos', async () => {
      const user = await User.create({ name: 'Paginador', email: 'p@test.com', password: 'hash-seguro-12' });
      await Promise.all([
        createPodcastInDb(user._id, { title: 'Podcast Uno', published: true }),
        createPodcastInDb(user._id, { title: 'Podcast Dos', published: true }),
        createPodcastInDb(user._id, { title: 'Podcast Tres', published: true }),
      ]);

      const res = await request(app).get('/api/podcasts?page=1&limit=2');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(3);
      expect(res.body.pages).toBe(2);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
    });

    test('?page=2&limit=2 → devuelve el resto en página 2', async () => {
      const user = await User.create({ name: 'Paginador', email: 'p@test.com', password: 'hash-seguro-12' });
      await Promise.all([
        createPodcastInDb(user._id, { title: 'Podcast Uno', published: true }),
        createPodcastInDb(user._id, { title: 'Podcast Dos', published: true }),
        createPodcastInDb(user._id, { title: 'Podcast Tres', published: true }),
      ]);

      const res = await request(app).get('/api/podcasts?page=2&limit=2');
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.page).toBe(2);
    });
  });

  // ─── GET /api/podcasts/:id ─────────────────────────────────────────────────

  describe('GET /api/podcasts/:id (público)', () => {
    test('200 → devuelve podcast publicado por ID', async () => {
      const user = await User.create({ name: 'Autor ID', email: 'a@test.com', password: 'hash-seguro-12' });
      const podcast = await createPodcastInDb(user._id, { published: true });

      const res = await request(app).get(`/api/podcasts/${podcast._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body._id).toBe(podcast._id.toString());
    });

    test('404 → podcast existe pero no está publicado', async () => {
      const user = await User.create({ name: 'Autor ID', email: 'a@test.com', password: 'hash-seguro-12' });
      const podcast = await createPodcastInDb(user._id, { published: false });

      const res = await request(app).get(`/api/podcasts/${podcast._id}`);
      expect(res.statusCode).toBe(404);
    });

    test('404 → ID válido pero podcast no existe', async () => {
      const res = await request(app).get('/api/podcasts/000000000000000000000001');
      expect(res.statusCode).toBe(404);
    });

    test('400 → ID con formato inválido', async () => {
      const res = await request(app).get('/api/podcasts/id-no-valido');
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── POST /api/podcasts ────────────────────────────────────────────────────

  describe('POST /api/podcasts (autenticado)', () => {
    test('201 → podcast creado correctamente', async () => {
      const { token } = await registerAndLogin({ name: 'Autor', email: 'a@test.com', password: 'password123' });

      const res = await request(app).post('/api/podcasts')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Mi Podcast', description: 'Descripcion valida del podcast', category: 'tech', duration: 600 });

      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('Mi Podcast');
    });

    test('201 → published es false por defecto', async () => {
      const { token } = await registerAndLogin({ name: 'Autor', email: 'a@test.com', password: 'password123' });

      const res = await request(app).post('/api/podcasts')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Mi Podcast', description: 'Descripcion valida del podcast', category: 'tech', duration: 600 });

      expect(res.statusCode).toBe(201);
      expect(res.body.published).toBe(false);
    });

    test('201 → author asignado automáticamente del token', async () => {
      const { token, user } = await registerAndLogin({ name: 'Autor', email: 'a@test.com', password: 'password123' });

      const res = await request(app).post('/api/podcasts')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Mi Podcast', description: 'Descripcion valida del podcast', category: 'tech', duration: 600 });

      expect(res.statusCode).toBe(201);
      expect(res.body.author).toBe(user._id);
    });

    test('401 → sin token', async () => {
      const res = await request(app).post('/api/podcasts')
        .send({ title: 'Sin Token', description: 'Descripcion valida del podcast', category: 'tech', duration: 600 });
      expect(res.statusCode).toBe(401);
    });

    test('400 → faltan campos requeridos (sin title)', async () => {
      const { token } = await registerAndLogin({ name: 'AutorA', email: 'a@test.com', password: 'password123' });
      const res = await request(app).post('/api/podcasts')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Desc', category: 'tech', duration: 600 });
      expect(res.statusCode).toBe(400);
    });

    test('400 → categoría inválida', async () => {
      const { token } = await registerAndLogin({ name: 'AutorA', email: 'a@test.com', password: 'password123' });
      const res = await request(app).post('/api/podcasts')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Bad Cat', description: 'Descripcion valida', category: 'musica', duration: 600 });
      expect(res.statusCode).toBe(400);
    });

    test('400 → duration menor de 60 segundos', async () => {
      const { token } = await registerAndLogin({ name: 'AutorA', email: 'a@test.com', password: 'password123' });
      const res = await request(app).post('/api/podcasts')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Corto', description: 'Descripcion valida del podcast', category: 'tech', duration: 30 });
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── PUT /api/podcasts/:id ─────────────────────────────────────────────────

  describe('PUT /api/podcasts/:id (autor)', () => {
    test('200 → autor actualiza su propio podcast', async () => {
      const { token } = await registerAndLogin({ name: 'Autor', email: 'a@test.com', password: 'password123' });
      const create = await request(app).post('/api/podcasts')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Original', description: 'Descripcion original larga', category: 'news', duration: 180 });

      const res = await request(app).put(`/api/podcasts/${create.body._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Actualizado' });

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Actualizado');
    });

    test('403 → otro usuario NO puede actualizar podcast ajeno', async () => {
      const { token: tokenA } = await registerAndLogin({ name: 'AutorA', email: 'a@test.com', password: 'password123' });
      const { token: tokenB } = await registerAndLogin({ name: 'AutorB', email: 'b@test.com', password: 'password123' });

      const create = await request(app).post('/api/podcasts')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Podcast A', description: 'Descripcion del podcast de A', category: 'comedy', duration: 300 });

      const res = await request(app).put(`/api/podcasts/${create.body._id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'Hackeo' });

      expect(res.statusCode).toBe(403);
    });

    test('401 → sin token', async () => {
      const user = await User.create({ name: 'Auxiliar', email: 'x@test.com', password: 'hash-seguro-12' });
      const podcast = await createPodcastInDb(user._id);

      const res = await request(app).put(`/api/podcasts/${podcast._id}`)
        .send({ title: 'Sin Auth' });
      expect(res.statusCode).toBe(401);
    });

    test('400 → body vacío rechazado', async () => {
      const { token } = await registerAndLogin({ name: 'AutorA', email: 'a@test.com', password: 'password123' });
      const create = await request(app).post('/api/podcasts')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Orig', description: 'Descripcion original del podcast test', category: 'tech', duration: 200 });

      const res = await request(app).put(`/api/podcasts/${create.body._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.statusCode).toBe(400);
    });

    test('400 → ID con formato inválido', async () => {
      const { token } = await registerAndLogin({ name: 'AutorA', email: 'a@test.com', password: 'password123' });
      const res = await request(app).put('/api/podcasts/id-no-valido')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Nuevo titulo valido' });
      expect(res.statusCode).toBe(400);
    });

    test('404 → podcast con ID válido pero no existe', async () => {
      const { token } = await registerAndLogin({ name: 'AutorA', email: 'a@test.com', password: 'password123' });
      const res = await request(app).put('/api/podcasts/000000000000000000000001')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Nuevo titulo valido' });
      expect(res.statusCode).toBe(404);
    });
  });

  // ─── DELETE /api/podcasts/:id ──────────────────────────────────────────────

  describe('DELETE /api/podcasts/:id (solo admin)', () => {
    test('200 → admin puede borrar cualquier podcast', async () => {
      const { token } = await registerAndLogin({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });
      const admin = await User.findOne({ email: 'admin@test.com' });
      const podcast = await createPodcastInDb(admin._id, { published: true });

      const res = await request(app).delete(`/api/podcasts/${podcast._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);

      const deleted = await Podcast.findById(podcast._id);
      expect(deleted).toBeNull();
    });

    test('403 → user normal NO puede borrar', async () => {
      const { token } = await registerAndLogin({ name: 'User', email: 'user@test.com', password: 'password123', role: 'user' });
      const user = await User.findOne({ email: 'user@test.com' });
      const podcast = await createPodcastInDb(user._id, { published: true });

      const res = await request(app).delete(`/api/podcasts/${podcast._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
    });

    test('401 → sin token', async () => {
      const user = await User.create({ name: 'Auxiliar', email: 'x@test.com', password: 'hash-seguro-12' });
      const podcast = await createPodcastInDb(user._id);

      const res = await request(app).delete(`/api/podcasts/${podcast._id}`);
      expect(res.statusCode).toBe(401);
    });

    test('404 → podcast no existe', async () => {
      const { token } = await registerAndLogin({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });

      const res = await request(app).delete('/api/podcasts/000000000000000000000001')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });

    test('400 → ID con formato inválido', async () => {
      const { token } = await registerAndLogin({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });
      const res = await request(app).delete('/api/podcasts/id-no-valido')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── GET /api/podcasts/admin/all ──────────────────────────────────────────

  describe('GET /api/podcasts/admin/all (solo admin)', () => {
    test('200 → admin ve todos los podcasts (publicados y no publicados)', async () => {
      const { token } = await registerAndLogin({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });
      const admin = await User.findOne({ email: 'admin@test.com' });

      await createPodcastInDb(admin._id, { published: true });
      await createPodcastInDb(admin._id, { published: false });

      const res = await request(app).get('/api/podcasts/admin/all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    test('403 → user normal NO puede ver todos los podcasts', async () => {
      const { token } = await registerAndLogin({ name: 'User', email: 'user@test.com', password: 'password123', role: 'user' });

      const res = await request(app).get('/api/podcasts/admin/all')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });

    test('401 → sin token', async () => {
      const res = await request(app).get('/api/podcasts/admin/all');
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── PATCH /api/podcasts/:id/publish ─────────────────────────────────────

  describe('PATCH /api/podcasts/:id/publish (solo admin)', () => {
    test('200 → admin puede publicar un podcast', async () => {
      const { token } = await registerAndLogin({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });
      const admin = await User.findOne({ email: 'admin@test.com' });
      const podcast = await createPodcastInDb(admin._id, { published: false });

      const res = await request(app).patch(`/api/podcasts/${podcast._id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .send({ published: true });

      expect(res.statusCode).toBe(200);
      expect(res.body.published).toBe(true);
    });

    test('200 → admin puede despublicar un podcast', async () => {
      const { token } = await registerAndLogin({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });
      const admin = await User.findOne({ email: 'admin@test.com' });
      const podcast = await createPodcastInDb(admin._id, { published: true });

      const res = await request(app).patch(`/api/podcasts/${podcast._id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .send({ published: false });

      expect(res.statusCode).toBe(200);
      expect(res.body.published).toBe(false);
    });

    test('403 → user normal NO puede publicar', async () => {
      const { token } = await registerAndLogin({ name: 'User', email: 'user@test.com', password: 'password123', role: 'user' });
      const user = await User.findOne({ email: 'user@test.com' });
      const podcast = await createPodcastInDb(user._id, { published: false });

      const res = await request(app).patch(`/api/podcasts/${podcast._id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .send({ published: true });
      expect(res.statusCode).toBe(403);
    });

    test('401 → sin token', async () => {
      const user = await User.create({ name: 'Auxiliar', email: 'x@test.com', password: 'hash-seguro-12' });
      const podcast = await createPodcastInDb(user._id);

      const res = await request(app).patch(`/api/podcasts/${podcast._id}/publish`)
        .send({ published: true });
      expect(res.statusCode).toBe(401);
    });

    test('400 → campo published es requerido', async () => {
      const { token } = await registerAndLogin({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });
      const admin = await User.findOne({ email: 'admin@test.com' });
      const podcast = await createPodcastInDb(admin._id);

      const res = await request(app).patch(`/api/podcasts/${podcast._id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.statusCode).toBe(400);
    });

    test('400 → ID con formato inválido', async () => {
      const { token } = await registerAndLogin({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });
      const res = await request(app).patch('/api/podcasts/id-no-valido/publish')
        .set('Authorization', `Bearer ${token}`)
        .send({ published: true });
      expect(res.statusCode).toBe(400);
    });

    test('404 → podcast con ID válido pero no existe', async () => {
      const { token } = await registerAndLogin({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });
      const res = await request(app).patch('/api/podcasts/000000000000000000000001/publish')
        .set('Authorization', `Bearer ${token}`)
        .send({ published: true });
      expect(res.statusCode).toBe(404);
    });
  });
});

