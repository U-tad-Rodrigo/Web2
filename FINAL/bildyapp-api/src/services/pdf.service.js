import PDFDocument from 'pdfkit';

/**
 * Renderiza el contenido del albarán dentro de un PDFDocument abierto.
 * Recibe el doc para que la misma lógica sirva tanto para streaming HTTP
 * como para generar un Buffer en memoria.
 */
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
    if (deliveryNote.signatureUrl) {
      doc.text(`URL firma: ${deliveryNote.signatureUrl}`);
    }
  }
};

/**
 * Hace stream del PDF directamente a la respuesta HTTP.
 */
export const streamDeliveryNotePdf = (deliveryNote, res) => {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="albaran-${deliveryNote._id}.pdf"`);
  doc.pipe(res);
  renderDeliveryNote(doc, deliveryNote);
  doc.end();
};

/**
 * Genera el PDF en memoria y devuelve un Buffer (para subir a la nube).
 */
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
