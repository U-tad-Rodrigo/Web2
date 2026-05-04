import request from 'supertest';
import app from '../src/app.js';
import Client from '../src/models/Client.js';
import Project from '../src/models/Project.js';
import User from '../src/models/User.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/test-db.js';

const USER_BASE = '/api/user';
const CLIENT_BASE = '/api/client';
const PROJECT_BASE = '/api/project';

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

  return {
    accessToken: log.body.data.accessToken,
    refreshToken: log.body.data.refreshToken,
    email,
    password,
  };
};

const setupUserWithCompany = async (
  email = 'admin@bildyapp.com',
  password = 'password123',
  cif = 'B12345678',
) => {
  const { accessToken, refreshToken } = await setupVerifiedUser(email, password);

  await request(app)
    .put(`${USER_BASE}/register`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Ada', lastName: 'Lovelace', nif: '12345678A' });

  await request(app)
    .patch(`${USER_BASE}/company`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ isFreelance: false, name: 'TechCorp SL', cif, address: {} });

  return { accessToken, refreshToken, email, password, cif };
};

const createClient = async (token, payload = {}) =>
  request(app)
    .post(CLIENT_BASE)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Acme Construccion',
      cif: 'B87654321',
      email: 'contacto@acme.test',
      phone: '600123123',
      address: { city: 'Madrid', province: 'Madrid' },
      ...payload,
    });

const createProject = async (token, clientId, payload = {}) =>
  request(app)
    .post(PROJECT_BASE)
    .set('Authorization', `Bearer ${token}`)
    .send({
      client: clientId,
      name: 'Reforma oficinas',
      projectCode: 'PR-001',
      email: 'obra@acme.test',
      notes: 'Proyecto principal',
      address: { city: 'Madrid', province: 'Madrid' },
      ...payload,
    });

const setupUserClientAndProject = async (
  email = 'admin@bildyapp.com',
  companyCif = 'B12345678',
  clientCif = 'B87654321',
) => {
  const user = await setupUserWithCompany(email, 'password123', companyCif);
  const client = await createClient(user.accessToken, { cif: clientCif });
  const project = await createProject(user.accessToken, client.body.data.client._id);

  return {
    ...user,
    clientId: client.body.data.client._id,
    projectId: project.body.data.project._id,
  };
};

