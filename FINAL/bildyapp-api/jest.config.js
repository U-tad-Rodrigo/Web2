export default {
  testEnvironment: 'node',
  transform: {},
  testTimeout: 30000,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',     // arranca el servidor — no testeable con supertest
    '!src/config/db.js', // conexion a MongoDB — no testeable directamente
  ],
};

