import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/test-db.js';

const USER_BASE = '/api/user';
const CLIENT_BASE = '/api/client';
const PROJECT_BASE = '/api/project';
const DELIVERYNOTE_BASE = '/api/deliverynote';
const DASHBOARD_BASE = '/api/dashboard';

const registerUser = async (email, password = 'password123') =>
  request(app).post(`${USER_BASE}/register`).send({ email, password });

const getVerificationCode = async (email) => {
  const user = await User.findOne({ email }).select('+verificationCode');
  return user?.verificationCode;
};

const verifyEmail = async (token, code) =>
  request(app)
    .put(`${USER_BASE}/validation`)
    .set('Authorization', `Bearer ${token}`)
    .send({ code });

const loginUser = async (email, password = 'password123') =>
  request(app).post(`${USER_BASE}/login`).send({ email, password });

const setupVerifiedUser = async (email, password = 'password123') => {
  const reg = await registerUser(email, password);
  const { accessToken } = reg.body.data;
  const code = await getVerificationCode(email);
  await verifyEmail(accessToken, code);
  const log = await loginUser(email, password);
  return { accessToken: log.body.data.accessToken, email };
};

const setupUserWithCompany = async (email, cif = 'B12345678') => {
  const { accessToken } = await setupVerifiedUser(email);
  await request(app)
    .put(`${USER_BASE}/register`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Ada', lastName: 'Lovelace', nif: '12345678A' });
  await request(app)
    .patch(`${USER_BASE}/company`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ isFreelance: false, name: 'TechCorp SL', cif, address: {} });
  return { accessToken };
};

const createClient = (token, cif) =>
  request(app).post(CLIENT_BASE).set('Authorization', `Bearer ${token}`).send({
    name: 'Acme', cif, email: 'a@a.com', address: { city: 'Madrid', province: 'Madrid' },
  });

const createProject = (token, clientId, projectCode) =>
  request(app).post(PROJECT_BASE).set('Authorization', `Bearer ${token}`).send({
    client: clientId, name: 'Obra X', projectCode, email: 'p@p.com',
    address: { city: 'Madrid', province: 'Madrid' },
  });

const createNote = (token, clientId, projectId, payload) =>
  request(app).post(DELIVERYNOTE_BASE).set('Authorization', `Bearer ${token}`).send({
    client: clientId, project: projectId, ...payload,
  });

describe('BildyApp API - /api/dashboard', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await closeTestDb(); });

  test('401 rejects unauthenticated requests', async () => {
    const res = await request(app).get(DASHBOARD_BASE);
    expect(res.statusCode).toBe(401);
  });

  test('200 returns aggregated stats for the company only', async () => {
    const { accessToken } = await setupUserWithCompany('admin@bildyapp.com', 'B11111111');
    const other = await setupUserWithCompany('admin2@bildyapp.com', 'B22222222');

    const c1 = await createClient(accessToken, 'B-CLI-001');
    const c2 = await createClient(accessToken, 'B-CLI-002');
    const p1 = await createProject(accessToken, c1.body.data.client._id, 'P-001');
    const p2 = await createProject(accessToken, c2.body.data.client._id, 'P-002');

    // Compañía A: 3 albaranes (2 hours, 1 material), uno de ellos firmado
    await createNote(accessToken, c1.body.data.client._id, p1.body.data.project._id, {
      format: 'hours', workDate: '2026-04-10', hours: 5, workers: [{ name: 'Ada', hours: 5 }],
    });
    await createNote(accessToken, c1.body.data.client._id, p1.body.data.project._id, {
      format: 'hours', workDate: '2026-04-15', hours: 3, workers: [],
    });
    await createNote(accessToken, c2.body.data.client._id, p2.body.data.project._id, {
      format: 'material', workDate: '2026-04-20', material: 'Cemento', quantity: 50, unit: 'kg',
    });

    // Compañía B: un albarán que NO debe aparecer en la otra empresa
    const otherClient = await createClient(other.accessToken, 'B-CLI-999');
    const otherProject = await createProject(other.accessToken, otherClient.body.data.client._id, 'P-999');
    await createNote(other.accessToken, otherClient.body.data.client._id, otherProject.body.data.project._id, {
      format: 'material', workDate: '2026-04-20', material: 'Otra', quantity: 999, unit: 'u',
    });

    const res = await request(app).get(DASHBOARD_BASE).set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.totals).toEqual({ deliveryNotes: 3, clients: 2, projects: 2 });
    expect(res.body.data.deliveryNotesByFormat).toEqual({ material: 1, hours: 2 });
    expect(res.body.data.deliveryNotesBySigned).toEqual({ signed: 0, unsigned: 3 });

    // Horas por proyecto: solo proyectos con albaranes 'hours'
    const hoursPerProject = res.body.data.hoursPerProject;
    expect(hoursPerProject).toHaveLength(1);
    expect(hoursPerProject[0].projectCode).toBe('P-001');
    expect(hoursPerProject[0].totalHours).toBe(13); // 5 + 5(workers) + 3 = 13

    // Material por cliente
    const matPerClient = res.body.data.materialPerClient;
    expect(matPerClient).toHaveLength(1);
    expect(matPerClient[0].material).toBe('Cemento');
    expect(matPerClient[0].quantity).toBe(50);

    // Top clientes
    const top = res.body.data.topClients;
    expect(top.length).toBeGreaterThan(0);
    const totalNotes = top.reduce((sum, c) => sum + c.count, 0);
    expect(totalNotes).toBe(3);
  });

  test('200 returns zeroed stats for a fresh company', async () => {
    const { accessToken } = await setupUserWithCompany('empty@bildyapp.com', 'B33333333');

    const res = await request(app).get(DASHBOARD_BASE).set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.totals).toEqual({ deliveryNotes: 0, clients: 0, projects: 0 });
    expect(res.body.data.deliveryNotesByFormat).toEqual({ material: 0, hours: 0 });
    expect(res.body.data.deliveryNotesBySigned).toEqual({ signed: 0, unsigned: 0 });
    expect(res.body.data.hoursPerProject).toEqual([]);
    expect(res.body.data.materialPerClient).toEqual([]);
    expect(res.body.data.topClients).toEqual([]);
  });
});
