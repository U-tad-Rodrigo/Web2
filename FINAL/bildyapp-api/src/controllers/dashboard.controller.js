import mongoose from 'mongoose';
import DeliveryNote from '../models/DeliveryNote.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import { AppError } from '../utils/AppError.js';

const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

// GET /api/dashboard
export const getDashboard = async (req, res, next) => {
  try {
    if (!req.user.company) return next(AppError.badRequest('Debes tener una empresa asignada', 'NO_COMPANY'));
    const companyId = new mongoose.Types.ObjectId(req.user.company);

    const [
      totals,
      byFormat,
      signedCount,
      perMonth,
      hoursPerProject,
      materialPerClient,
      topClients,
    ] = await Promise.all([
      // Totales globales por compañía
      Promise.all([
        DeliveryNote.countDocuments({ company: companyId, deleted: false }),
        Client.countDocuments({ company: companyId, deleted: false }),
        Project.countDocuments({ company: companyId, deleted: false }),
      ]).then(([deliveryNotes, clients, projects]) => ({ deliveryNotes, clients, projects })),

      // Albaranes agrupados por formato (material/hours)
      DeliveryNote.aggregate([
        { $match: { company: companyId, deleted: false } },
        { $group: { _id: '$format', count: { $sum: 1 } } },
      ]),

      // Albaranes firmados vs sin firmar
      DeliveryNote.aggregate([
        { $match: { company: companyId, deleted: false } },
        { $group: { _id: '$signed', count: { $sum: 1 } } },
      ]),

      // Albaranes por mes (últimos 6 meses) — útil para gráfico de barras
      DeliveryNote.aggregate([
        { $match: { company: companyId, deleted: false, workDate: { $gte: monthsAgo(5) } } },
        {
          $group: {
            _id:   { year: { $year: '$workDate' }, month: { $month: '$workDate' } },
            count: { $sum: 1 },
            hours: { $sum: { $ifNull: ['$hours', 0] } },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // Horas totales por proyecto (suma `hours` y `workers[].hours`)
      DeliveryNote.aggregate([
        { $match: { company: companyId, deleted: false, format: 'hours' } },
        {
          $project: {
            project: 1,
            totalHours: {
              $add: [
                { $ifNull: ['$hours', 0] },
                { $sum: { $ifNull: ['$workers.hours', []] } },
              ],
            },
          },
        },
        { $group: { _id: '$project', totalHours: { $sum: '$totalHours' } } },
        { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'project' } },
        { $unwind: '$project' },
        { $project: { _id: 0, projectId: '$_id', name: '$project.name', projectCode: '$project.projectCode', totalHours: 1 } },
        { $sort: { totalHours: -1 } },
      ]),

      // Cantidad total de material por cliente
      DeliveryNote.aggregate([
        { $match: { company: companyId, deleted: false, format: 'material' } },
        {
          $group: {
            _id: { client: '$client', material: '$material', unit: '$unit' },
            quantity: { $sum: { $ifNull: ['$quantity', 0] } },
          },
        },
        { $lookup: { from: 'clients', localField: '_id.client', foreignField: '_id', as: 'client' } },
        { $unwind: '$client' },
        {
          $project: {
            _id: 0,
            clientId: '$_id.client',
            clientName: '$client.name',
            material: '$_id.material',
            unit: '$_id.unit',
            quantity: 1,
          },
        },
        { $sort: { quantity: -1 } },
      ]),

      // Top 5 clientes por número de albaranes
      DeliveryNote.aggregate([
        { $match: { company: companyId, deleted: false } },
        { $group: { _id: '$client', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'client' } },
        { $unwind: '$client' },
        { $project: { _id: 0, clientId: '$_id', name: '$client.name', count: 1 } },
      ]),
    ]);

    const formatStats = byFormat.reduce(
      (acc, row) => ({ ...acc, [row._id]: row.count }),
      { material: 0, hours: 0 }
    );
    const signedStats = signedCount.reduce(
      (acc, row) => ({ ...acc, [row._id ? 'signed' : 'unsigned']: row.count }),
      { signed: 0, unsigned: 0 }
    );

    return res.json({
      error: false,
      data: {
        totals,
        deliveryNotesByFormat: formatStats,
        deliveryNotesBySigned: signedStats,
        deliveryNotesPerMonth: perMonth.map((row) => ({
          year: row._id.year,
          month: row._id.month,
          count: row.count,
          hours: row.hours,
        })),
        hoursPerProject,
        materialPerClient,
        topClients,
      },
    });
  } catch (err) {
    next(err);
  }
};
