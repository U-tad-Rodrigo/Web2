import request from 'supertest';
import app from '../src/app.js';
import Client from '../src/models/Client.js';
import User from '../src/models/User.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/test-db.js';

const USER_BASE = '/api/user';
const CLIENT_BASE = '/api/client';

const registerUser = async (email, password = 'password123') =>
  request(app).post(`${USER_BASE}/register`).send({ email, password });

const getVerificationCode = async (email) => {
  const user = await User.findOne({ email }).select('+verificationCode');
  return user?.verificationCode;
};

const verifyEmail = async (token, code) =>
  request(app)
    .put(`${USER_BASE}/validation`)
    .set('Authorization', `Bearer ${token}`)
    .send({ code });

const loginUser = async (email, password = 'password123') =>
  request(app).post(`${USER_BASE}/login`).send({ email, password });

const setupVerifiedUser = async (email, password = 'password123') => {
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

const setupUserWithCompany = async (
  email = 'admin@bildyapp.com',
  password = 'password123',
  cif = 'B12345678',
) => {
  const { accessToken, refreshToken } = await setupVerifiedUser(email, password);

  await request(app)
    .put(`${USER_BASE}/register`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Ada', lastName: 'Lovelace', nif: '12345678A' });

  await request(app)
    .patch(`${USER_BASE}/company`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ isFreelance: false, name: 'TechCorp SL', cif, address: {} });

  return { accessToken, refreshToken, email, password, cif };
};

const createClient = async (token, payload = {}) =>
  request(app)
    .post(CLIENT_BASE)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Acme Construccion',
      cif: 'B87654321',
      email: 'contacto@acme.test',
      phone: '600123123',
      address: { city: 'Madrid', province: 'Madrid' },
      ...payload,
    });

describe('BildyApp API - /api/client', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await closeTestDb(); });

  describe('POST /api/client', () => {
    test('201 creates a client for the authenticated user company', async () => {
      const { accessToken } = await setupUserWithCompany();

      const res = await createClient(accessToken);

      expect(res.statusCode).toBe(201);
      expect(res.body.error).toBe(false);
      expect(res.body.data.client.name).toBe('Acme Construccion');
      expect(res.body.data.client.cif).toBe('B87654321');
      expect(res.body.data.client.company).toBeDefined();
      expect(res.body.data.client.user).toBeDefined();

      const client = await Client.findOne({ cif: 'B87654321' });
      expect(client).not.toBeNull();
      expect(String(client.company)).toBe(res.body.data.client.company);
    });

    test('401 rejects requests without token', async () => {
      const res = await request(app)
        .post(CLIENT_BASE)
        .send({ name: 'Acme Construccion', cif: 'B87654321' });

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('NOT_AUTHORIZED');
    });

    test('400 rejects users without company', async () => {
      const { accessToken } = await setupVerifiedUser('nocompany@bildyapp.com');

      const res = await createClient(accessToken);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_COMPANY');
    });

    test('409 rejects duplicate CIF inside the same company', async () => {
      const { accessToken } = await setupUserWithCompany();
      await createClient(accessToken, { cif: 'B87654321' });

      const res = await createClient(accessToken, { cif: 'b87654321' });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('CIF_TAKEN');
    });

    test('400 validates required name and CIF', async () => {
      const { accessToken } = await setupUserWithCompany();

      const res = await request(app)
        .post(CLIENT_BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'contacto@acme.test' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details).toBeDefined();
    });
  });

  describe('GET /api/client', () => {
    test('200 lists only active clients from the authenticated company', async () => {
      const { accessToken } = await setupUserWithCompany('admin1@bildyapp.com', 'password123', 'B11111111');
      const other = await setupUserWithCompany('admin2@bildyapp.com', 'password123', 'B22222222');
      await createClient(accessToken, { name: 'Alpha Obras', cif: 'B10000001' });
      await createClient(accessToken, { name: 'Beta Obras', cif: 'B10000002' });
      await createClient(other.accessToken, { name: 'Other Company Client', cif: 'B20000001' });

      const res = await request(app)
        .get(`${CLIENT_BASE}?name=obras&limit=1&page=1&sort=name`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.data.clients).toHaveLength(1);
      expect(res.body.data.clients[0].name).toBe('Alpha Obras');
      expect(res.body.data.totalItems).toBe(2);
      expect(res.body.data.totalPages).toBe(2);
      expect(res.body.data.currentPage).toBe(1);
    });

    test('200 gets one client by id', async () => {
      const { accessToken } = await setupUserWithCompany();
      const created = await createClient(accessToken);

      const res = await request(app)
        .get(`${CLIENT_BASE}/${created.body.data.client._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.client._id).toBe(created.body.data.client._id);
      expect(res.body.data.client.name).toBe('Acme Construccion');
    });

    test('404 does not expose clients from another company', async () => {
      const first = await setupUserWithCompany('admin1@bildyapp.com', 'password123', 'B11111111');
      const second = await setupUserWithCompany('admin2@bildyapp.com', 'password123', 'B22222222');
      const created = await createClient(first.accessToken);

      const res = await request(app)
        .get(`${CLIENT_BASE}/${created.body.data.client._id}`)
        .set('Authorization', `Bearer ${second.accessToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/client/:id', () => {
    test('200 updates client fields', async () => {
      const { accessToken } = await setupUserWithCompany();
      const created = await createClient(accessToken);

      const res = await request(app)
        .put(`${CLIENT_BASE}/${created.body.data.client._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Acme Reformas', phone: '611222333' });

      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.data.client.name).toBe('Acme Reformas');
      expect(res.body.data.client.phone).toBe('611222333');
    });

    test('409 rejects changing CIF to one already used by the company', async () => {
      const { accessToken } = await setupUserWithCompany();
      const first = await createClient(accessToken, { name: 'First', cif: 'B10000001' });
      await createClient(accessToken, { name: 'Second', cif: 'B10000002' });

      const res = await request(app)
        .put(`${CLIENT_BASE}/${first.body.data.client._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ cif: 'B10000002' });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('CIF_TAKEN');
    });
  });

  describe('DELETE /api/client/:id and PATCH /api/client/:id/restore', () => {
    test('200 soft deletes, lists as archived, and restores a client', async () => {
      const { accessToken } = await setupUserWithCompany();
      const created = await createClient(accessToken);
      const id = created.body.data.client._id;

      const deleted = await request(app)
        .delete(`${CLIENT_BASE}/${id}?soft=true`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(deleted.statusCode).toBe(200);
      expect(deleted.body.message).toContain('soft');

      const list = await request(app)
        .get(CLIENT_BASE)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(list.body.data.clients).toHaveLength(0);

      const archived = await request(app)
        .get(`${CLIENT_BASE}/archived`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(archived.statusCode).toBe(200);
      expect(archived.body.data.clients).toHaveLength(1);
      expect(archived.body.data.clients[0]._id).toBe(id);

      const restored = await request(app)
        .patch(`${CLIENT_BASE}/${id}/restore`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(restored.statusCode).toBe(200);
      expect(restored.body.data.client.deleted).toBe(false);
    });

    test('200 hard deletes a client document', async () => {
      const { accessToken } = await setupUserWithCompany();
      const created = await createClient(accessToken);
      const id = created.body.data.client._id;

      const res = await request(app)
        .delete(`${CLIENT_BASE}/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('hard');
      await expect(Client.findById(id)).resolves.toBeNull();
    });
  });
});
