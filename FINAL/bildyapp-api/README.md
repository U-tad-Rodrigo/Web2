# BildyApp API

API REST para la digitalización de albaranes de obra. Gestiona usuarios, empresas, clientes, proyectos y partes de trabajo (horas o materiales) con firma digital, generación de PDFs, notificaciones en tiempo real y monitorización de errores.

Práctica final del curso PW2 — temas T8 a T13.

## Tecnologías

| Categoría | Tecnología |
|-----------|------------|
| Runtime | Node.js 22+ (ESM) |
| Framework | Express 5 |
| Base de datos | MongoDB + Mongoose |
| Autenticación | JWT (access + refresh) + bcryptjs |
| Validación | Zod (transform, refine, discriminatedUnion) |
| Documentación | Swagger / OpenAPI 3.0 (`/api-docs`) |
| Tests | Jest + Supertest + `mongodb-memory-server` |
| Tiempo real | Socket.IO (rooms por compañía, JWT en handshake) |
| Subida de archivos | Multer + Sharp + Cloudinary |
| PDFs | pdfkit |
| Email | Nodemailer |
| Monitorización | Slack Incoming Webhook (errores 5XX) |
| Contenedores | Docker (multi-stage) + Docker Compose |
| CI/CD | GitHub Actions |
| Seguridad | Helmet, express-rate-limit, express-mongo-sanitize |

## Requisitos

- Node.js >= 22.0.0
- MongoDB local o Atlas (no necesario para tests — se usa `mongodb-memory-server`)
- (Opcional) cuenta Cloudinary, SMTP y Slack webhook para entornos productivos

## Instalación y ejecución local

```bash
npm install
cp .env.example .env       # rellena las variables (al menos DB_URI y JWT_SECRET)
npm run dev                # arranca con --watch en http://localhost:3000
```

Scripts disponibles:

| Script | Acción |
|--------|--------|
| `npm run dev` | Servidor en modo watch |
| `npm start` | Servidor en modo producción |
| `npm test` | Ejecuta los tests con MongoDB en memoria |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:coverage` | Tests + informe de cobertura |

## Ejecución con Docker

```bash
docker compose up --build
```

Levanta dos servicios:

- `api` — el contenedor Node con la API en `http://localhost:3000`
- `mongo` — MongoDB 7 con healthcheck (`mongosh ping`) y volumen persistente

Las uploads (firmas locales) se persisten en un volumen Docker (`uploads`).

## Variables de entorno

Ver `.env.example` para la lista completa. Las imprescindibles:

| Variable | Uso |
|----------|-----|
| `DB_URI` | Cadena de conexión a MongoDB |
| `JWT_SECRET` | Secreto de firma JWT |
| `JWT_EXPIRES_IN` | Duración del access token (`15m` por defecto) |
| `REFRESH_TOKEN_DAYS` | Duración del refresh token en días |
| `CLOUDINARY_*` | Credenciales Cloudinary para firmas y PDFs (opcional) |
| `MAIL_*` | SMTP para verificación e invitaciones (opcional) |
| `SLACK_WEBHOOK_URL` | Webhook de Slack para errores 5XX (opcional) |

Si las variables opcionales no están definidas, el servicio degrada con gracia (Cloudinary → URL local; mail → log; Slack → no-op).

## Endpoints

### Autenticación y usuarios

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/user/register` | — | Registro (devuelve tokens, manda email de verificación) |
| PUT | `/api/user/validation` | JWT | Verificar email con código |
| POST | `/api/user/login` | — | Login (devuelve tokens) |
| POST | `/api/user/refresh` | — | Renovar access token |
| POST | `/api/user/logout` | JWT | Cerrar sesión (invalida refresh) |
| PUT | `/api/user/register` | JWT | Actualizar datos personales |
| PATCH | `/api/user/company` | JWT | Crear o unirse a empresa |
| PATCH | `/api/user/logo` | JWT | Subir logo (multipart) |
| PUT | `/api/user/password` | JWT | Cambiar contraseña |
| POST | `/api/user/invite` | JWT + admin | Invitar compañero |
| GET | `/api/user` | JWT | Perfil con empresa |
| DELETE | `/api/user?soft=true` | JWT | Eliminar cuenta (hard/soft) |

### Clientes

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/client` | Crear |
| GET | `/api/client` | Listar — `?page&limit&name&sort` |
| GET | `/api/client/archived` | Listar archivados |
| GET | `/api/client/:id` | Obtener |
| PUT | `/api/client/:id` | Actualizar |
| DELETE | `/api/client/:id?soft=true` | Archivar (soft) o borrar (hard) |
| PATCH | `/api/client/:id/restore` | Restaurar archivado |

