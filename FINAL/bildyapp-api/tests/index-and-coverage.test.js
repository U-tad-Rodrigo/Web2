import request from 'supertest';
import app from '../src/app.js';
import Client from '../src/models/Client.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/test-db.js';

describe('Index endpoint y coverage extra', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await closeTestDb(); });

  describe('GET /', () => {
    test('devuelve JSON cuando Accept es application/json', async () => {
      const res = await request(app).get('/').set('Accept', 'application/json');
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('BildyApp API');
      expect(res.body.docs).toBe('/api-docs');
      expect(res.body.health).toBe('/health');
      expect(res.body.endpoints.dashboard).toContain('/api/dashboard');
    });

    test('redirige a /api-docs cuando Accept es text/html', async () => {
      const res = await request(app).get('/').set('Accept', 'text/html');
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/api-docs');
    });
  });

  describe('Soft delete plugin (Client)', () => {
    test('softDelete() marca deleted:true y persiste', async () => {
      const c = await Client.create({
        user:    '507f1f77bcf86cd799439011',
        company: '507f1f77bcf86cd799439012',
        name:    'Plugin test',
        cif:     'B-PLUG-001',
      });
      expect(c.deleted).toBe(false);

      await c.softDelete();
      const found = await Client.findById(c._id);
      expect(found.deleted).toBe(true);
    });

    test('restore() vuelve deleted:false', async () => {
      const c = await Client.create({
        user:    '507f1f77bcf86cd799439011',
        company: '507f1f77bcf86cd799439012',
        name:    'Plugin restore',
        cif:     'B-PLUG-002',
      });
      await c.softDelete();
      await c.restore();
      const found = await Client.findById(c._id);
      expect(found.deleted).toBe(false);
    });
  });
});
