import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

let adminToken;

beforeAll(async () => {
  await prisma.review.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();

  // Crear admin para endpoints protegidos
  const reg = await request(app).post('/api/auth/register').send({
    name: 'Admin',
    email: 'admin@test.com',
    password: 'password123',
  });
  await prisma.user.update({ where: { email: 'admin@test.com' }, data: { role: 'ADMIN' } });

  const login = await request(app).post('/api/auth/login').send({
    email: 'admin@test.com',
    password: 'password123',
  });
  adminToken = login.body.token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

const validBook = {
  title: 'El Quijote',
  author: 'Cervantes',
  genre: 'Novela',
  isbn: '978-0000000001',
};

describe('GET /api/books', () => {
  it('devuelve lista paginada de libros', async () => {
    const res = await request(app).get('/api/books');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });
});

describe('POST /api/books', () => {
  it('crea un libro con rol ADMIN', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBook);

    expect(res.status).toBe(201);
    expect(res.body.data.isbn).toBe(validBook.isbn);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).post('/api/books').send(validBook);
    expect(res.status).toBe(401);
  });

  it('devuelve 400 si falta genre', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Libro', author: 'Autor', isbn: '978-9999999999' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/books/:id', () => {
  it('devuelve un libro por id', async () => {
    const created = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validBook, isbn: '978-0000000002' });

    const res = await request(app).get(`/api/books/${created.body.data.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(created.body.data.id);
  });

  it('devuelve 404 para id inexistente', async () => {
    const res = await request(app).get('/api/books/99999');
    expect(res.status).toBe(404);
  });
});
