import { createHttpServer } from './app.js';
import mongoose from 'mongoose';
import dbConnect from './config/db.js';
import { getSocket } from './services/socket.service.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await dbConnect();
  const server = createHttpServer();

  server.listen(PORT, () => {
    console.log(`[SERVER] BildyApp API corriendo en http://localhost:${PORT}`);
    console.log(`[SERVER] Entorno: ${process.env.NODE_ENV || 'development'}`);
  });

  const shutdown = async (signal) => {
    console.log(`[SERVER] ${signal} recibido. Cerrando servidor...`);
    getSocket()?.close();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
