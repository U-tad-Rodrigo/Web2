# PodcastHub API (T8)

API REST con JWT, roles (`user`/`admin`), Swagger y tests con Jest + Supertest.

## Requisitos

- Node.js >= 20.11
- MongoDB Atlas o local

## Configuracion

```bash
cp .env.example .env
```

Completa `MONGODB_URI`, `MONGODB_TEST_URI`, `JWT_SECRET`.

## Ejecutar

```bash
npm install
npm run dev
```

- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api-docs`

## Tests

```bash
npm test
npm run test:coverage
```

Los tests priorizan `process.env.MONGODB_TEST_URI`.
Si no esta definida, levantan una Mongo temporal en memoria para poder ejecutar localmente.

