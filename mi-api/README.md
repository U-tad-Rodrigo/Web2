# API de Cursos - Express 5

API REST completa construida con Express 5, implementando CRUD para cursos de programación y matemáticas.

## 🚀 Características

- **Express 5** con manejo automático de errores async
- **Validación con Zod** en todas las rutas
- **Arquitectura modular** (controladores, rutas, middleware)
- **Manejo centralizado de errores**
- **Variables de entorno** con Node.js nativo
- **Seguridad** con Helmet y CORS
- **ESM** (ES Modules)

## 📦 Instalación

```bash
npm install
```

## 🔧 Configuración

El archivo `.env` ya está configurado con valores por defecto:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=tu_secreto_super_seguro_minimo_32_caracteres_aqui_2024
```

## 🏃 Ejecutar

```bash
# Modo desarrollo (con reinicio automático)
npm run dev

# Modo producción
npm start
```

## 📚 Endpoints

### Cursos de Programación

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/cursos/programacion` | Listar todos (con filtros) |
| GET | `/api/cursos/programacion/:id` | Obtener uno |
| POST | `/api/cursos/programacion` | Crear |
| PUT | `/api/cursos/programacion/:id` | Actualizar completo |
| PATCH | `/api/cursos/programacion/:id` | Actualizar parcial |
| DELETE | `/api/cursos/programacion/:id` | Eliminar |

**Filtros disponibles:**
- `?nivel=basico|intermedio|avanzado`
- `?lenguaje=javascript|python|java|csharp`
- `?orden=vistas|titulo`
- `?limit=10&offset=0`

### Cursos de Matemáticas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/cursos/matematicas` | Listar todos (con filtros) |
| GET | `/api/cursos/matematicas/:id` | Obtener uno |
| POST | `/api/cursos/matematicas` | Crear |
| PUT | `/api/cursos/matematicas/:id` | Actualizar completo |
| PATCH | `/api/cursos/matematicas/:id` | Actualizar parcial |
| DELETE | `/api/cursos/matematicas/:id` | Eliminar |

**Filtros disponibles:**
- `?nivel=basico|intermedio|avanzado`
- `?tema=calculo|algebra|geometria|estadistica`
- `?orden=vistas|titulo`
- `?limit=10&offset=0`

## 🧪 Probar la API

Usa el archivo `test.http` con la extensión REST Client de VSCode:

1. Instala la extensión "REST Client" en VSCode
2. Abre `test.http`
3. Haz clic en "Send Request" sobre cualquier petición

## 📁 Estructura del Proyecto

```
mi-api/
├── src/
│   ├── index.js                 # Punto de entrada
│   ├── app.js                   # Configuración Express
│   ├── config/
│   │   └── env.js              # Validación de entorno con Zod
│   ├── routes/
│   │   ├── index.js            # Agregador de rutas
│   │   ├── cursos.routes.js    # Rutas de programación
│   │   └── matematicas.routes.js # Rutas de matemáticas
│   ├── controllers/
│   │   ├── cursos.controller.js
│   │   └── matematicas.controller.js
│   ├── middleware/
│   │   ├── errorHandler.js     # Manejo de errores
│   │   └── validateRequest.js  # Validación con Zod
│   ├── schemas/
│   │   ├── cursos.schema.js
│   │   └── matematicas.schema.js
│   └── data/
│       └── cursos.js           # Datos en memoria
├── .env
├── .gitignore
├── package.json
├── test.http
└── README.md
```

## 🛠️ Tecnologías

- **Express 5.0.1** - Framework web
- **Zod 3.22.4** - Validación de schemas
- **Helmet 7.1.0** - Seguridad HTTP
- **CORS 2.8.5** - Cross-Origin Resource Sharing
- **Node.js 20+** - Runtime

## ✅ Estado del Proyecto

**✓ T4 COMPLETO** - Todos los requisitos implementados:

- ✅ Estructura modular
- ✅ Express 5 configurado
- ✅ CRUD completo para programación
- ✅ CRUD completo para matemáticas
- ✅ Validación con Zod
- ✅ Manejo de errores centralizado
- ✅ Middleware personalizado
- ✅ Variables de entorno validadas
- ✅ Filtros y ordenamiento
- ✅ Archivo test.http con todas las pruebas

## 📝 Próximos Pasos

- Integrar base de datos (MongoDB en T5)
- Añadir autenticación JWT
- Implementar paginación avanzada
- Añadir tests unitarios

