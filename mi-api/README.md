# API REST - mi-api

API REST simple con Express 5, siguiendo el documento T4.md hasta el punto 9.

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Modo desarrollo (con auto-reload)
npm run dev

# Modo producción
npm start
```

## 📚 Endpoints

### Usuarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/usuarios | Obtener todos los usuarios |
| GET | /api/usuarios/:id | Obtener usuario por ID |
| POST | /api/usuarios | Crear nuevo usuario |
| PUT | /api/usuarios/:id | Actualizar usuario |
| DELETE | /api/usuarios/:id | Eliminar usuario |

**Modelo Usuario:**
- `id` (number) - Generado automáticamente
- `nombre` (string) - 3-100 caracteres
- `nivel` (enum) - "junior", "mid-senior" o "senior"

**Ejemplo POST /api/usuarios:**
```json
{
  "nombre": "Juan Pérez",
  "nivel": "junior"
}
```

### Cursos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/cursos | Obtener todos los cursos |
| GET | /api/cursos/:id | Obtener curso por ID |
| POST | /api/cursos | Crear nuevo curso |
| PUT | /api/cursos/:id | Actualizar curso |
| DELETE | /api/cursos/:id | Eliminar curso |

**Modelo Curso:**
- `id` (number) - Generado automáticamente
- `nombre` (string) - 3-100 caracteres
- `descripcion` (string) - 10-500 caracteres
- `duracion` (number) - Horas del curso (entero positivo)
- `nivel` (enum) - "principiante", "intermedio" o "avanzado"

**Ejemplo POST /api/cursos:**
```json
{
  "nombre": "Python para Data Science",
  "descripcion": "Aprende Python aplicado a ciencia de datos",
  "duracion": 50,
  "nivel": "intermedio"
}
```

## 🛠️ Tecnologías

- **Express 5** - Framework web con manejo automático de async/await
- **Zod** - Validación de datos
- **CORS** - Habilitado para todas las rutas
- **ES Modules** - Uso de import/export

## 📋 Estructura del Proyecto

```
src/
├── app.js              # Configuración de Express
├── index.js            # Punto de entrada
├── controllers/        # Lógica de negocio
├── data/              # Datos en memoria
├── middleware/        # Validación y manejo de errores
├── routes/            # Definición de rutas
└── schemas/           # Esquemas de validación Zod
```

## ✅ Conceptos Implementados (T4.md hasta punto 9)

1. ✅ Express 5 con ES Modules
2. ✅ Configuración con `type: "module"`
3. ✅ Estructura modular
4. ✅ Routing con Express Router
5. ✅ CRUD completo para Usuarios y Cursos
6. ✅ Routers modulares
7. ✅ Middleware personalizado
8. ✅ Validación con Zod
9. ✅ Manejo de errores centralizado

## 🧪 Probar la API

Usa el archivo `test.http` con REST Client (VS Code) o cualquier cliente HTTP.
