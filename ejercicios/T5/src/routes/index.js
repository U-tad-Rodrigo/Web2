import { Router } from 'express';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const router = Router();
const __dirname = import.meta.dirname;

const routeFiles = readdirSync(__dirname).filter((file) =>
  file.endsWith('.routes.js')
);

for (const file of routeFiles) {
  const routeName = file.replace('.routes.js', '');
  const routeModule = await import(pathToFileURL(join(__dirname, file)).href);
  router.use(`/${routeName}`, routeModule.default);
  console.log(`📍 Ruta cargada: /api/${routeName}`);
}

export default router;
