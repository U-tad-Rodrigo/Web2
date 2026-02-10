import app from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`Entorno: ${env.NODE_ENV}`);
  console.log(`\nEndpoints disponibles:`);
  console.log(`   - GET    /health`);
  console.log(`   - GET    /api`);
  console.log(`   - GET    /api/cursos/programacion`);
  console.log(`   - GET    /api/cursos/matematicas`);
  console.log(`\nPresiona Ctrl+C para detener el servidor`);
});

