import { io as ioClient } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app, { createHttpServer } from '../src/app.js';
import User from '../src/models/User.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/test-db.js';

const USER_BASE = '/api/user';
const CLIENT_BASE = '/api/client';

const registerUser = (email, password = 'password123') =>
  request(app).post(`${USER_BASE}/register`).send({ email, password });

const verifyEmail = async (email, token) => {
  const user = await User.findOne({ email }).select('+verificationCode');
  return request(app)
    .put(`${USER_BASE}/validation`)
    .set('Authorization', `Bearer ${token}`)
    .send({ code: user.verificationCode });
};

const loginUser = (email, password = 'password123') =>
  request(app).post(`${USER_BASE}/login`).send({ email, password });

const setupVerifiedUser = async (email, password = 'password123') => {
  const reg = await registerUser(email, password);
  await verifyEmail(email, reg.body.data.accessToken);
  const log = await loginUser(email, password);
  return log.body.data;
};

const setupUserWithCompany = async (email, cif) => {
  const tokens = await setupVerifiedUser(email);
  await request(app)
    .put(`${USER_BASE}/register`)
    .set('Authorization', `Bearer ${tokens.accessToken}`)
    .send({ name: 'Ada', lastName: 'Lovelace', nif: '12345678A' });
  await request(app)
    .patch(`${USER_BASE}/company`)
    .set('Authorization', `Bearer ${tokens.accessToken}`)
    .send({ isFreelance: false, name: 'TechCorp SL', cif, address: {} });
  return tokens;
};

const waitForEvent = (socket, event, timeoutMs = 4000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

describe('Socket.IO — autenticacion JWT y rooms por compania', () => {
  let server;
  let url;

  beforeAll(async () => {
    await connectTestDb();
    server = createHttpServer();
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    url = `http://localhost:${port}`;
  });

  afterEach(async () => { await clearTestDb(); });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await closeTestDb();
  });

  test('rechaza handshake sin token', async () => {
    const socket = ioClient(url, { transports: ['websocket'], reconnection: false });

    const err = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout sin connect_error')), 4000);
      socket.on('connect_error', (e) => {
        clearTimeout(timer);
        resolve(e);
      });
    });

    expect(err.message).toMatch(/Token no proporcionado|jwt/i);
    socket.close();
  });

  test('rechaza handshake con JWT invalido', async () => {
    const socket = ioClient(url, {
      transports: ['websocket'],
      reconnection: false,
      auth: { token: 'jwt.invalido.aqui' },
    });

    const err = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout sin connect_error')), 4000);
      socket.on('connect_error', (e) => {
        clearTimeout(timer);
        resolve(e);
      });
    });

    expect(err.message).toMatch(/Token invalido|invalido/i);
    socket.close();
  });

  test('rechaza handshake si el usuario no tiene compania asignada', async () => {
    const { accessToken } = await setupVerifiedUser('nocompany@bildyapp.com');

    const socket = ioClient(url, {
      transports: ['websocket'],
      reconnection: false,
      auth: { token: accessToken },
    });

    const err = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout sin connect_error')), 4000);
      socket.on('connect_error', (e) => {
        clearTimeout(timer);
        resolve(e);
      });
    });

    expect(err.message).toMatch(/sin empresa/i);
    socket.close();
  });

  test('emite client:new al room de la propia compania al crear cliente via REST', async () => {
    const { accessToken } = await setupUserWithCompany('admin@bildyapp.com', 'B11111111');

    const socket = ioClient(url, {
      transports: ['websocket'],
      reconnection: false,
      auth: { token: accessToken },
    });

    await waitForEvent(socket, 'socket:ready');

    const eventPromise = waitForEvent(socket, 'client:new');

    await request(app)
      .post(CLIENT_BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Acme Construccion',
        cif: 'B87654321',
        email: 'contacto@acme.test',
        address: { city: 'Madrid', province: 'Madrid' },
      });

    const payload = await eventPromise;
    expect(payload).toBeDefined();
    expect(payload.client).toBeDefined();
    expect(payload.client.cif).toBe('B87654321');

    socket.close();
  });

  test('NO emite client:new a sockets de otra compania (aislamiento por room)', async () => {
    const owner = await setupUserWithCompany('owner@bildyapp.com', 'B11111111');
    const other = await setupUserWithCompany('other@bildyapp.com', 'B22222222');

    const otherSocket = ioClient(url, {
      transports: ['websocket'],
      reconnection: false,
      auth: { token: other.accessToken },
    });
    await waitForEvent(otherSocket, 'socket:ready');

    let receivedOnOther = false;
    otherSocket.on('client:new', () => { receivedOnOther = true; });

    // Owner crea un cliente en su propia compania
    await request(app)
      .post(CLIENT_BASE)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Cliente solo para owner',
        cif: 'B91919191',
        address: { city: 'Madrid', province: 'Madrid' },
      });

    // Da margen al event loop para que llegara si fuese a llegar
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(receivedOnOther).toBe(false);
    otherSocket.close();
  });

  test('rechaza handshake si el usuario referenciado fue eliminado', async () => {
    const { accessToken } = await setupUserWithCompany('todelete@bildyapp.com', 'B33333333');
    // Decodifica el token para sacar el id (sin verificar firma — solo lectura)
    const payload = jwt.decode(accessToken);
    await User.findByIdAndDelete(payload.id);

    const socket = ioClient(url, {
      transports: ['websocket'],
      reconnection: false,
      auth: { token: accessToken },
    });

    const err = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout sin connect_error')), 4000);
      socket.on('connect_error', (e) => {
        clearTimeout(timer);
        resolve(e);
      });
    });

    expect(err.message).toMatch(/no autorizado|no encontrado|Token invalido/i);
    socket.close();
  });
});
