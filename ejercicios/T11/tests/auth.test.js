import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

beforeEach(async () => {
  await prisma.review.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const validUser = { name: 'Test User', email: 'test@test.com', password: 'password123' };

describe('POST /api/auth/register', () => {
  it('registra un usuario y devuelve token + user', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.password).toBeUndefined();
  });

  it('devuelve 400 si falta el email', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Test', password: 'pass123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(true);
  });

  it('devuelve 400 si la contraseña tiene menos de 6 caracteres', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Test', email: 'a@a.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('devuelve 409 si el email ya está registrado', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('inicia sesión con credenciales correctas', async () => {
    await request(app).post('/api/auth/register').send(validUser);

    const res = await request(app).post('/api/auth/login').send({
      email: validUser.email,
      password: validUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('devuelve 401 con contraseña incorrecta', async () => {
    await request(app).post('/api/auth/register').send(validUser);

    const res = await request(app).post('/api/auth/login').send({
      email: validUser.email,
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('devuelve el usuario autenticado con token válido', async () => {
    const reg = await request(app).post('/api/auth/register').send(validUser);
    const token = reg.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
