import { Router } from 'express';
import { randomUUID } from 'crypto';
import { todos } from '../data/todos.js';
import { todoSchema, updateTodoSchema } from '../schemas/todo.schema.js';

const router = Router();
const PRIORITY_VALUES = { high: 3, medium: 2, low: 1 };

// GET /api/todos
router.get('/', (req, res) => {
  const { completed, priority, tag, search, sortBy, order } = req.query;
  let result = [...todos];

  if (completed) result = result.filter(t => t.completed === (completed === 'true'));
  if (priority) result = result.filter(t => t.priority === priority);
  if (tag) result = result.filter(t => t.tags.includes(tag));
  if (search) result = result.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  if (sortBy) {
    result.sort((a, b) => {
      const comparison = sortBy === 'priority'
        ? PRIORITY_VALUES[a.priority] - PRIORITY_VALUES[b.priority]
        : new Date(a[sortBy] || 0) - new Date(b[sortBy] || 0);
      return order === 'desc' ? -comparison : comparison;
    });
  }

  res.json({ total: result.length, todos: result });
});

// GET /api/todos/stats
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
  if (!todo) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json(todo);
});

// POST /api/todos
router.post('/', (req, res) => {
  const validation = todoSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Validación fallida', detalles: validation.error.errors });
  }

  const newTodo = {
    id: randomUUID(),
    ...validation.data,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

// PUT /api/todos/:id
router.put('/:id', (req, res) => {
  const index = todos.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Tarea no encontrada' });

  const validation = updateTodoSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Validación fallida', detalles: validation.error.errors });
  }

  todos[index] = { ...todos[index], ...validation.data, updatedAt: new Date().toISOString() };
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
