import { Router } from 'express';
import { randomUUID } from 'crypto';
import { todos } from '../data/todos.js';
import { todoSchema } from '../schemas/todo.schema.js';

const router = Router();

router.get('/', (req, res) => {
  const { completed, priority, tag, search, sortBy, order } = req.query;
  let result = [...todos];

  // Filtros excluyentes (solo uno a la vez)
  if (completed) result = result.filter(t => t.completed === (completed === 'true'));
  else if (priority) result = result.filter(t => t.priority === priority);
  else if (tag) result = result.filter(t => t.tags.includes(tag));
  else if (search) result = result.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  // Ordenamiento (puede combinarse con cualquier filtro)
  if (sortBy) {
    const vals = { high: 3, medium: 2, low: 1 };
    result.sort((a, b) => (order === 'desc' ? -1 : 1) *
      (sortBy === 'priority' ? vals[a.priority] - vals[b.priority] : new Date(a[sortBy] || 0) - new Date(b[sortBy] || 0))
    );
  }

  res.json({ total: result.length, todos: result });
});

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

router.get('/:id', (req, res) => {
  const todo = todos.find(t => t.id === req.params.id);
  todo ? res.json(todo) : res.status(404).json({ error: 'Tarea no encontrada' });
});

router.post('/', (req, res) => {
  const result = todoSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validación fallida', detalles: result.error.errors });

  const todo = { id: randomUUID(), ...result.data, completed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  todos.push(todo);
  res.status(201).json(todo);
});

router.put('/:id', (req, res) => {
  const index = todos.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Tarea no encontrada' });

  const result = todoSchema.partial().safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validación fallida', detalles: result.error.errors });

  todos[index] = { ...todos[index], ...result.data, updatedAt: new Date().toISOString() };
  res.json(todos[index]);
});

router.patch('/:id/toggle', (req, res) => {
  const index = todos.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Tarea no encontrada' });

  todos[index].completed = !todos[index].completed;
  todos[index].updatedAt = new Date().toISOString();
  res.json(todos[index]);
});


router.delete('/:id', (req, res) => {
  const index = todos.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Tarea no encontrada' });

  res.json(todos.splice(index, 1)[0]);
});

export default router;
