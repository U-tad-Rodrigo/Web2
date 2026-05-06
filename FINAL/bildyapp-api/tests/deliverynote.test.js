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
const SIGNATURE_FIXTURE = path.resolve(__dirname, 'fixtures/signature.png');

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

    test('415 rejects signing with a non-image mime type', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      const created = await createDeliveryNote(accessToken, clientId, projectId);

      const res = await request(app)
        .patch(`${DELIVERYNOTE_BASE}/${created.body.data.deliveryNote._id}/sign`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('signature', Buffer.from('hola mundo'), {
          filename: 'firma.txt',
          contentType: 'text/plain',
        });

      expect(res.statusCode).toBe(415);
      expect(res.body.code).toBe('INVALID_FILE_TYPE');
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
      expect(res.body.message).toBe('Albarán eliminado (hard)');
      await expect(DeliveryNote.findById(id)).resolves.toBeNull();
    });

    test('200 soft-deletes (?soft=true) marks deleted=true without removing the document', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      const created = await createDeliveryNote(accessToken, clientId, projectId);
      const id = created.body.data.deliveryNote._id;

      const res = await request(app)
        .delete(`${DELIVERYNOTE_BASE}/${id}?soft=true`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Albarán eliminado (soft)');
      const stored = await DeliveryNote.findById(id);
      expect(stored).not.toBeNull();
      expect(stored.deleted).toBe(true);

      // Y no debe aparecer en el listado normal
      const list = await request(app)
        .get(DELIVERYNOTE_BASE)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(list.body.data.deliveryNotes).toHaveLength(0);
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

    test('404 rejects deleting a delivery note from another company', async () => {
      const first = await setupFullContext('admin1@bildyapp.com', 'B11111111', 'B10000001');
      const second = await setupFullContext('admin2@bildyapp.com', 'B22222222', 'B20000001');
      const created = await createDeliveryNote(first.accessToken, first.clientId, first.projectId);

      const res = await request(app)
        .delete(`${DELIVERYNOTE_BASE}/${created.body.data.deliveryNote._id}`)
        .set('Authorization', `Bearer ${second.accessToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/deliverynote — date filter branches', () => {
    test('200 filters with only "from" date (no "to")', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      await createDeliveryNote(accessToken, clientId, projectId, { workDate: '2026-04-20' });
      await createDeliveryNote(accessToken, clientId, projectId, {
        material: 'Arena', workDate: '2026-03-01',
      });

      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}?from=2026-04-01`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.deliveryNotes).toHaveLength(1);
    });

    test('200 filters with only "to" date (no "from")', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      await createDeliveryNote(accessToken, clientId, projectId, { workDate: '2026-04-20' });
      await createDeliveryNote(accessToken, clientId, projectId, {
        material: 'Arena', workDate: '2026-03-01',
      });

      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}?to=2026-03-31`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.deliveryNotes).toHaveLength(1);
      expect(res.body.data.deliveryNotes[0].material).toBe('Arena');
    });

    test('200 lists delivery notes filtered by client', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      await createDeliveryNote(accessToken, clientId, projectId);

      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}?client=${clientId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.deliveryNotes).toHaveLength(1);
    });

    test('302 redirects to pdfUrl when delivery note is already signed and has pdfUrl', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      const created = await createDeliveryNote(accessToken, clientId, projectId);
      const id = created.body.data.deliveryNote._id;

      // Simula que el PDF ya fue subido a la nube
      await DeliveryNote.findByIdAndUpdate(id, {
        signed: true,
        signedAt: new Date(),
        signatureUrl: '/uploads/firma.png',
        pdfUrl: 'https://res.cloudinary.com/test/raw/upload/deliverynotes/albaran-test.pdf',
      });

      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}/pdf/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toContain('cloudinary.com');
    });

    test('201 creates hours delivery note with simple hours field (no workers)', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();

      const res = await createDeliveryNote(accessToken, clientId, projectId, {
        format: 'hours',
        material: undefined,
        quantity: undefined,
        unit: undefined,
        hours: 8,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.deliveryNote.format).toBe('hours');
      expect(res.body.data.deliveryNote.hours).toBe(8);
    });

    test('404 not found when delivery note id does not exist', async () => {
      const { accessToken } = await setupFullContext();

      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}/507f1f77bcf86cd799439999`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(404);
    });

    test('200 streams PDF for signed note with non-existent local signature (file-not-found branch)', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      const created = await createDeliveryNote(accessToken, clientId, projectId);
      const id = created.body.data.deliveryNote._id;

      // Firma con ruta local inexistente — cubre el branch fs.existsSync → false
      await DeliveryNote.findByIdAndUpdate(id, {
        signed: true,
        signedAt: new Date(),
        signatureUrl: '/uploads/nonexistent-file.png',
      });

      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}/pdf/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    test('200 streams PDF embedding remote signature (mock fetch returns PNG buffer)', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      const created = await createDeliveryNote(accessToken, clientId, projectId);
      const id = created.body.data.deliveryNote._id;

      const localPng = (await import('node:fs/promises')).readFile(SIGNATURE_FIXTURE);
      const pngBuffer = await localPng;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: true,
        arrayBuffer: async () => pngBuffer.buffer.slice(pngBuffer.byteOffset, pngBuffer.byteOffset + pngBuffer.byteLength),
      });

      try {
        await DeliveryNote.findByIdAndUpdate(id, {
          signed: true,
          signedAt: new Date(),
          signatureUrl: 'https://res.cloudinary.com/test/image/upload/v1/signatures/ok.png',
        });

        const res = await request(app)
          .get(`${DELIVERYNOTE_BASE}/pdf/${id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('application/pdf');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('200 streams PDF for signed hours note with cloudinary URL signature (remote URL branch)', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      const created = await createDeliveryNote(accessToken, clientId, projectId, {
        format: 'hours',
        material: undefined,
        quantity: undefined,
        unit: undefined,
        hours: 6,
      });
      const id = created.body.data.deliveryNote._id;

      // URL de Cloudinary — cubre el branch signatureUrl.startsWith('/uploads/') → false
      await DeliveryNote.findByIdAndUpdate(id, {
        signed: true,
        signedAt: new Date(),
        signatureUrl: 'https://res.cloudinary.com/test/image/upload/v1/signatures/sig.webp',
      });

      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}/pdf/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    test('200 streams PDF for workers hours note (workers branch in PDF)', async () => {
      const { accessToken, clientId, projectId } = await setupFullContext();
      const created = await createDeliveryNote(accessToken, clientId, projectId, {
        format: 'hours',
        material: undefined,
        quantity: undefined,
        unit: undefined,
        workers: [{ name: 'Carlos', hours: 4 }, { name: 'Luis', hours: 5 }],
      });

      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}/pdf/${created.body.data.deliveryNote._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

  });

  describe('GET /api/deliverynote/pdf/:id — owner-or-guest rule', () => {
    // Helper: añade un segundo usuario admin a la misma compañía para los casos
    // multi-usuario. El endpoint /api/user/company asigna role='guest' si el
    // CIF ya existe; aquí necesitamos un segundo ADMIN así que lo escribimos
    // directamente en BD para no depender del flujo de invitaciones.
    const setupSecondMember = async (companyCif, email, role) => {
      const verified = await setupVerifiedUser(email);
      const company = await (await import('../src/models/Company.js')).default.findOne({ cif: companyCif });
      await User.findOneAndUpdate({ email }, { company: company._id, role });
      const log = await loginUser(email);
      return log.body.data.accessToken;
    };

    test('403 NOT_OWNER when an admin who did not create the note tries to download', async () => {
      const owner = await setupFullContext('owner@bildyapp.com', 'B11111111', 'B10000001');
      const otherAdminToken = await setupSecondMember('B11111111', 'other-admin@bildyapp.com', 'admin');
      const created = await createDeliveryNote(owner.accessToken, owner.clientId, owner.projectId);

      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}/pdf/${created.body.data.deliveryNote._id}`)
        .set('Authorization', `Bearer ${otherAdminToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('NOT_OWNER');
    });

    test('200 a guest of the same company can download a note created by another user', async () => {
      const owner = await setupFullContext('owner2@bildyapp.com', 'B22222222', 'B20000001');
      const guestToken = await setupSecondMember('B22222222', 'guest@bildyapp.com', 'guest');
      const created = await createDeliveryNote(owner.accessToken, owner.clientId, owner.projectId);

      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}/pdf/${created.body.data.deliveryNote._id}`)
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });
  });
});
