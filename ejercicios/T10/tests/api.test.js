import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod, httpServer, baseUrl;

// ─── Setup global ────────────────────────────────────────────────────────────

before(async () => {
  process.env.JWT_SECRET = 'test-secret-key-minimum-length-for-jwt!!';

  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGODB_URI);

  // Import dinámico DESPUÉS de fijar env vars (jwt.js los lee en tiempo de llamada)
  const { httpServer: srv } = await import('../src/app.js');
  httpServer = srv;

  await new Promise((resolve) => httpServer.listen(0, resolve));
  baseUrl = `http://localhost:${httpServer.address().port}`;
});

after(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const json = (res) => res.json();

async function register(username, email, password = 'password123') {
  return fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
}

async function login(email, password = 'password123') {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

// ─── Auth: register ───────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  test('201 — crea usuario y devuelve token', async () => {
    const res = await register('alice', 'alice@test.com');
    assert.equal(res.status, 201);
    const data = await json(res);
    assert.ok(data.token, 'debe devolver token');
    assert.equal(data.user.username, 'alice');
    assert.equal(data.user.email, 'alice@test.com');
    assert.equal(data.user.password, undefined, 'no debe exponer password');
  });

  test('400 — faltan campos obligatorios', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'incomplete' }),
    });
    assert.equal(res.status, 400);
  });

  test('409 — email duplicado', async () => {
    const res = await register('alice2', 'alice@test.com');
    assert.equal(res.status, 409);
  });

  test('409 — username duplicado', async () => {
    const res = await register('alice', 'different@test.com');
    assert.equal(res.status, 409);
  });
});

// ─── Auth: login ──────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  test('200 — credenciales válidas devuelven token', async () => {
    const res = await login('alice@test.com');
    assert.equal(res.status, 200);
    const data = await json(res);
    assert.ok(data.token);
    assert.equal(data.user.password, undefined, 'no debe exponer password');
  });

  test('401 — password incorrecta', async () => {
    const res = await login('alice@test.com', 'wrongpassword');
    assert.equal(res.status, 401);
  });

  test('401 — email no registrado', async () => {
    const res = await login('noexiste@test.com');
    assert.equal(res.status, 401);
  });

  test('400 — body vacío', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
});

// ─── Auth: /me ────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  test('200 — devuelve perfil con token válido', async () => {
    const { token } = await login('alice@test.com').then(json);
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await json(res);
    assert.equal(data.user.username, 'alice');
    assert.equal(data.user.password, undefined);
  });

  test('401 — sin token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(res.status, 401);
  });

  test('401 — token malformado', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer estonoesuntoken' },
    });
    assert.equal(res.status, 401);
  });
});

// ─── Rooms ────────────────────────────────────────────────────────────────────

describe('GET /api/rooms', () => {
  test('401 — sin token', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`);
    assert.equal(res.status, 401);
  });

  test('200 — devuelve array de salas con token válido', async () => {
    const { token } = await login('alice@test.com').then(json);
    const res = await fetch(`${baseUrl}/api/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await json(res);
    assert.ok(Array.isArray(data.rooms));
  });
});

describe('POST /api/rooms', () => {
  let token;

  before(async () => {
    ({ token } = await login('alice@test.com').then(json));
  });

  test('201 — crea sala correctamente', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'general', description: 'Sala principal' }),
    });
    assert.equal(res.status, 201);
    const data = await json(res);
    assert.equal(data.room.name, 'general');
    assert.ok(data.room.createdBy, 'debe incluir createdBy populado');
    assert.equal(data.room.createdBy.username, 'alice');
  });

  test('409 — nombre de sala duplicado', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'general' }),
    });
    assert.equal(res.status, 409);
  });

  test('400 — sin nombre', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ description: 'sala sin nombre' }),
    });
    assert.equal(res.status, 400);
  });

  test('401 — sin token', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'sala-sin-auth' }),
    });
    assert.equal(res.status, 401);
  });
});

// ─── Rooms: messages ─────────────────────────────────────────────────────────

describe('GET /api/rooms/:id/messages', () => {
  let token, roomId;

  before(async () => {
    ({ token } = await login('alice@test.com').then(json));
    const { rooms } = await fetch(`${baseUrl}/api/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(json);
    roomId = rooms[0]?._id;
  });

  test('200 — devuelve array de mensajes para sala válida', async () => {
    assert.ok(roomId, 'precondición: debe existir al menos una sala');
    const res = await fetch(`${baseUrl}/api/rooms/${roomId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await json(res);
    assert.ok(Array.isArray(data.messages));
  });

  test('404 — sala inexistente', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await fetch(`${baseUrl}/api/rooms/${fakeId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 404);
  });

  test('401 — sin token', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/${roomId}/messages`);
    assert.equal(res.status, 401);
  });
});
