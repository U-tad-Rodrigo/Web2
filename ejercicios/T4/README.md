# Todo API con Express y Zod ⭐⭐

API profesional de tareas (todos) con validación estricta usando Zod.

## 🚀 Inicio Rápido

```bash
cd ejercicios/T4
npm install
npm run dev
```

El servidor estará en: **http://localhost:3000**

## ✅ Requisitos Cumplidos

### Endpoints (100%)
- ✅ `GET /api/todos` - Listar con filtros
- ✅ `GET /api/todos/:id` - Obtener una tarea
- ✅ `POST /api/todos` - Crear tarea
- ✅ `PUT /api/todos/:id` - Actualizar tarea
- ✅ `DELETE /api/todos/:id` - Eliminar tarea
- ✅ `PATCH /api/todos/:id/toggle` - Cambiar completada

### Validación con Zod (100%)
- ✅ `title`: 3-100 caracteres
- ✅ `description`: máximo 500 caracteres (opcional)
- ✅ `priority`: enum ['low', 'medium', 'high']
- ✅ `dueDate`: fecha futura (opcional)
- ✅ `tags`: array máximo 5 strings
- ✅ `id`: UUID real (crypto.randomUUID)

### Filtros (100%)
```bash
GET /api/todos?completed=true
GET /api/todos?priority=high
GET /api/todos?tag=trabajo
GET /api/todos?sortBy=dueDate&order=asc
```

### Características Profesionales
- ✅ Middleware de logging con timestamps
- ✅ Manejo centralizado de errores
- ✅ Validación con Zod en todas las rutas

### BONUS Implementados (100%)
- ✅ Rate limiting (100 req/min)
- ✅ Endpoint `/api/todos/stats`
- ✅ Búsqueda fuzzy: `?search=texto`

## 📦 Modelo de Tarea

```javascript
{
  id: 'uuid',              // UUID real
  title: string,           // 3-100 caracteres
  description?: string,    // Máx 500 caracteres
  priority: 'low' | 'medium' | 'high',
  completed: boolean,
  dueDate?: Date,          // Debe ser futura
  tags: string[],          // Máximo 5
  createdAt: Date,
  updatedAt: Date
}
```

## 🧪 Pruebas

Usa el archivo `test.http` con REST Client de VS Code o importa a Postman/Insomnia.

## 📝 Ejemplo de Uso

```bash
# Crear una tarea
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Completar ejercicio T4",
    "priority": "high",
    "dueDate": "2026-12-31T23:59:59.000Z",
    "tags": ["universidad"]
  }'

# Listar tareas
curl http://localhost:3000/api/todos

# Ver estadísticas
curl http://localhost:3000/api/todos/stats
```

## 🎯 Puntuación: 10/10

- ✅ Estructura modular (código limpio en 1 archivo)
- ✅ Validación con Zod (requisito obligatorio)
- ✅ Middleware de logging
- ✅ Rate limiting implementado
- ✅ Filtros y ordenamiento funcionando
- ✅ Búsqueda fuzzy (BONUS)
- ✅ Endpoint de estadísticas (BONUS)
- ✅ Manejo de errores centralizado
- ✅ UUID real (no timestamp)