### Proyectos

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/project` | Crear |
| GET | `/api/project` | Listar — `?page&limit&client&name&active&sort` |
| GET | `/api/project/archived` | Listar archivados |
| GET | `/api/project/:id` | Obtener (popula client) |
| PUT | `/api/project/:id` | Actualizar |
| DELETE | `/api/project/:id?soft=true` | Archivar (soft) o borrar (hard) |
| PATCH | `/api/project/:id/restore` | Restaurar archivado |

### Albaranes

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/deliverynote` | Crear (`format: 'material' \| 'hours'`) |
| GET | `/api/deliverynote` | Listar — `?page&limit&project&client&format&signed&from&to&sort` |
| GET | `/api/deliverynote/:id` | Obtener (popula user, client, project) |
| GET | `/api/deliverynote/pdf/:id` | Descargar PDF (redirige a Cloudinary si está firmado) |
| PATCH | `/api/deliverynote/:id/sign` | Firmar (multipart, sube firma + genera PDF) |
| DELETE | `/api/deliverynote/:id` | Borrar (solo si NO firmado) |

Un albarán firmado:
- No puede modificarse ni borrarse.
- Genera un PDF y lo sube a Cloudinary (resource `raw`); el `pdfUrl` se guarda en el modelo y la siguiente descarga redirige a la URL en la nube.

### Dashboard (bonus aggregation T5)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard` | Estadísticas agregadas de la compañía con MongoDB Aggregation Pipeline (totales, albaranes por mes, horas por proyecto, materiales por cliente, top-5 clientes, splits por formato y firma) |

### Sistema

| Ruta | Descripción |
|------|-------------|
| `GET /health` | Estado del servidor: `status`, `db`, `uptime`, `timestamp` |
| `GET /api-docs` | UI interactiva de Swagger |

## WebSockets (Socket.IO)

La conexión se autentica con el JWT en `auth.token` (cliente) o en la cabecera `Authorization: Bearer <token>` del handshake. Cada socket entra automáticamente en una *room* con el id de su `company`, así que los eventos se reparten solo a usuarios de la misma empresa.

Eventos emitidos por la API:

| Evento | Cuándo se emite |
|--------|-----------------|
| `client:new` | Al crear un cliente |
| `project:new` | Al crear un proyecto |
| `deliverynote:new` | Al crear un albarán |
| `deliverynote:signed` | Al firmar un albarán (incluye `pdfUrl` si Cloudinary está activo) |

Tras conectarse, el servidor emite `socket:ready` con `{ userId, company }`.

## Tests y cobertura

```bash
npm test                # 95 tests E2E (auth, client, project, deliverynote)
npm run test:coverage   # cobertura ~80% statements (umbral del enunciado: 70%)
```

Los tests usan `mongodb-memory-server`, no requieren Mongo instalado. CI los ejecuta automáticamente con GitHub Actions (`.github/workflows/test.yml`) en cada push/PR a `main`.

## Estructura del proyecto

```
bildyapp-api/
├── src/
│   ├── config/           # db.js, swagger.js
│   ├── controllers/      # user, client, project, deliverynote
│   ├── middleware/       # auth, role, validate, upload, error-handler
│   ├── models/           # User, Company, Client, Project, DeliveryNote
│   ├── routes/           # /api/{user,client,project,deliverynote}
│   ├── services/         # cloudinary, pdf, mail, slack, socket, notification
│   ├── utils/            # AppError
│   ├── validators/       # esquemas Zod por entidad
│   ├── app.js            # Express + Helmet + Swagger + Socket
│   └── index.js          # arranque + graceful shutdown SIGTERM/SIGINT
├── tests/                # 4 suites: user / client / project / deliverynote
├── uploads/              # ficheros locales (volumen Docker)
├── .github/workflows/    # CI con GitHub Actions
├── Dockerfile            # multi-stage Node 22 alpine
├── docker-compose.yml    # api + mongo
├── bildyapp.http         # peticiones de ejemplo (REST Client)
├── jest.config.js
└── .env.example
```

## Recursos

- Documentación Swagger interactiva: `http://localhost:3000/api-docs`
- Health check: `http://localhost:3000/health`
- Colección de peticiones: `bildyapp.http` (compatible con la extensión REST Client de VS Code)
