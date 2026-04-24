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
    name: 'Crítico',
    email: 'critico@test.com',
    password: 'password123',
  });

  // Crear libro como admin
  await prisma.user.update({ where: { email: 'critico@test.com' }, data: { role: 'ADMIN' } });
  const adminLogin = await request(app).post('/api/auth/login').send({ email: 'critico@test.com', password: 'password123' });
  const adminToken = adminLogin.body.token;

  const book = await request(app)
    .post('/api/books')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: 'Libro Reseña', author: 'Autor', genre: 'Test', isbn: '978-2222222222' });
  bookId = book.body.data.id;

  // Volver a USER y hacer préstamo + devolución para poder reseñar
  await prisma.user.update({ where: { email: 'critico@test.com' }, data: { role: 'USER' } });
  const userLogin = await request(app).post('/api/auth/login').send({ email: 'critico@test.com', password: 'password123' });
  userToken = userLogin.body.token;

  const loan = await request(app)
    .post('/api/loans')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ bookId });
  const loanId = loan.body.data.id;

  await request(app)
    .put(`/api/loans/${loanId}/return`)
    .set('Authorization', `Bearer ${userToken}`);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/books/:bookId/reviews', () => {
  it('devuelve las reseñas del libro (lista vacía inicial)', async () => {
    const res = await request(app).get(`/api/books/${bookId}/reviews`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('devuelve 404 para bookId inexistente', async () => {
    const res = await request(app).get('/api/books/99999/reviews');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/books/:bookId/reviews', () => {
  it('crea una reseña tras devolver el libro', async () => {
    const res = await request(app)
      .post(`/api/books/${bookId}/reviews`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ rating: 5, comment: 'Excelente libro' });

    expect(res.status).toBe(201);
    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.bookId).toBe(bookId);
  });

  it('devuelve 409 si ya existe una reseña del mismo usuario', async () => {
    const res = await request(app)
      .post(`/api/books/${bookId}/reviews`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ rating: 3 });

    expect(res.status).toBe(409);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app)
      .post(`/api/books/${bookId}/reviews`)
      .send({ rating: 4 });

    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/reviews/:id', () => {
  it('elimina la reseña propia', async () => {
    const reviews = await request(app).get(`/api/books/${bookId}/reviews`);
    const reviewId = reviews.body.data[0].id;

    const res = await request(app)
      .delete(`/api/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
  });

  it('devuelve 404 para reseña inexistente', async () => {
    const res = await request(app)
      .delete('/api/reviews/99999')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
  });
});
