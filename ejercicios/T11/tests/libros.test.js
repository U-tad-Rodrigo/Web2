import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

beforeEach(async () => {
  await prisma.libro.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/libros', () => {
  it('crea libro con datos válidos y devuelve 201', async () => {
    const res = await request(app)
      .post('/api/libros')
      .send({ titulo: 'El Quijote', autor: 'Cervantes', isbn: '978-0000000001' });

    expect(res.status).toBe(201);
    expect(res.body.titulo).toBe('El Quijote');
    expect(res.body.autor).toBe('Cervantes');
    expect(res.body.isbn).toBe('978-0000000001');
    expect(res.body.id).toBeTruthy();
  });

  it('devuelve 400 si falta titulo', async () => {
    const res = await request(app)
      .post('/api/libros')
      .send({ autor: 'Autor', isbn: '978-0000000002' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(true);
  });

  it('devuelve 400 si falta autor', async () => {
    const res = await request(app)
      .post('/api/libros')
      .send({ titulo: 'Titulo', isbn: '978-0000000003' });

    expect(res.status).toBe(400);
  });

  it('devuelve 400 si falta isbn', async () => {
    const res = await request(app)
      .post('/api/libros')
      .send({ titulo: 'Titulo', autor: 'Autor' });

    expect(res.status).toBe(400);
  });

  it('devuelve 400 si titulo es string vacío', async () => {
    const res = await request(app)
      .post('/api/libros')
      .send({ titulo: '   ', autor: 'Autor', isbn: '978-0000000009' });

    expect(res.status).toBe(400);
  });

  it('devuelve 409 si isbn duplicado', async () => {
    await request(app)
      .post('/api/libros')
      .send({ titulo: 'Libro A', autor: 'Autor A', isbn: '978-0000000004' });

    const res = await request(app)
      .post('/api/libros')
      .send({ titulo: 'Libro B', autor: 'Autor B', isbn: '978-0000000004' });

    expect(res.status).toBe(409);
  });

  it('ignora campos extra (mass assignment)', async () => {
    const res = await request(app)
      .post('/api/libros')
      .send({ titulo: 'T', autor: 'A', isbn: '978-0000000005', id: 'hacked', createdAt: '1970-01-01' });

    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe('hacked');
  });
});

describe('GET /api/libros', () => {
  it('devuelve array vacío cuando no hay libros', async () => {
    const res = await request(app).get('/api/libros');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('devuelve los libros existentes', async () => {
    await prisma.libro.create({ data: { titulo: 'T1', autor: 'A1', isbn: '978-1111111111' } });
    await prisma.libro.create({ data: { titulo: 'T2', autor: 'A2', isbn: '978-2222222222' } });

    const res = await request(app).get('/api/libros');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /api/libros/:id', () => {
  it('devuelve el libro por id', async () => {
    const { id } = await prisma.libro.create({ data: { titulo: 'T', autor: 'A', isbn: '978-3333333333' } });

    const res = await request(app).get(`/api/libros/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('devuelve 404 para id inexistente', async () => {
    const res = await request(app).get('/api/libros/id-que-no-existe');

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/libros/:id', () => {
  it('elimina el libro y devuelve 204', async () => {
    const { id } = await prisma.libro.create({ data: { titulo: 'T', autor: 'A', isbn: '978-4444444444' } });

    const res = await request(app).delete(`/api/libros/${id}`);

    expect(res.status).toBe(204);
    expect(await prisma.libro.findUnique({ where: { id } })).toBeNull();
  });

  it('devuelve 404 al borrar id inexistente', async () => {
    const res = await request(app).delete('/api/libros/id-que-no-existe');

    expect(res.status).toBe(404);
  });
});
