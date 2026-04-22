import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/config/prisma.js';
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

after(async () => {
  server.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.libro.deleteMany();
});

describe('POST /api/libros', () => {
  it('crea libro con datos válidos y devuelve 201', async () => {
    const res = await fetch(`${baseUrl}/api/libros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'El Quijote', autor: 'Cervantes', isbn: '978-0000000001' }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.titulo, 'El Quijote');
    assert.equal(body.autor, 'Cervantes');
    assert.equal(body.isbn, '978-0000000001');
    assert.ok(body.id);
  });

  it('devuelve 400 si falta titulo', async () => {
    const res = await fetch(`${baseUrl}/api/libros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autor: 'Autor', isbn: '978-0000000002' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, true);
  });

  it('devuelve 400 si falta autor', async () => {
    const res = await fetch(`${baseUrl}/api/libros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Titulo', isbn: '978-0000000003' }),
    });
    assert.equal(res.status, 400);
  });

  it('devuelve 400 si falta isbn', async () => {
    const res = await fetch(`${baseUrl}/api/libros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Titulo', autor: 'Autor' }),
    });
    assert.equal(res.status, 400);
  });

  it('devuelve 409 si isbn duplicado', async () => {
    const payload = { titulo: 'Libro A', autor: 'Autor A', isbn: '978-0000000004' };
    await fetch(`${baseUrl}/api/libros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const res = await fetch(`${baseUrl}/api/libros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Libro B', autor: 'Autor B', isbn: '978-0000000004' }),
    });
    assert.equal(res.status, 409);
  });

  it('ignora campos extra (mass assignment)', async () => {
    const res = await fetch(`${baseUrl}/api/libros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'T', autor: 'A', isbn: '978-0000000005', id: 'hacked', createdAt: '1970-01-01' }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.notEqual(body.id, 'hacked');
  });
});

describe('GET /api/libros', () => {
  it('devuelve array vacío cuando no hay libros', async () => {
    const res = await fetch(`${baseUrl}/api/libros`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, []);
  });

  it('devuelve los libros existentes', async () => {
    await prisma.libro.create({ data: { titulo: 'T1', autor: 'A1', isbn: '978-1111111111' } });
    await prisma.libro.create({ data: { titulo: 'T2', autor: 'A2', isbn: '978-2222222222' } });
    const res = await fetch(`${baseUrl}/api/libros`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.length, 2);
  });
});

describe('GET /api/libros/:id', () => {
  it('devuelve el libro por id', async () => {
    const { id } = await prisma.libro.create({ data: { titulo: 'T', autor: 'A', isbn: '978-3333333333' } });
    const res = await fetch(`${baseUrl}/api/libros/${id}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.id, id);
  });

  it('devuelve 404 para id inexistente', async () => {
    const res = await fetch(`${baseUrl}/api/libros/id-que-no-existe`);
    assert.equal(res.status, 404);
  });
});

describe('DELETE /api/libros/:id', () => {
  it('elimina el libro y devuelve 204', async () => {
    const { id } = await prisma.libro.create({ data: { titulo: 'T', autor: 'A', isbn: '978-4444444444' } });
    const res = await fetch(`${baseUrl}/api/libros/${id}`, { method: 'DELETE' });
    assert.equal(res.status, 204);
    const found = await prisma.libro.findUnique({ where: { id } });
    assert.equal(found, null);
  });

  it('devuelve 404 al borrar id inexistente', async () => {
    const res = await fetch(`${baseUrl}/api/libros/id-que-no-existe`, { method: 'DELETE' });
    assert.equal(res.status, 404);
  });
});
