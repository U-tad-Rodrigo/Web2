// src/index.js
import app from './app.js';
import prisma from './config/prisma.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Verificar conexión con la BD
    await prisma.$connect();
    console.log('✅ Conectado a Supabase (PostgreSQL)');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor en http://localhost:${PORT}`);
      console.log(`📚 Swagger UI en http://localhost:${PORT}/api-docs`);
    });

    // Apagado limpio
    const shutdown = async (signal) => {
      console.log(`\n${signal} recibido. Cerrando servidor...`);
      await prisma.$disconnect();
      server.close(() => process.exit(0));
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('❌ Error al iniciar el servidor:', err);
    process.exit(1);
  }
};

startServer();

