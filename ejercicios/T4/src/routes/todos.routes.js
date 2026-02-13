import { Router } from 'express';
import { randomUUID } from 'crypto';
import { todos } from '../data/todos.js';
import { todoSchema } from '../schemas/todo.schema.js';

const router = Router();

// GET /api/todos - Listar con filtros, ordenamiento y búsqueda
router.get('/', (req, res) => {
  const { completed, priority, tag, sortBy, order, search } = req.query;
  let result = [...todos];

  if (completed) result = result.filter(t => t.completed === (completed === 'true'));
  if (priority) result = result.filter(t => t.priority === priority);
  if (tag) result = result.filter(t => t.tags.includes(tag));
  if (search) result = result.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  if (sortBy) {
    result.sort((a, b) => {
      const cmp = sortBy === 'priority'
        ? { high: 3, medium: 2, low: 1 }[a.priority] - { high: 3, medium: 2, low: 1 }[b.priority]
        : new Date(a[sortBy] || 0) - new Date(b[sortBy] || 0);
      return order === 'desc' ? -cmp : cmp;
    });
  }

  res.json({ total: result.length, todos: result });
});

// GET /api/todos/stats - Estadísticas (BONUS)
router.get('/stats', (req, res) => {
  res.json({
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    pending: todos.filter(t => !t.completed).length,
    byPriority: {
      high: todos.filter(t => t.priority === 'high').length,
      medium: todos.filter(t => t.priority === 'medium').length,
      low: todos.filter(t => t.priority === 'low').length
    }
  });
});

// GET /api/todos/:id
router.get('/:id', (req, res) => {
  const todo = todos.find(t => t.id === req.params.id);
  todo ? res.json(todo) : res.status(404).json({ error: 'Tarea no encontrada' });
});

// POST /api/todos - Crear con validación Zod
router.post('/', (req, res) => {
  const result = todoSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Validación fallida', detalles: result.error.errors });
  }

  const todo = {
    id: randomUUID(),
    ...result.data,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  todos.push(todo);
  res.status(201).json(todo);
});

// PUT /api/todos/:id - Actualizar con validación Zod
router.put('/:id', (req, res) => {
  const index = todos.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Tarea no encontrada' });

  const result = todoSchema.partial().safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Validación fallida', detalles: result.error.errors });
  }

  todos[index] = { ...todos[index], ...result.data, updatedAt: new Date().toISOString() };
  res.json(todos[index]);
});

// PATCH /api/todos/:id/toggle
router.patch('/:id/toggle', (req, res) => {
  const index = todos.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Tarea no encontrada' });

  todos[index].completed = !todos[index].completed;
  todos[index].updatedAt = new Date().toISOString();
  res.json(todos[index]);
});

// DELETE /api/todos/:id
router.delete('/:id', (req, res) => {
  const index = todos.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Tarea no encontrada' });

  res.json(todos.splice(index, 1)[0]);
});

export default router;

