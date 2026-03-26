import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer;

export const connectTestDb = async () => {
  if (!process.env.MONGODB_TEST_URI) {
    memoryServer = await MongoMemoryServer.create();
    process.env.MONGODB_TEST_URI = memoryServer.getUri();
  }

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test_secret_12345678901234567890';
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI);
  }
};

export const clearTestDb = async () => {
  const collections = mongoose.connection.collections;
  const tasks = Object.keys(collections).map((key) => collections[key].deleteMany({}));
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

