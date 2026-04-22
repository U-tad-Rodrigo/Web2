import app from './app.js';
import prisma from './config/prisma.js';
import logger from './config/logger.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Conectado a Supabase (PostgreSQL)');

    const server = app.listen(PORT, () => {
      logger.info({ port: PORT, env: process.env.NODE_ENV }, 'Servidor iniciado');
    });

    const shutdown = async (signal) => {
      logger.info(`${signal} recibido. Cerrando servidor...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Servidor cerrado');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error(err, 'Error al iniciar el servidor');
    process.exit(1);
  }
};

startServer();
