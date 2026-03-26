import mongoose from 'mongoose';

export const dbConnect = async (uri = process.env.MONGODB_URI) => {
  if (!uri) throw new Error('MONGODB_URI no configurada');

  await mongoose.connect(uri);
  return mongoose.connection;
};

export const dbDisconnect = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

