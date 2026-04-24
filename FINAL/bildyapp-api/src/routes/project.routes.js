import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate }     from '../middleware/validate.js';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator.js';
import {
  createProject, updateProject, listProjects,
  listArchivedProjects, getProject, deleteProject, restoreProject
} from '../controllers/project.controller.js';

const router = Router();

router.use(authenticate);

// Rutas estáticas antes de /:id
router.get('/archived', listArchivedProjects);

router.post('/',             validate(createProjectSchema), createProject);
router.get('/',              listProjects);
router.get('/:id',           getProject);
router.put('/:id',           validate(updateProjectSchema), updateProject);
router.delete('/:id',        deleteProject);
router.patch('/:id/restore', restoreProject);

export default router;
