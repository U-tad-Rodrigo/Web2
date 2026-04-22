API REST de biblioteca digital desplegada en Railway — T11 Deploy & DevOps.
Aplica los conceptos de PostgreSQL + Prisma (T9) añadiendo la capa completa de producción: Docker, CI/CD, PM2, logging estructurado y monitorización.

Stack: Node.js 22, Express 5, PostgreSQL 16, Prisma 6.

URL en producción: https://biblioteca-api-production-d99b.up.railway.app

Endpoints:
  GET    /api/health         estado del servidor y BD
  GET    /api/libros         lista todos los libros
  POST   /api/libros         crea un libro (titulo, autor, isbn requeridos)
  GET    /api/libros/:id     obtiene un libro por id
  DELETE /api/libros/:id     elimina un libro

Arrancar en local:
  cp .env.example .env        (rellenar DATABASE_URL)
  npm install
  npm run dev

Con Docker Compose (incluye PostgreSQL):
  docker compose up --build

Las migraciones corren solas al arrancar (prisma migrate deploy).

Tests:
  npm test                    (requiere DATABASE_URL en .env o entorno)

Variables de entorno:
  DATABASE_URL     — conexión a PostgreSQL (obligatoria)
  PORT             — puerto del servidor (default: 3000)
  NODE_ENV         — development | production | test
  ALLOWED_ORIGIN   — origen permitido en CORS (producción)
  LOG_LEVEL        — nivel de log de Pino (default: info)

Deploy:
  Push a main → GitHub Actions corre los tests → Railway despliega automáticamente.
