import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

let userToken;
let bookId;

beforeAll(async () => {
  await prisma.review.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();

  const reg = await request(app).post('/api/auth/register').send({
    name: 'Lector',
    email: 'lector@test.com',
    password: 'password123',
  });
  userToken = reg.body.token;

  // Crear libro como admin
  await prisma.user.update({ where: { email: 'lector@test.com' }, data: { role: 'ADMIN' } });
  const login = await request(app).post('/api/auth/login').send({ email: 'lector@test.com', password: 'password123' });
  const adminToken = login.body.token;

  const book = await request(app)
    .post('/api/books')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: 'Libro Préstamo', author: 'Autor', genre: 'Test', isbn: '978-1111111111', copies: 2 });
  bookId = book.body.data.id;

  // Volver a USER
  await prisma.user.update({ where: { email: 'lector@test.com' }, data: { role: 'USER' } });
  const relogin = await request(app).post('/api/auth/login').send({ email: 'lector@test.com', password: 'password123' });
  userToken = relogin.body.token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/loans', () => {
  it('crea un préstamo con token válido', async () => {
    const res = await request(app)
      .post('/api/loans')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ bookId });

    expect(res.status).toBe(201);
    expect(res.body.data.bookId).toBe(bookId);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).post('/api/loans').send({ bookId });
    expect(res.status).toBe(401);
  });

  it('devuelve 409 si ya tienes ese libro en préstamo', async () => {
    const res = await request(app)
      .post('/api/loans')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ bookId });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/loans', () => {
  it('devuelve los préstamos del usuario autenticado', async () => {
    const res = await request(app)
      .get('/api/loans')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/loans');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/loans/:id/return', () => {
  it('devuelve el libro y cambia estado a RETURNED', async () => {
    const loans = await request(app)
      .get('/api/loans')
      .set('Authorization', `Bearer ${userToken}`);
    const loanId = loans.body.data[0].id;

    const res = await request(app)
      .put(`/api/loans/${loanId}/return`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('RETURNED');
  });

  it('devuelve 409 si el préstamo ya fue devuelto', async () => {
    const loans = await request(app)
      .get('/api/loans')
      .set('Authorization', `Bearer ${userToken}`);
    const loanId = loans.body.data[0].id;

    const res = await request(app)
      .put(`/api/loans/${loanId}/return`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(409);
  });
});
