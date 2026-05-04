import PDFDocument from 'pdfkit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

const fetchRemoteImage = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
};

const renderSignature = async (doc, signatureUrl) => {
  if (!signatureUrl) return;

  doc.text('Firma:');

  if (signatureUrl.startsWith('/uploads/')) {
    const localPath = path.join(UPLOADS_DIR, path.basename(signatureUrl));
    if (fs.existsSync(localPath)) {
      doc.image(localPath, { width: 200 });
      return;
    }
    doc.text(signatureUrl);
    return;
  }

  // URL remota (Cloudinary, R2, S3) — descargar y embeber como imagen
  const buffer = await fetchRemoteImage(signatureUrl);
  if (buffer) {
    try {
      doc.image(buffer, { width: 200 });
      return;
    } catch {
      // Si pdfkit no reconoce el formato (raro tras Sharp→WebP) caemos al enlace
    }
  }
  doc.text(signatureUrl);
};

const renderDeliveryNote = async (doc, deliveryNote) => {
  doc.fontSize(20).text('Albarán', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`ID: ${deliveryNote._id}`);
  doc.text(`Fecha: ${deliveryNote.workDate?.toLocaleDateString('es-ES') ?? '-'}`);
  doc.text(`Tipo: ${deliveryNote.format}`);
  doc.text(`Descripción: ${deliveryNote.description ?? '-'}`);
  doc.moveDown();

  const userName = deliveryNote.user?.name
    ? `${deliveryNote.user.name} ${deliveryNote.user.lastName ?? ''}`.trim()
    : '-';
  doc.text(`Usuario: ${userName}`);
  doc.text(`Cliente: ${deliveryNote.client?.name ?? '-'}`);
  doc.text(`Proyecto: ${deliveryNote.project?.name ?? '-'} (${deliveryNote.project?.projectCode ?? '-'})`);
  doc.moveDown();

  if (deliveryNote.format === 'material') {
    doc.text(`Material: ${deliveryNote.material ?? '-'}`);
    doc.text(`Cantidad: ${deliveryNote.quantity ?? '-'} ${deliveryNote.unit ?? ''}`);
  } else if (deliveryNote.workers?.length > 0) {
    doc.text('Trabajadores:');
    deliveryNote.workers.forEach((w) => doc.text(`  - ${w.name}: ${w.hours}h`));
  } else {
    doc.text(`Horas: ${deliveryNote.hours ?? '-'}`);
  }

  if (deliveryNote.signed) {
    doc.moveDown();
    doc.text(`Firmado el: ${deliveryNote.signedAt?.toLocaleDateString('es-ES') ?? '-'}`);
    await renderSignature(doc, deliveryNote.signatureUrl);
  }
};

export const streamDeliveryNotePdf = async (deliveryNote, res) => {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="albaran-${deliveryNote._id}.pdf"`);
  doc.pipe(res);
  await renderDeliveryNote(doc, deliveryNote);
  doc.end();
};

export const buildDeliveryNotePdfBuffer = (deliveryNote) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    renderDeliveryNote(doc, deliveryNote)
      .then(() => doc.end())
      .catch(reject);
  });
