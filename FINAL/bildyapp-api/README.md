# BildyApp API

[![CI](https://github.com/U-tad-Rodrigo/Web2/actions/workflows/bildyapp-test.yml/badge.svg)](https://github.com/U-tad-Rodrigo/Web2/actions/workflows/bildyapp-test.yml)

API REST para digitalizar albaranes de obra. La idea es que un constructor o un autónomo pueda llevar sus clientes, proyectos y partes de trabajo (horas o materiales) desde el móvil, firmar el albarán con el dedo y guardar el PDF en la nube.

Práctica final de PW2 — temas T8 a T13.

## En producción

- **API:** https://bildyapp-api-production.up.railway.app
- **Swagger:** https://bildyapp-api-production.up.railway.app/api-docs
- **Health:** https://bildyapp-api-production.up.railway.app/health

Desplegada en Railway con MongoDB privado conectado por red interna.

## Cómo arrancarlo

Necesitas Node 22+. Para los tests no hace falta tener Mongo instalado, usan una base en memoria.

```bash
npm install
cp .env.example .env       # rellena al menos DB_URI y JWT_SECRET
npm run dev
```

La API queda en `http://localhost:3000`. La doc de Swagger en `/api-docs` y el health check en `/health`.

## Con Docker

```bash
docker compose up --build
```

Levanta la API y un Mongo 7 con healthcheck. Los uploads (firmas locales) se persisten en un volumen.

## Tests

```bash
npm test
npm run test:coverage
```

Los tests usan `mongodb-memory-server`. CI los corre en cada push a `main` (`.github/workflows/bildyapp-test.yml`).

**Cobertura actual:** 87.6 % statements · 75.5 % branches · 89.6 % functions · 89.7 % lines (134 tests, incluida una suite de integración de Socket.IO con cliente real).

## Qué hace la API

Está todo documentado en Swagger, pero un resumen rápido:

- **Usuarios**: registro con verificación por email, login, refresh, perfil, empresa y subida de logo.
- **Clientes / Proyectos**: CRUD completo con filtros, paginación, soft/hard delete y archivar/restaurar.
- **Albaranes**: CRUD + filtros + descarga en PDF + firma con imagen (sube a Cloudinary y genera el PDF firmado). Un albarán firmado no se puede modificar ni borrar.
- **Dashboard** (bonus T5): estadísticas con `aggregation pipeline`.
- **Socket.IO**: avisos en tiempo real solo a la gente de tu empresa cuando se crea o firma algo.
- **Slack**: webhook con los errores 5XX que pueda haber.
- **Email**: código de verificación al registrarse y al invitar a un compañero.

Para probar a mano hay un `bildyapp.http` con peticiones de ejemplo (extensión REST Client de VS Code).

## Variables de entorno

Lo imprescindible es `DB_URI` y `JWT_SECRET`. El resto (Cloudinary, SMTP, Slack) son opcionales: si no las pones, esos servicios degradan sin romper nada (Cloudinary cae a URL local, mail loguea por consola, Slack se desactiva).

Mira `.env.example` para la lista completa.

## Stack

Express 5, Mongoose, Zod, JWT, Socket.IO, Multer + Sharp + Cloudinary, pdfkit, Nodemailer, Jest + Supertest, Helmet, rate-limit, Swagger 3.0, Docker, GitHub Actions. Modelos, middleware y `AppError` migrados a TypeScript (bonus T12).
