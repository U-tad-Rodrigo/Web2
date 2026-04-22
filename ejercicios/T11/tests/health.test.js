import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

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

after(() => server.close());

describe('GET /api/health', () => {
  it('responde con shape correcta independientemente del estado de BD', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    // 200 si BD conectada, 503 si no — ambos son válidos
    assert.ok([200, 503].includes(res.status), `status inesperado: ${res.status}`);
    const body = await res.json();
    assert.ok(['ok', 'error'].includes(body.status));
    assert.ok(body.timestamp);
    assert.ok(typeof body.uptime === 'number');
    assert.ok(['connected', 'disconnected'].includes(body.database));
  });

  it('responde 200 y database:connected con BD real', { skip: !process.env.DATABASE_URL }, async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.database, 'connected');
  });
});