describe('BildyApp API - /api/project', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await closeTestDb(); });

  describe('POST /api/project', () => {
    test('201 creates a project linked to a client in the authenticated company', async () => {
      const { accessToken } = await setupUserWithCompany();
      const client = await createClient(accessToken);

      const res = await createProject(accessToken, client.body.data.client._id);

      expect(res.statusCode).toBe(201);
      expect(res.body.error).toBe(false);
      expect(res.body.data.project.name).toBe('Reforma oficinas');
      expect(res.body.data.project.projectCode).toBe('PR-001');
      expect(res.body.data.project.active).toBe(true);
      expect(res.body.data.project.client).toBe(client.body.data.client._id);

      const project = await Project.findOne({ projectCode: 'PR-001' });
      expect(project).not.toBeNull();
      expect(String(project.client)).toBe(client.body.data.client._id);
    });

    test('401 rejects requests without token', async () => {
      const res = await request(app)
        .post(PROJECT_BASE)
        .send({ client: '507f1f77bcf86cd799439011', name: 'Reforma', projectCode: 'PR-001' });

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('NOT_AUTHORIZED');
    });

    test('400 rejects users without company', async () => {
      const { accessToken } = await setupVerifiedUser('nocompany@bildyapp.com');

      const res = await createProject(accessToken, '507f1f77bcf86cd799439011');

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_COMPANY');
    });

    test('404 rejects a client from another company', async () => {
      const first = await setupUserWithCompany('admin1@bildyapp.com', 'password123', 'B11111111');
      const second = await setupUserWithCompany('admin2@bildyapp.com', 'password123', 'B22222222');
      const foreignClient = await createClient(first.accessToken);

      const res = await createProject(second.accessToken, foreignClient.body.data.client._id);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    test('409 rejects duplicate projectCode inside the same company', async () => {
      const { accessToken } = await setupUserWithCompany();
      const client = await createClient(accessToken);
      await createProject(accessToken, client.body.data.client._id, { projectCode: 'PR-001' });

      const res = await createProject(accessToken, client.body.data.client._id, { projectCode: 'PR-001' });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('CODE_TAKEN');
    });

    test('400 validates required client, name, and projectCode', async () => {
      const { accessToken } = await setupUserWithCompany();

      const res = await request(app)
        .post(PROJECT_BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'obra@acme.test' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details).toBeDefined();
    });
  });

  describe('GET /api/project', () => {
    test('200 lists active projects from the authenticated company with client populated', async () => {
      const first = await setupUserWithCompany('admin1@bildyapp.com', 'password123', 'B11111111');
      const second = await setupUserWithCompany('admin2@bildyapp.com', 'password123', 'B22222222');
      const client = await createClient(first.accessToken, { name: 'Alpha Cliente', cif: 'B10000001' });
      const otherClient = await createClient(second.accessToken, { name: 'Other Cliente', cif: 'B20000001' });
      await createProject(first.accessToken, client.body.data.client._id, { name: 'Alpha Reforma', projectCode: 'PR-001' });
      await createProject(first.accessToken, client.body.data.client._id, { name: 'Beta Reforma', projectCode: 'PR-002', active: false });
      await createProject(second.accessToken, otherClient.body.data.client._id, { name: 'Other Reforma', projectCode: 'PR-003' });

      const res = await request(app)
        .get(`${PROJECT_BASE}?name=reforma&active=true&limit=1&page=1&sort=name`)
        .set('Authorization', `Bearer ${first.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.data.projects).toHaveLength(1);
      expect(res.body.data.projects[0].name).toBe('Alpha Reforma');
      expect(res.body.data.projects[0].client.name).toBe('Alpha Cliente');
      expect(res.body.data.totalItems).toBe(1);
      expect(res.body.data.totalPages).toBe(1);
      expect(res.body.data.currentPage).toBe(1);
    });

    test('200 gets one project by id with client populated', async () => {
      const { accessToken, projectId } = await setupUserClientAndProject();

      const res = await request(app)
        .get(`${PROJECT_BASE}/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.project._id).toBe(projectId);
      expect(res.body.data.project.client.name).toBe('Acme Construccion');
      expect(res.body.data.project.client.cif).toBe('B87654321');
    });

    test('404 does not expose projects from another company', async () => {
      const first = await setupUserClientAndProject('admin1@bildyapp.com', 'B11111111', 'B10000001');
      const second = await setupUserWithCompany('admin2@bildyapp.com', 'password123', 'B22222222');

      const res = await request(app)
        .get(`${PROJECT_BASE}/${first.projectId}`)
        .set('Authorization', `Bearer ${second.accessToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/project/:id', () => {
    test('200 updates project fields and client reference', async () => {
      const { accessToken, projectId } = await setupUserClientAndProject();
      const secondClient = await createClient(accessToken, { name: 'Beta Cliente', cif: 'B87654322' });

      const res = await request(app)
        .put(`${PROJECT_BASE}/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Reforma oficinas fase 2',
          client: secondClient.body.data.client._id,
          active: false,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.data.project.name).toBe('Reforma oficinas fase 2');
      expect(res.body.data.project.client).toBe(secondClient.body.data.client._id);
      expect(res.body.data.project.active).toBe(false);
    });

    test('409 rejects changing projectCode to one already used by the company', async () => {
      const { accessToken, projectId, clientId } = await setupUserClientAndProject();
      await createProject(accessToken, clientId, { name: 'Second project', projectCode: 'PR-002' });

      const res = await request(app)
        .put(`${PROJECT_BASE}/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ projectCode: 'PR-002' });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('CODE_TAKEN');
    });

    test('404 rejects changing client to one from another company', async () => {
      const first = await setupUserClientAndProject('admin1@bildyapp.com', 'B11111111', 'B10000001');
      const second = await setupUserWithCompany('admin2@bildyapp.com', 'password123', 'B22222222');
      const foreignClient = await createClient(second.accessToken, { cif: 'B20000001' });

      const res = await request(app)
        .put(`${PROJECT_BASE}/${first.projectId}`)
        .set('Authorization', `Bearer ${first.accessToken}`)
        .send({ client: foreignClient.body.data.client._id });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/project/:id and PATCH /api/project/:id/restore', () => {
    test('200 soft deletes, lists as archived, and restores a project', async () => {
      const { accessToken, projectId } = await setupUserClientAndProject();

      const deleted = await request(app)
        .delete(`${PROJECT_BASE}/${projectId}?soft=true`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(deleted.statusCode).toBe(200);
      expect(deleted.body.message).toContain('soft');

      const list = await request(app)
        .get(PROJECT_BASE)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(list.body.data.projects).toHaveLength(0);

      const archived = await request(app)
        .get(`${PROJECT_BASE}/archived`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(archived.statusCode).toBe(200);
      expect(archived.body.data.projects).toHaveLength(1);
      expect(archived.body.data.projects[0]._id).toBe(projectId);
      expect(archived.body.data.projects[0].client.name).toBe('Acme Construccion');

      const restored = await request(app)
        .patch(`${PROJECT_BASE}/${projectId}/restore`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(restored.statusCode).toBe(200);
      expect(restored.body.data.project.deleted).toBe(false);
    });

    test('200 hard deletes a project document without deleting its client', async () => {
      const { accessToken, projectId, clientId } = await setupUserClientAndProject();

      const res = await request(app)
        .delete(`${PROJECT_BASE}/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('hard');
      await expect(Project.findById(projectId)).resolves.toBeNull();
      await expect(Client.findById(clientId)).resolves.not.toBeNull();
    });
  });
});
