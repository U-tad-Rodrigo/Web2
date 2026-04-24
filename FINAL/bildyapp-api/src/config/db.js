import mongoose from 'mongoose';

const dbConnect = async () => {
  const DB_URI = process.env.DB_URI;

  if (!DB_URI) {
    console.error('[DB] DB_URI no esta definida en .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(DB_URI);
    console.log('[DB] Conectado a MongoDB');
  } catch (error) {
    console.error(`[DB] Error conectando a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[DB] Desconectado de MongoDB');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('[DB] Conexion a MongoDB cerrada');
  process.exit(0);
});

export default dbConnect;
