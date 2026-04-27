import DeliveryNote from '../models/DeliveryNote.js';
import Project from '../models/Project.js';
import Client from '../models/Client.js';
import { AppError } from '../utils/AppError.js';
import { emitToCompany } from '../services/socket.service.js';

// POST /api/deliverynote
export const createDeliveryNote = async (req, res, next) => {
  try {
    const { client: clientId, project: projectId, format, description, workDate,
            material, quantity, unit, hours, workers } = req.body;
    const user = req.user;

    if (!user.company) return next(AppError.badRequest('Debes tener una empresa asignada', 'NO_COMPANY'));

    const [client, project] = await Promise.all([
      Client.findOne({ _id: clientId, company: user.company, deleted: false }),
      Project.findOne({ _id: projectId, company: user.company, deleted: false })
    ]);

    if (!client)  return next(AppError.notFound('Cliente no encontrado'));
    if (!project) return next(AppError.notFound('Proyecto no encontrado'));

    const deliveryNote = await DeliveryNote.create({
      user: user._id, company: user.company, client: clientId, project: projectId,
      format, description, workDate,
      material, quantity, unit,
      hours, workers
    });
    emitToCompany(user.company, 'deliverynote:new', { deliveryNote });

    return res.status(201).json({ error: false, data: { deliveryNote } });
  } catch (err) {
    next(err);
  }
};

// GET /api/deliverynote
export const listDeliveryNotes = async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 10, project, client, format, signed, from, to, sort = '-workDate' } = req.query;

    const filter = { company: user.company, deleted: false };
    if (project) filter.project = project;
    if (client)  filter.client  = client;
    if (format)  filter.format  = format;
    if (signed !== undefined) filter.signed = signed === 'true';
    if (from || to) {
      filter.workDate = {};
      if (from) filter.workDate.$gte = new Date(from);
      if (to)   filter.workDate.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [deliveryNotes, totalItems] = await Promise.all([
      DeliveryNote.find(filter).sort(sort).skip(skip).limit(Number(limit)),
      DeliveryNote.countDocuments(filter)
    ]);

    return res.json({
      error: false,
      data: { deliveryNotes, totalItems, totalPages: Math.ceil(totalItems / Number(limit)), currentPage: Number(page) }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/deliverynote/:id
export const getDeliveryNote = async (req, res, next) => {
  try {
    const deliveryNote = await DeliveryNote.findOne({ _id: req.params.id, company: req.user.company, deleted: false })
      .populate('user',    'name lastName email')
      .populate('client',  'name cif email')
      .populate('project', 'name projectCode');

    if (!deliveryNote) return next(AppError.notFound('Albarán no encontrado'));

    return res.json({ error: false, data: { deliveryNote } });
  } catch (err) {
    next(err);
  }
};

// GET /api/deliverynote/pdf/:id  — implementación completa en FASE 3
export const downloadPdf = async (req, res, next) => {
  try {
    const deliveryNote = await DeliveryNote.findOne({ _id: req.params.id, company: req.user.company, deleted: false })
      .populate('user',    'name lastName email')
      .populate('client',  'name cif email')
      .populate('project', 'name projectCode');

    if (!deliveryNote) return next(AppError.notFound('Albarán no encontrado'));

    // Si ya está firmado y hay PDF en la nube, redirigir
    if (deliveryNote.signed && deliveryNote.pdfUrl) {
      return res.redirect(deliveryNote.pdfUrl);
    }

    // Generación PDF básica con pdfkit (se enriquece en FASE 3)
    const { default: PDFDocument } = await import('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="albaran-${deliveryNote._id}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text('Albarán', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`ID: ${deliveryNote._id}`);
    doc.text(`Fecha: ${deliveryNote.workDate?.toLocaleDateString('es-ES') ?? '-'}`);
    doc.text(`Tipo: ${deliveryNote.format}`);
    doc.text(`Descripción: ${deliveryNote.description ?? '-'}`);
    doc.moveDown();
    doc.text(`Cliente: ${deliveryNote.client?.name ?? '-'}`);
    doc.text(`Proyecto: ${deliveryNote.project?.name ?? '-'} (${deliveryNote.project?.projectCode ?? '-'})`);

    if (deliveryNote.format === 'material') {
      doc.moveDown();
      doc.text(`Material: ${deliveryNote.material ?? '-'}`);
      doc.text(`Cantidad: ${deliveryNote.quantity ?? '-'} ${deliveryNote.unit ?? ''}`);
    } else {
      doc.moveDown();
      if (deliveryNote.workers?.length > 0) {
        doc.text('Trabajadores:');
        deliveryNote.workers.forEach(w => doc.text(`  - ${w.name}: ${w.hours}h`));
      } else {
        doc.text(`Horas: ${deliveryNote.hours ?? '-'}`);
      }
    }

    if (deliveryNote.signed) {
      doc.moveDown();
      doc.text(`Firmado el: ${deliveryNote.signedAt?.toLocaleDateString('es-ES') ?? '-'}`);
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};

// PATCH /api/deliverynote/:id/sign  — implementación completa (Cloudinary + Sharp) en FASE 3
export const signDeliveryNote = async (req, res, next) => {
  try {
    if (!req.file) return next(AppError.badRequest('No se ha subido ningún archivo de firma', 'NO_FILE'));

    const deliveryNote = await DeliveryNote.findOne({ _id: req.params.id, company: req.user.company, deleted: false });
    if (!deliveryNote) return next(AppError.notFound('Albarán no encontrado'));
    if (deliveryNote.signed) return next(AppError.badRequest('El albarán ya está firmado', 'ALREADY_SIGNED'));

    // En FASE 3 se sustituirá por Cloudinary + generación de PDF firmado
    const signatureUrl = `/uploads/${req.file.filename}`;

    deliveryNote.signed       = true;
    deliveryNote.signedAt     = new Date();
    deliveryNote.signatureUrl = signatureUrl;
    await deliveryNote.save();
    emitToCompany(req.user.company, 'deliverynote:signed', { deliveryNote });

    return res.json({ error: false, data: { deliveryNote } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/deliverynote/:id
export const deleteDeliveryNote = async (req, res, next) => {
  try {
    const deliveryNote = await DeliveryNote.findOne({ _id: req.params.id, company: req.user.company, deleted: false });
    if (!deliveryNote) return next(AppError.notFound('Albarán no encontrado'));

    if (deliveryNote.signed) {
      return next(AppError.badRequest('No se puede eliminar un albarán firmado', 'SIGNED_NOTE'));
    }

    await DeliveryNote.findByIdAndDelete(req.params.id);

    return res.json({ error: false, message: 'Albarán eliminado' });
  } catch (err) {
    next(err);
  }
};
