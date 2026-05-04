import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';
import app from '../src/app.js';
import DeliveryNote from '../src/models/DeliveryNote.js';
import User from '../src/models/User.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/test-db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const USER_BASE = '/api/user';
const CLIENT_BASE = '/api/client';
const PROJECT_BASE = '/api/project';
const DELIVERYNOTE_BASE = '/api/deliverynote';
const SIGNATURE_FIXTURE = path.resolve(__dirname, '../uploads/logo-3ab7f027644baced49fb16ecf51b9e3d.png');

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

const createProject = async (token, clientId, payload = {}) =>
  request(app)
    .post(PROJECT_BASE)
    .set('Authorization', `Bearer ${token}`)
    .send({
      client: clientId,
      name: 'Reforma oficinas',
      projectCode: 'PR-001',
      email: 'obra@acme.test',
      notes: 'Proyecto principal',
      address: { city: 'Madrid', province: 'Madrid' },
      ...payload,
    });

const createDeliveryNote = async (token, clientId, projectId, payload = {}) =>
  request(app)
    .post(DELIVERYNOTE_BASE)
    .set('Authorization', `Bearer ${token}`)
    .send({
      client: clientId,
      project: projectId,
      format: 'material',
      description: 'Entrega de material en obra',
      workDate: '2026-04-29',
      material: 'Cemento',
      quantity: 10,
      unit: 'sacos',
      ...payload,
    });

const setupFullContext = async (
  email = 'admin@bildyapp.com',
  companyCif = 'B12345678',
  clientCif = 'B87654321',
) => {
  const user = await setupUserWithCompany(email, 'password123', companyCif);
  const client = await createClient(user.accessToken, { cif: clientCif });
  const project = await createProject(user.accessToken, client.body.data.client._id);

  return {
    ...user,
    clientId: client.body.data.client._id,
    projectId: project.body.data.project._id,
  };
};

