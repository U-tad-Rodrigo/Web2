import request from 'supertest';
import app from '../src/app.js';
import DeliveryNote from '../src/models/DeliveryNote.js';
import User from '../src/models/User.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/test-db.js';

const USER_BASE = '/api/user';
const CLIENT_BASE = '/api/client';
const PROJECT_BASE = '/api/project';
const DELIVERYNOTE_BASE = '/api/deliverynote';

const setupVerifiedUser = async (email, password = 'password123') => {
  const reg = await request(app).post(`${USER_BASE}/register`).send({ email, password });
  const { accessToken } = reg.body.data;
  const u = await User.findOne({ email }).select('+verificationCode');
  await request(app)
    .put(`${USER_BASE}/validation`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ code: u.verificationCode });
  const log = await request(app).post(`${USER_BASE}/login`).send({ email, password });
  return log.body.data;
};

const setupFullContext = async () => {
  const tokens = await setupVerifiedUser('pdf@bildyapp.com');
  await request(app)
    .put(`${USER_BASE}/register`)
    .set('Authorization', `Bearer ${tokens.accessToken}`)
    .send({ name: 'Ada', lastName: 'L', nif: '12345678A' });
  await request(app)
    .patch(`${USER_BASE}/company`)
    .set('Authorization', `Bearer ${tokens.accessToken}`)
    .send({ isFreelance: false, name: 'C SL', cif: 'B99999999', address: {} });

  const client = await request(app)
    .post(CLIENT_BASE)
    .set('Authorization', `Bearer ${tokens.accessToken}`)
    .send({ name: 'PDF Client', cif: 'B-PDF-001', address: { city: 'Madrid', province: 'Madrid' } });
  const project = await request(app)
    .post(PROJECT_BASE)
    .set('Authorization', `Bearer ${tokens.accessToken}`)
    .send({
      client: client.body.data.client._id,
      name: 'PDF project', projectCode: 'PR-PDF',
      address: { city: 'Madrid', province: 'Madrid' },
    });
  const note = await request(app)
    .post(DELIVERYNOTE_BASE)
    .set('Authorization', `Bearer ${tokens.accessToken}`)
    .send({
      client: client.body.data.client._id,
      project: project.body.data.project._id,
      format: 'material', workDate: '2026-04-29', material: 'Cemento', quantity: 1, unit: 'kg',
    });

  return { accessToken: tokens.accessToken, noteId: note.body.data.deliveryNote._id };
};

describe('pdf.service — branches restantes', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await closeTestDb(); });

  test('200 stream PDF cuando fetch remoto FALLA con error de red (catch → null)', async () => {
    const { accessToken, noteId } = await setupFullContext();

    await DeliveryNote.findByIdAndUpdate(noteId, {
      signed: true,
      signedAt: new Date(),
      signatureUrl: 'https://res.cloudinary.com/test/image/upload/v1/sig.webp',
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error('ECONNRESET'); };
    try {
      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}/pdf/${noteId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('200 stream PDF cuando fetch remoto devuelve !ok (res.ok=false → null)', async () => {
    const { accessToken, noteId } = await setupFullContext();

    await DeliveryNote.findByIdAndUpdate(noteId, {
      signed: true,
      signedAt: new Date(),
      signatureUrl: 'https://res.cloudinary.com/test/image/upload/v1/sig.webp',
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) });
    try {
      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}/pdf/${noteId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('200 stream PDF cuando el buffer remoto NO es imagen válida (pdfkit lanza → cae al texto)', async () => {
    const { accessToken, noteId } = await setupFullContext();

    await DeliveryNote.findByIdAndUpdate(noteId, {
      signed: true,
      signedAt: new Date(),
      signatureUrl: 'https://res.cloudinary.com/test/image/upload/v1/garbage.bin',
    });

    const originalFetch = globalThis.fetch;
    // Buffer no-imagen — pdfkit lanzará al pasarlo a doc.image() y caerá al text fallback
    globalThis.fetch = async () => ({
      ok: true,
      arrayBuffer: async () => Buffer.from('not-an-image').buffer,
    });
    try {
      const res = await request(app)
        .get(`${DELIVERYNOTE_BASE}/pdf/${noteId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
