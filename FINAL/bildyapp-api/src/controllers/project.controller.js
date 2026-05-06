import Project from '../models/Project.js';
import Client from '../models/Client.js';
import { AppError } from '../utils/AppError.js';
import { emitToCompany } from '../services/socket.service.js';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// POST /api/project
export const createProject = async (req, res, next) => {
  try {
    const { client: clientId, name, projectCode, address, email, notes, active } = req.body;
    const user = req.user;

    if (!user.company) return next(AppError.badRequest('Debes tener una empresa asignada', 'NO_COMPANY'));

    const client = await Client.findOne({ _id: clientId, company: user.company, deleted: false });
    if (!client) return next(AppError.notFound('Cliente no encontrado o no pertenece a tu empresa'));

    const existing = await Project.findOne({ company: user.company, projectCode });
    if (existing) return next(AppError.conflict('Ya existe un proyecto con ese código en tu empresa', 'CODE_TAKEN'));

    const project = await Project.create({
      user: user._id, company: user.company, client: clientId,
      name, projectCode, address, email, notes,
      active: active !== undefined ? active : true
    });
    emitToCompany(user.company, 'project:new', { project });

    return res.status(201).json({ error: false, data: { project } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/project/:id
export const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const project = await Project.findOne({ _id: id, company: user.company, deleted: false });
    if (!project) return next(AppError.notFound('Proyecto no encontrado'));

    if (req.body.projectCode) {
      const incoming = req.body.projectCode.toUpperCase();
      if (incoming !== project.projectCode) {
        const dup = await Project.findOne({ company: user.company, projectCode: incoming });
        if (dup) return next(AppError.conflict('Ya existe un proyecto con ese código', 'CODE_TAKEN'));
      }
      req.body.projectCode = incoming;
    }

    if (req.body.client) {
      const client = await Client.findOne({ _id: req.body.client, company: user.company, deleted: false });
      if (!client) return next(AppError.notFound('Cliente no encontrado o no pertenece a tu empresa'));
    }

    Object.assign(project, req.body);
    await project.save();

    return res.json({ error: false, data: { project } });
  } catch (err) {
    next(err);
  }
};

// GET /api/project
export const listProjects = async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 10, client, name, active, sort = '-createdAt' } = req.query;

    const filter = { company: user.company, deleted: false };
    if (client) filter.client = client;
    if (name) filter.name = { $regex: escapeRegex(name), $options: 'i' };
    if (active !== undefined) filter.active = active === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [projects, totalItems] = await Promise.all([
      Project.find(filter).populate('client', 'name cif').sort(sort).skip(skip).limit(Number(limit)),
      Project.countDocuments(filter)
    ]);

    return res.json({
      error: false,
      data: { projects, totalItems, totalPages: Math.ceil(totalItems / Number(limit)), currentPage: Number(page) }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/project/archived  — debe registrarse ANTES de /:id en el router
export const listArchivedProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ company: req.user.company, deleted: true })
      .populate('client', 'name cif').sort('-updatedAt');
    return res.json({ error: false, data: { projects } });
  } catch (err) {
    next(err);
  }
};

// GET /api/project/:id
export const getProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, company: req.user.company, deleted: false })
      .populate('client', 'name cif email');
    if (!project) return next(AppError.notFound('Proyecto no encontrado'));
    return res.json({ error: false, data: { project } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/project/:id?soft=true
export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const soft = req.query.soft === 'true';

    const project = await Project.findOne({ _id: id, company: req.user.company, deleted: false });
    if (!project) return next(AppError.notFound('Proyecto no encontrado'));

    if (soft) {
      project.deleted = true;
      await project.save();
    } else {
      await Project.findByIdAndDelete(id);
    }

    return res.json({ error: false, message: `Proyecto eliminado (${soft ? 'soft' : 'hard'})` });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/project/:id/restore
export const restoreProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, company: req.user.company, deleted: true });
    if (!project) return next(AppError.notFound('Proyecto archivado no encontrado'));

    project.deleted = false;
    await project.save();

    return res.json({ error: false, data: { project } });
  } catch (err) {
    next(err);
  }
};
