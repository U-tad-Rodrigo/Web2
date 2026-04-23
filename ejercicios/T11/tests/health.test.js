import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/health', () => {
  it('responde con shape correcta independientemente del estado de BD', async () => {
    const res = await request(app).get('/api/health');

    expect([200, 503]).toContain(res.status);
    expect(['ok', 'error']).toContain(res.body.status);
    expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThan(0);
    expect(['connected', 'disconnected']).toContain(res.body.database);
    expect(['development', 'production', 'test']).toContain(res.body.environment);
  });

  const itIfDB = process.env.DATABASE_URL ? it : it.skip;

  itIfDB('responde 200 y database:connected con BD real', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
  });
});
