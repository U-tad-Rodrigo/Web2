API REST de biblioteca digital desplegada en Railway — T11 Deploy & DevOps.
Aplica los conceptos de PostgreSQL + Prisma (T9) añadiendo la capa completa de producción: Docker, CI/CD, PM2, logging estructurado y monitorización.

Stack: Node.js 22, Express 5, PostgreSQL 16, Prisma 6.

URL en producción: https://biblioteca-api-production-d99b.up.railway.app

Endpoints:
  GET    /api/health              estado del servidor y BD
  POST   /api/auth/register       registro de usuario
  POST   /api/auth/login          login, devuelve JWT
  GET    /api/auth/me             perfil del usuario autenticado
  GET    /api/books               lista paginada de libros
  POST   /api/books               crea un libro (LIBRARIAN/ADMIN)
  GET    /api/books/:id           obtiene un libro con reseñas
  PUT    /api/books/:id           actualiza un libro (LIBRARIAN/ADMIN)
  DELETE /api/books/:id           elimina un libro (ADMIN)
  GET    /api/loans               mis préstamos activos
  POST   /api/loans               solicitar préstamo (máx. 3 activos, 14 días)
  PUT    /api/loans/:id/return    devolver un libro
  GET    /api/books/:id/reviews   reseñas de un libro
  POST   /api/books/:id/reviews   crear reseña (requiere devolución previa)
  DELETE /api/reviews/:id         eliminar mi reseña

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
