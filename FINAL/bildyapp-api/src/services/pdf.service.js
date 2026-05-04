import PDFDocument from 'pdfkit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

const renderSignature = (doc, signatureUrl) => {
  if (!signatureUrl) return;

  doc.text('Firma:');

  if (signatureUrl.startsWith('/uploads/')) {
    const localPath = path.join(UPLOADS_DIR, path.basename(signatureUrl));
    if (fs.existsSync(localPath)) {
      doc.image(localPath, { width: 200 });
      return;
    }
  }

  // Cloudinary URL u otro remoto — muestra el enlace
  doc.text(signatureUrl);
};

const renderDeliveryNote = (doc, deliveryNote) => {
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
    renderSignature(doc, deliveryNote.signatureUrl);
  }
};

export const streamDeliveryNotePdf = (deliveryNote, res) => {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="albaran-${deliveryNote._id}.pdf"`);
  doc.pipe(res);
  renderDeliveryNote(doc, deliveryNote);
  doc.end();
};

export const buildDeliveryNotePdfBuffer = (deliveryNote) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    renderDeliveryNote(doc, deliveryNote);
    doc.end();
  });
