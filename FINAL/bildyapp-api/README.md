# BildyApp API

API REST para la gestión de usuarios de BildyApp. Incluye registro, verificación de email, login con JWT (access + refresh token), onboarding de empresa, subida de logo y sistema de invitaciones.

## Tecnologías

| Categoría | Tecnología |
|-----------|------------|
| Runtime | Node.js 22+ (ESM) |
| Framework | Express 5 |
| Base de datos | MongoDB Atlas + Mongoose |
| Autenticación | JWT (jsonwebtoken) + bcryptjs |
| Validación | Zod (transform, refine, discriminatedUnion) |
| Subida de archivos | Multer |
| Seguridad | Helmet, express-rate-limit, express-mongo-sanitize |
| Tests | Jest + Supertest + MongoDB in-memory |

## Requisitos

- Node.js >= 22.0.0
- MongoDB Atlas (o local)

## Instalación

```bash
npm install
```

## Configuración

```bash
cp .env.example .env
```

Completa las variables en `.env`:

```
DB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/bildyapp?retryWrites=true&w=majority
JWT_SECRET=cambia_esto_por_un_secreto_largo_y_seguro
```

## Ejecutar en desarrollo

```bash
npm run dev
```

Servidor arrancado en `http://localhost:3000`.

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/user/register` | — | Registro (devuelve tokens) |
| PUT | `/api/user/validation` | JWT | Verificar email con código |
| POST | `/api/user/login` | — | Login (devuelve tokens) |
| PUT | `/api/user/register` | JWT | Actualizar datos personales |
| PATCH | `/api/user/company` | JWT | Alta o unión a empresa |
| PATCH | `/api/user/logo` | JWT | Subir logo de empresa |
| GET | `/api/user` | JWT | Obtener perfil con empresa |
| POST | `/api/user/refresh` | — | Renovar access token |
| POST | `/api/user/logout` | JWT | Cerrar sesión |
| DELETE | `/api/user` | JWT | Eliminar cuenta (hard/soft) |
| PUT | `/api/user/password` | JWT | Cambiar contraseña |
| POST | `/api/user/invite` | JWT + admin | Invitar compañero |

## WebSockets

Socket.IO usa el mismo servidor HTTP que Express. La conexion requiere JWT en `auth.token` o en `Authorization: Bearer <token>`.

Cada socket autenticado entra en una room con el id de su `company`, por lo que los eventos solo llegan a usuarios de la misma empresa.

Eventos emitidos:

| Evento | Cuando se emite |
|--------|-----------------|
| `client:new` | Al crear un cliente |
| `project:new` | Al crear un proyecto |
| `deliverynote:new` | Al crear un albaran |
| `deliverynote:signed` | Al firmar un albaran |

## Tests

Los tests usan MongoDB en memoria automáticamente (no necesitas configurar nada adicional):

```bash
# Ejecutar todos los tests
npm test

# Con informe de cobertura
npm run test:coverage
```

Para usar una base de datos de test propia, define `MONGODB_TEST_URI` en `.env`.

## Estructura del proyecto

```
bildyapp-api/
├── src/
│   ├── config/         # Conexión MongoDB
│   ├── controllers/    # Lógica de negocio
│   ├── middleware/     # Auth, roles, validación, upload, errores
│   ├── models/         # User, Company (Mongoose)
│   ├── routes/         # user.routes.js
│   ├── services/       # EventEmitter (notificaciones user:*)
│   ├── utils/          # AppError
│   ├── validators/     # Esquemas Zod
│   ├── app.js          # Configuración Express
│   └── index.js        # Punto de entrada
├── tests/
│   ├── helpers/        # test-db.js (MongoDB in-memory)
│   └── user.test.js    # 52 tests E2E
├── uploads/            # Logos subidos
├── .env.example
└── jest.config.js
```