describe('BildyApp API - /api/deliverynote', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await closeTestDb(); });

  describe('POST /api/deliverynote', () => {
    test('201 creates a material delivery note linked to client and project', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();

      const res = await createDeliveryNote(accessToken, clientId, projectId);

      expect(res.statusCode).toBe(201);
      expect(res.body.error).toBe(false);
      expect(res.body.data.deliveryNote.format).toBe('material');
      expect(res.body.data.deliveryNote.material).toBe('Cemento');
      expect(res.body.data.deliveryNote.quantity).toBe(10);
      expect(res.body.data.deliveryNote.signed).toBe(false);

      const deliveryNote = await DeliveryNote.findOne({ material: 'Cemento' });
      expect(deliveryNote).not.toBeNull();
      expect(String(deliveryNote.client)).toBe(clientId);
      expect(String(deliveryNote.project)).toBe(projectId);
    });

    test('201 creates an hours delivery note using workers', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();

      const res = await createDeliveryNote(accessToken, clientId, projectId, {
        format: 'hours',
        material: undefined,
        quantity: undefined,
        unit: undefined,
        hours: undefined,
        workers: [
          { name: 'Ada', hours: 3 },
          { name: 'Grace', hours: 4 },
        ],
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.deliveryNote.format).toBe('hours');
      expect(res.body.data.deliveryNote.workers).toHaveLength(2);
      expect(res.body.data.deliveryNote.workers[0].name).toBe('Ada');
    });

    test('401 rejects requests without token', async () => {
      const res = await request(app)
        .post(DELIVERYNOTE_BASE)
        .send({
          client: '507f1f77bcf86cd799439011',
          project: '507f1f77bcf86cd799439012',
          format: 'material',
          workDate: '2026-04-29',
          material: 'Cemento',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('NOT_AUTHORIZED');
    });

    test('400 rejects users without company', async () => {
      const { accessToken } = await setupVerifiedUser('nocompany@bildyapp.com');

      const res = await createDeliveryNote(
        accessToken,
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
      );

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_COMPANY');
    });

    test('404 rejects client from another company', async () => {
      const first = await setupFullContext('admin1@bildyapp.com', 'B11111111', 'B10000001');
      const second = await setupFullContext('admin2@bildyapp.com', 'B22222222', 'B20000001');

      const res = await createDeliveryNote(second.accessToken, first.clientId, second.projectId);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    test('404 rejects project from another company', async () => {
      const first = await setupFullContext('admin1@bildyapp.com', 'B11111111', 'B10000001');
      const second = await setupFullContext('admin2@bildyapp.com', 'B22222222', 'B20000001');

      const res = await createDeliveryNote(second.accessToken, second.clientId, first.projectId);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    test('400 validates material-specific fields', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();

      const res = await createDeliveryNote(accessToken, clientId, projectId, {
        format: 'material',
        material: undefined,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details).toBeDefined();
    });

    test('400 validates hours-specific fields', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();

      const res = await createDeliveryNote(accessToken, clientId, projectId, {
        format: 'hours',
        material: undefined,
        hours: undefined,
        workers: [],
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details).toBeDefined();
    });
  });

  describe('GET /api/deliverynote', () => {
    test('200 lists delivery notes filtered by project, format, signed and date range', async () => {
      const first = await setupFullContext('admin1@bildyapp.com', 'B11111111', 'B10000001');
      const second = await setupFullContext('admin2@bildyapp.com', 'B22222222', 'B20000001');
      await createDeliveryNote(first.accessToken, first.clientId, first.projectId, {
        description: 'Dentro de rango',
        workDate: '2026-04-20',
        format: 'material',
        material: 'Cemento',
      });
      await createDeliveryNote(first.accessToken, first.clientId, first.projectId, {
        description: 'Fuera de rango',
        workDate: '2026-03-01',
        format: 'material',
        material: 'Arena',
      });
      await createDeliveryNote(second.accessToken, second.clientId, second.projectId, {
        description: 'Otra empresa',
        workDate: '2026-04-20',
        format: 'material',
        material: 'Cemento',
      });

      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}?project=${first.projectId}&format=material&signed=false&from=2026-04-01&to=2026-04-30&limit=1&page=1&sort=workDate`)
        .set('Authorization', `Bearer ${first.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.data.deliveryNotes).toHaveLength(1);
      expect(res.body.data.deliveryNotes[0].description).toBe('Dentro de rango');
      expect(res.body.data.totalItems).toBe(1);
      expect(res.body.data.totalPages).toBe(1);
      expect(res.body.data.currentPage).toBe(1);
    });

    test('200 gets one delivery note by id with user, client and project populated', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      const created = await createDeliveryNote(accessToken, clientId, projectId);

      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}/${created.body.data.deliveryNote._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.deliveryNote._id).toBe(created.body.data.deliveryNote._id);
      expect(res.body.data.deliveryNote.client.name).toBe('Acme Construccion');
      expect(res.body.data.deliveryNote.project.name).toBe('Reforma oficinas');
      expect(res.body.data.deliveryNote.user.email).toBe('admin@bildyapp.com');
    });

    test('404 does not expose delivery notes from another company', async () => {
      const first = await setupFullContext('admin1@bildyapp.com', 'B11111111', 'B10000001');
      const second = await setupFullContext('admin2@bildyapp.com', 'B22222222', 'B20000001');
      const created = await createDeliveryNote(first.accessToken, first.clientId, first.projectId);

      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}/${created.body.data.deliveryNote._id}`)
        .set('Authorization', `Bearer ${second.accessToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    test('200 streams a basic PDF for an existing delivery note', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      const created = await createDeliveryNote(accessToken, clientId, projectId);

      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}/pdf/${created.body.data.deliveryNote._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('albaran-');
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/deliverynote/:id/sign', () => {
    test('200 signs a delivery note with an uploaded image', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      const created = await createDeliveryNote(accessToken, clientId, projectId);

      const res = await request(app)
        .patch(`${DELIVERYNOTE_BASE}/${created.body.data.deliveryNote._id}/sign`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('signature', SIGNATURE_FIXTURE);

      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.data.deliveryNote.signed).toBe(true);
      expect(res.body.data.deliveryNote.signedAt).toBeDefined();
      expect(res.body.data.deliveryNote.signatureUrl).toContain('/uploads/');
    });

    test('400 rejects signing without file', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      const created = await createDeliveryNote(accessToken, clientId, projectId);

      const res = await request(app)
        .patch(`${DELIVERYNOTE_BASE}/${created.body.data.deliveryNote._id}/sign`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_FILE');
    });

    test('400 rejects signing an already signed delivery note', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      const created = await createDeliveryNote(accessToken, clientId, projectId);
      await request(app)
        .patch(`${DELIVERYNOTE_BASE}/${created.body.data.deliveryNote._id}/sign`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('signature', SIGNATURE_FIXTURE);

      const res = await request(app)
        .patch(`${DELIVERYNOTE_BASE}/${created.body.data.deliveryNote._id}/sign`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('signature', SIGNATURE_FIXTURE);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('ALREADY_SIGNED');
    });
  });

  describe('DELETE /api/deliverynote/:id', () => {
    test('200 deletes an unsigned delivery note', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      const created = await createDeliveryNote(accessToken, clientId, projectId);
      const id = created.body.data.deliveryNote._id;

      const res = await request(app)
        .delete(`${DELIVERYNOTE_BASE}/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Albarán eliminado');
      await expect(DeliveryNote.findById(id)).resolves.toBeNull();
    });

    test('400 rejects deleting a signed delivery note', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      const created = await createDeliveryNote(accessToken, clientId, projectId);
      await request(app)
        .patch(`${DELIVERYNOTE_BASE}/${created.body.data.deliveryNote._id}/sign`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('signature', SIGNATURE_FIXTURE);

      const res = await request(app)
        .delete(`${DELIVERYNOTE_BASE}/${created.body.data.deliveryNote._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('SIGNED_NOTE');
      await expect(DeliveryNote.findById(created.body.data.deliveryNote._id)).resolves.not.toBeNull();
    });
  });
});
