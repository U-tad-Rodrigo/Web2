import { env } from './config/env.js';
import app from './app.js';
import prisma from './config/prisma.js';
import logger from './config/logger.js';

const PORT = env.PORT;

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Conectado a la base de datos');

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
