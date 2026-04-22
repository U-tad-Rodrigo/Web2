# T5 - Blockbuster API + Auth JWT (T7)

Esta version integra autenticacion/autorizacion con JWT sobre la API de peliculas.

## Requisitos

- Node.js 20.11+
- MongoDB accesible con `DB_URI`

## Variables de entorno

Crear `.env` en esta carpeta:

```env
PORT=3000
DB_URI=mongodb+srv://...
JWT_SECRET=pon_una_clave_larga_aleatoria
JWT_EXPIRES_IN=2h
REFRESH_TOKEN_DAYS=7
```

## Ejecucion

```bash
npm install
npm run dev
```

## Endpoints de auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all` (requiere token)
- `GET /api/auth/me` (requiere token)

## Pruebas manuales

- `tests/auth.http`
- `tests/movies.http`

