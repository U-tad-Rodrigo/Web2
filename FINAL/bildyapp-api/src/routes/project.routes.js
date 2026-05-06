import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate }     from '../middleware/validate.js';
import { validateId }   from '../middleware/validate-id.js';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator.js';
import {
  createProject, updateProject, listProjects,
  listArchivedProjects, getProject, deleteProject, restoreProject
} from '../controllers/project.controller.js';

const router = Router();

router.use(authenticate);

// Rutas estáticas antes de /:id
router.get('/archived', listArchivedProjects);

router.post('/',             validate(createProjectSchema),                createProject);
router.get('/',              listProjects);
router.get('/:id',           validateId(),                                 getProject);
router.put('/:id',           validateId(), validate(updateProjectSchema), updateProject);
router.delete('/:id',        validateId(),                                 deleteProject);
router.patch('/:id/restore', validateId(),                                 restoreProject);

export default router;
