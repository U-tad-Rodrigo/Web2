import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/health', () => {
  it('responde 200 y database:connected con BD real', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
    expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThan(0);
    expect(res.body.environment).toBe('test');
  });
});
