import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Client from '../src/models/Client.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/test-db.js';

// Helper unit-test del errorHandler — reutilizado por varios casos
const runErrorHandler = (err) => {
  let capturedStatus;
  let capturedBody;
  const mockReq = { method: 'POST', originalUrl: '/api/test' };
  const mockRes = {
    status(code) { capturedStatus = code; return this; },
    json(body)   { capturedBody = body; },
  };
  errorHandler(err, mockReq, mockRes, () => {});
  return { status: capturedStatus, body: capturedBody };
};

const USER_BASE = '/api/user';
const CLIENT_BASE = '/api/client';

const registerAndLogin = async (email = 'err@bildyapp.com') => {
  const reg = await request(app).post(`${USER_BASE}/register`).send({ email, password: 'password123' });
  const { accessToken } = reg.body.data;
  const user = await User.findOne({ email }).select('+verificationCode');
  await request(app)
    .put(`${USER_BASE}/validation`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ code: user.verificationCode });
  const log = await request(app).post(`${USER_BASE}/login`).send({ email, password: 'password123' });
  return log.body.data.accessToken;
};

const setupWithCompany = async (email = 'err@bildyapp.com') => {
  const token = await registerAndLogin(email);
  await request(app)
    .patch(`${USER_BASE}/company`)
    .set('Authorization', `Bearer ${token}`)
    .send({ isFreelance: true });
  return token;
};

describe('Error handler branches', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await closeTestDb(); });

  test('400 INVALID_ID on malformed ObjectId (CastError branch)', async () => {
    const token = await setupWithCompany();

    const res = await request(app)
      .get(`${CLIENT_BASE}/not-a-valid-objectid`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INVALID_ID');
  });

  test('400 INVALID_JSON on malformed JSON body (SyntaxError branch)', async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .post(`${USER_BASE}/login`)
      .set('Content-Type', 'application/json')
      .send('{broken json');

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INVALID_JSON');
  });

  test('404 on unknown route (notFound middleware)', async () => {
    const res = await request(app).get('/api/ruta-inexistente');

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  test('415 INVALID_FILE_TYPE when uploading non-image file (Multer fileFilter branch)', async () => {
    const token = await setupWithCompany();

    const res = await request(app)
      .patch(`${USER_BASE}/logo`)
      .set('Authorization', `Bearer ${token}`)
      .attach('logo', Buffer.from('not an image'), { filename: 'file.pdf', contentType: 'application/pdf' });

    expect(res.statusCode).toBe(415);
    expect(res.body.code).toBe('INVALID_FILE_TYPE');
  });

  test('400 FILE_TOO_LARGE when uploading file > 5 MB (LIMIT_FILE_SIZE branch)', async () => {
    const token = await setupWithCompany();
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 0); // 6 MB

    const res = await request(app)
      .patch(`${USER_BASE}/logo`)
      .set('Authorization', `Bearer ${token}`)
      .attach('logo', bigBuffer, { filename: 'big.png', contentType: 'image/png' });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('FILE_TOO_LARGE');
  });

  test('500 generic error path triggers slackError and returns INTERNAL_ERROR (unit)', () => {
    const genericErr = new Error('Unexpected crash');
    genericErr.statusCode = 500;

    const mockReq = { method: 'GET', originalUrl: '/api/test' };
    let capturedStatus;
    let capturedBody;
    const mockRes = {
      status(code) { capturedStatus = code; return this; },
      json(body) { capturedBody = body; },
    };

    errorHandler(genericErr, mockReq, mockRes, () => {});

    expect(capturedStatus).toBe(500);
    expect(capturedBody).toMatchObject({ error: true, code: 'INTERNAL_ERROR' });
  });

  test('AppError factories cover default messages and codes', async () => {
    const { AppError } = await import('../src/utils/AppError.js');

    const u = AppError.unauthorized();
    expect(u.statusCode).toBe(401);
    expect(u.code).toBe('NOT_AUTHORIZED');
    expect(u.message).toBe('No autorizado');

    const f = AppError.forbidden();
    expect(f.statusCode).toBe(403);
    expect(f.code).toBe('NOT_ALLOWED');

    const n = AppError.notFound();
    expect(n.statusCode).toBe(404);
    expect(n.code).toBe('NOT_FOUND');

    const v = AppError.validation();
    expect(v.code).toBe('VALIDATION_ERROR');
    expect(v.details).toEqual([]);

    const i = AppError.internal();
    expect(i.statusCode).toBe(500);
    expect(i.code).toBe('INTERNAL_ERROR');
  });

  test('11000 duplicate key throws MongoDB error at model level', async () => {
    // Verifica que el índice único dispara código 11000 directamente en Mongoose
    await Client.create({ name: 'A', cif: 'B00000001', user: '507f1f77bcf86cd799439011', company: '507f1f77bcf86cd799439012' });

    let caughtError;
    try {
      await Client.create({ name: 'B', cif: 'B00000001', user: '507f1f77bcf86cd799439011', company: '507f1f77bcf86cd799439012' });
    } catch (err) {
      caughtError = err;
    }
    expect(caughtError?.code).toBe(11000);
  });

  test('400 VALIDATION_ERROR maps Mongoose ValidationError with details (unit)', () => {
    const err = new mongoose.Error.ValidationError();
    err.errors = {
      name: { message: 'El nombre es obligatorio' },
      cif:  { message: 'El CIF es obligatorio' },
    };

    const res = runErrorHandler(err);

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: true,
      code: 'VALIDATION_ERROR',
      message: 'Error de validación',
    });
    expect(res.body.details).toEqual(['El nombre es obligatorio', 'El CIF es obligatorio']);
  });

  test('409 DUPLICATE_KEY maps MongoDB 11000 error with field name (unit)', () => {
    const err = Object.assign(new Error('E11000 duplicate key error'), {
      code: 11000,
      keyValue: { cif: 'B12345678' },
    });

    const res = runErrorHandler(err);

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      error: true,
      code: 'DUPLICATE_KEY',
    });
    expect(res.body.message).toContain("'cif'");
  });

  test('409 DUPLICATE_KEY falls back to "campo" when keyValue missing', () => {
    const err = Object.assign(new Error('dup'), { code: 11000 });
    const res = runErrorHandler(err);
    expect(res.status).toBe(409);
    expect(res.body.message).toContain("'campo'");
  });

  test('AppError with details serialises details in body', async () => {
    const { AppError } = await import('../src/utils/AppError.js');
    const err = AppError.validation('Faltan campos', [{ field: 'cif', message: 'requerido' }]);
    const res = runErrorHandler(err);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details).toEqual([{ field: 'cif', message: 'requerido' }]);
  });

  test('uses err.status when statusCode is missing', () => {
    const err = Object.assign(new Error('Boom'), { status: 503 });
    const res = runErrorHandler(err);
    expect(res.status).toBe(503);
  });
});
