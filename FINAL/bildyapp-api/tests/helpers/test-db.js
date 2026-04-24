import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer;

export const connectTestDb = async () => {
  // Entorno de test — desactiva rate limiter en app.js
  process.env.NODE_ENV = 'test';

  // Si viene MONGODB_TEST_URI del entorno la usamos; si no, levantamos una en memoria
  if (!process.env.MONGODB_TEST_URI) {
    memoryServer = await MongoMemoryServer.create();
    process.env.MONGODB_TEST_URI = memoryServer.getUri();
  }

  // Aseguramos que JWT_SECRET existe para los tests
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test_secret_bildyapp_12345678901234';
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI);
  }
};

export const clearTestDb = async () => {
  const { collections } = mongoose.connection;
  const tasks = Object.keys(collections).map((key) =>
    collections[key].deleteMany({}),
  );
  await Promise.all(tasks);
};

export const closeTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  if (memoryServer) {
    await memoryServer.stop();
  }
};


