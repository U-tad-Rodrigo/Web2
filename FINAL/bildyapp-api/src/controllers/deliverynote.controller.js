import fs from 'node:fs/promises';
import DeliveryNote from '../models/DeliveryNote.js';
import Project from '../models/Project.js';
import Client from '../models/Client.js';
import IdempotencyLog from '../models/IdempotencyLog.js';
import { AppError } from '../utils/AppError.js';
import { emitToCompany } from '../services/socket.service.js';
import { uploadImage, uploadBuffer } from '../services/cloudinary.service.js';
import { streamDeliveryNotePdf, buildDeliveryNotePdfBuffer } from '../services/pdf.service.js';

// UUID v4 (RFC 4122): xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

// GET /api/deliverynote/pdf/:id
export const downloadPdf = async (req, res, next) => {
  try {
    const deliveryNote = await DeliveryNote.findOne({ _id: req.params.id, company: req.user.company, deleted: false })
      .populate('user',    'name lastName email')
      .populate('client',  'name cif email')
      .populate('project', 'name projectCode');

    if (!deliveryNote) return next(AppError.notFound('Albarán no encontrado'));

    // Solo el creador del albarán o un guest de la compañía pueden descargarlo
    const ownerId = deliveryNote.user?._id ?? deliveryNote.user;
    const isOwner = ownerId.equals(req.user._id);
    const isGuest = req.user.role === 'guest';
    if (!isOwner && !isGuest) {
      return next(AppError.forbidden('Solo el creador del albarán o un invitado pueden descargarlo', 'NOT_OWNER'));
    }

    // Si ya está firmado y hay PDF en la nube, redirigir
    if (deliveryNote.signed && deliveryNote.pdfUrl) {
      return res.redirect(deliveryNote.pdfUrl);
    }

    await streamDeliveryNotePdf(deliveryNote, res);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/deliverynote/:id/sign
//
// Idempotencia HTTP estilo Stripe (opcional):
//   - El cliente envía la cabecera `Idempotency-Key` con un UUID v4.
//   - El primer request reserva la clave en `IdempotencyLog` y ejecuta la firma.
//     Al terminar, persiste el resultado y lo devuelve.
//   - Reintentos posteriores con la MISMA clave devuelven el resultado cacheado
//     sin volver a subir firma ni PDF a Cloudinary.
//   - Reintentos concurrentes pierden la carrera del índice único (E11000) y
//     reciben 409 IDEMPOTENT_REQUEST_IN_PROGRESS hasta que el ganador termine.
export const signDeliveryNote = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];

  // Helper: limpia el archivo subido por multer cuando no vamos a usarlo
  const cleanupUpload = async () => {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
  };

  // Validación de formato si la cabecera viene
  if (idempotencyKey !== undefined) {
    if (typeof idempotencyKey !== 'string' || !UUID_V4_REGEX.test(idempotencyKey)) {
      await cleanupUpload();
      return next(AppError.badRequest('La cabecera Idempotency-Key debe ser un UUID v4 válido', 'INVALID_IDEMPOTENCY_KEY'));
    }
  }

  let keyReserved = false;

  try {
    // Reserva atómica: insertOne + handler de E11000 resuelve la race condition
    if (idempotencyKey) {
      try {
        await IdempotencyLog.create({
          key:        idempotencyKey,
          statusCode: 0,                  // 0 = placeholder (pending)
          response:   { pending: true }
        });
        keyReserved = true;
      } catch (err) {
        if (err && err.code === 11000) {
          // Otro request ya reservó la clave: completed → cached, pending → 409
          const existing = await IdempotencyLog.findOne({ key: idempotencyKey });
          await cleanupUpload();
          if (existing && existing.statusCode > 0) {
            return res.status(existing.statusCode).json(existing.response);
          }
          return next(AppError.conflict('Reintento idempotente todavía en curso', 'IDEMPOTENT_REQUEST_IN_PROGRESS'));
        }
        throw err;
      }
    }

    // Validaciones de negocio (errores → liberar la reserva para permitir reintentos limpios)
    if (!req.file) {
      if (keyReserved) await IdempotencyLog.deleteOne({ key: idempotencyKey });
      return next(AppError.badRequest('No se ha subido ningún archivo de firma', 'NO_FILE'));
    }

    const deliveryNote = await DeliveryNote.findOne({ _id: req.params.id, company: req.user.company, deleted: false });
    if (!deliveryNote) {
      if (keyReserved) await IdempotencyLog.deleteOne({ key: idempotencyKey });
      await cleanupUpload();
      return next(AppError.notFound('Albarán no encontrado'));
    }
    if (deliveryNote.signed) {
      if (keyReserved) await IdempotencyLog.deleteOne({ key: idempotencyKey });
      await cleanupUpload();
      return next(AppError.badRequest('El albarán ya está firmado', 'ALREADY_SIGNED'));
    }

    // 1) Sube la imagen de la firma (Sharp + Cloudinary)
    const cloudSignatureUrl = await uploadImage(req.file.path, 'signatures');
    const signatureUrl      = cloudSignatureUrl ?? `/uploads/${req.file.filename}`;

    deliveryNote.signed       = true;
    deliveryNote.signedAt     = new Date();
    deliveryNote.signatureUrl = signatureUrl;
    await deliveryNote.save();

    // 2) Genera el PDF firmado y lo sube a la nube. El populate es necesario
    //    para que el PDF muestre cliente/proyecto/usuario por nombre.
    const populated = await DeliveryNote.findById(deliveryNote._id)
      .populate('user',    'name lastName email')
      .populate('client',  'name cif email')
      .populate('project', 'name projectCode');

    try {
      const pdfBuffer = await buildDeliveryNotePdfBuffer(populated);
      const pdfUrl    = await uploadBuffer(pdfBuffer, {
        folder:   'deliverynotes',
        publicId: `albaran-${populated._id}`,
        format:   'pdf',
      });
      if (pdfUrl) {
        populated.pdfUrl = pdfUrl;
        await populated.save();
      }
    } catch (pdfErr) {
      // No bloqueamos la firma si el PDF falla — se puede regenerar bajo demanda
      console.error('[deliverynote.sign] error generando/subiendo PDF:', pdfErr.message);
    }

    emitToCompany(req.user.company, 'deliverynote:signed', { deliveryNote: populated });

    const responseBody = { error: false, data: { deliveryNote: populated } };

    // Persiste el resultado en el log para que los reintentos lo devuelvan tal cual
    if (keyReserved) {
      await IdempotencyLog.updateOne(
        { key: idempotencyKey },
        { statusCode: 200, response: responseBody }
      );
    }

    return res.json(responseBody);
  } catch (err) {
    // Excepción no controlada: liberar la reserva para no atrapar al cliente con un 409 permanente
    if (keyReserved) {
      await IdempotencyLog.deleteOne({ key: idempotencyKey }).catch(() => {});
    }
    next(err);
  }
};

// DELETE /api/deliverynote/:id?soft=true
export const deleteDeliveryNote = async (req, res, next) => {
  try {
    const soft = req.query.soft === 'true';

    const deliveryNote = await DeliveryNote.findOne({ _id: req.params.id, company: req.user.company, deleted: false });
    if (!deliveryNote) return next(AppError.notFound('Albarán no encontrado'));

    if (deliveryNote.signed) {
      return next(AppError.badRequest('No se puede eliminar un albarán firmado', 'SIGNED_NOTE'));
    }

    if (soft) {
      deliveryNote.deleted = true;
      await deliveryNote.save();
    } else {
      await DeliveryNote.findByIdAndDelete(req.params.id);
    }

    return res.json({ error: false, message: `Albarán eliminado (${soft ? 'soft' : 'hard'})` });
  } catch (err) {
    next(err);
  }
};
