import connectDB from './config/db.js';
import { httpServer } from './app.js';

if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET no está definida en las variables de entorno');
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
});
