import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  server.close();
  await prisma.$disconnect();
});

describe('GET /api/health', () => {
  it('responde con shape correcta independientemente del estado de BD', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.ok([200, 503].includes(res.status), `status inesperado: ${res.status}`);
    const body = await res.json();
    assert.ok(['ok', 'error'].includes(body.status));
    assert.ok(!isNaN(new Date(body.timestamp).getTime()), 'timestamp debe ser ISO válido');
    assert.ok(typeof body.uptime === 'number' && body.uptime > 0, 'uptime debe ser número positivo');
    assert.ok(['connected', 'disconnected'].includes(body.database));
    assert.ok(['development', 'production', 'test'].includes(body.environment), 'environment debe ser válido');
  });

  it('responde 200 y database:connected con BD real', { skip: !process.env.DATABASE_URL }, async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.database, 'connected');
    assert.equal(body.environment, process.env.NODE_ENV ?? 'development');
  });
});
