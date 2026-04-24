import Client from '../models/Client.js';
import { AppError } from '../utils/AppError.js';

// POST /api/client
export const createClient = async (req, res, next) => {
  try {
    const { name, cif, email, phone, address } = req.body;
    const user = req.user;

    if (!user.company) return next(AppError.badRequest('Debes tener una empresa asignada', 'NO_COMPANY'));

    const existing = await Client.findOne({ company: user.company, cif: cif.toUpperCase(), deleted: false });
    if (existing) return next(AppError.conflict('Ya existe un cliente con ese CIF en tu empresa', 'CIF_TAKEN'));

    const client = await Client.create({ user: user._id, company: user.company, name, cif, email, phone, address });

    return res.status(201).json({ error: false, data: { client } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/client/:id
export const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const client = await Client.findOne({ _id: id, company: user.company, deleted: false });
    if (!client) return next(AppError.notFound('Cliente no encontrado'));

    if (req.body.cif && req.body.cif.toUpperCase() !== client.cif) {
      const dup = await Client.findOne({ company: user.company, cif: req.body.cif.toUpperCase(), deleted: false });
      if (dup) return next(AppError.conflict('Ya existe un cliente con ese CIF', 'CIF_TAKEN'));
    }

    Object.assign(client, req.body);
    await client.save();

    return res.json({ error: false, data: { client } });
  } catch (err) {
    next(err);
  }
};

// GET /api/client
export const listClients = async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 10, name, sort = '-createdAt' } = req.query;

    const filter = { company: user.company, deleted: false };
    if (name) filter.name = { $regex: name, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [clients, totalItems] = await Promise.all([
      Client.find(filter).sort(sort).skip(skip).limit(Number(limit)),
      Client.countDocuments(filter)
    ]);

    return res.json({
      error: false,
      data: { clients, totalItems, totalPages: Math.ceil(totalItems / Number(limit)), currentPage: Number(page) }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/client/archived  — debe registrarse ANTES de /:id en el router
export const listArchivedClients = async (req, res, next) => {
  try {
    const clients = await Client.find({ company: req.user.company, deleted: true }).sort('-updatedAt');
    return res.json({ error: false, data: { clients } });
  } catch (err) {
    next(err);
  }
};

// GET /api/client/:id
export const getClient = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, company: req.user.company, deleted: false });
    if (!client) return next(AppError.notFound('Cliente no encontrado'));
    return res.json({ error: false, data: { client } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/client/:id?soft=true
export const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const soft = req.query.soft === 'true';

    const client = await Client.findOne({ _id: id, company: req.user.company, deleted: false });
    if (!client) return next(AppError.notFound('Cliente no encontrado'));

    if (soft) {
      client.deleted = true;
      await client.save();
    } else {
      await Client.findByIdAndDelete(id);
    }

    return res.json({ error: false, message: `Cliente eliminado (${soft ? 'soft' : 'hard'})` });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/client/:id/restore
export const restoreClient = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, company: req.user.company, deleted: true });
    if (!client) return next(AppError.notFound('Cliente archivado no encontrado'));

    client.deleted = false;
    await client.save();

    return res.json({ error: false, data: { client } });
  } catch (err) {
    next(err);
  }
};
