import jsPDF from 'jspdf';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface ReceiptData {
  companyName: string;
  date: Date;
  items: ReceiptItem[];
  total: number;
  paymentMethod: string;
  amountCash?: number;
  amountCard?: number;
  amountReceived?: number;
  change?: number;
  clientName?: string;
}

export const generateReceiptPDF = (data: ReceiptData): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 297],
  });

  const pageWidth = 80;
  const marginLeft = 5;
  const marginRight = 5;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let yPos = 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const companyLines = doc.splitTextToSize(data.companyName, contentWidth);
  companyLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
  });

  yPos += 2;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const dateStr = data.date.toLocaleDateString('es-CR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeStr = data.date.toLocaleTimeString('es-CR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  doc.text(`Fecha: ${dateStr}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text(`Hora: ${timeStr}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.setFont('helvetica', 'italic');
  doc.text('Tiquete electrónico (demo)', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  if (data.clientName) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${data.clientName}`, marginLeft, yPos);
    yPos += 5;
  }

  doc.setLineWidth(0.2);
  doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
  yPos += 4;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  data.items.forEach((item) => {
    const itemLine = `${item.quantity} x ${item.name}`;
    const itemLines = doc.splitTextToSize(itemLine, contentWidth - 20);

    itemLines.forEach((line: string, index: number) => {
      if (index === 0) {
        doc.text(line, marginLeft, yPos);
        const totalStr = `₡${item.total.toFixed(2)}`;
        doc.text(totalStr, pageWidth - marginRight, yPos, { align: 'right' });
      } else {
        doc.text(line, marginLeft + 2, yPos);
      }
      yPos += 4;
    });
  });

  yPos += 2;
  doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
  yPos += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', marginLeft, yPos);
  doc.text(`₡${data.total.toFixed(2)}`, pageWidth - marginRight, yPos, { align: 'right' });
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  let paymentMethodLabel = '';
  if (data.paymentMethod === 'efectivo') {
    paymentMethodLabel = 'Efectivo';
  } else if (data.paymentMethod === 'tarjeta') {
    paymentMethodLabel = 'Tarjeta';
  } else if (data.paymentMethod === 'mixto') {
    paymentMethodLabel = 'Mixto';
  }

  doc.text(`Método de pago: ${paymentMethodLabel}`, marginLeft, yPos);
  yPos += 4;

  if (data.paymentMethod === 'efectivo' && data.amountReceived !== undefined) {
    doc.text(`Efectivo recibido: ₡${data.amountReceived.toFixed(2)}`, marginLeft, yPos);
    yPos += 4;
    if (data.change !== undefined && data.change > 0) {
      doc.text(`Vuelto: ₡${data.change.toFixed(2)}`, marginLeft, yPos);
      yPos += 4;
    }
  } else if (data.paymentMethod === 'mixto') {
    if (data.amountCash !== undefined) {
      doc.text(`Efectivo: ₡${data.amountCash.toFixed(2)}`, marginLeft, yPos);
      yPos += 4;
    }
    if (data.amountCard !== undefined) {
      doc.text(`Tarjeta: ₡${data.amountCard.toFixed(2)}`, marginLeft, yPos);
      yPos += 4;
    }
  }

  yPos += 4;
  doc.setFont('helvetica', 'italic');
  doc.text('Gracias por su compra', pageWidth / 2, yPos, { align: 'center' });

  return doc;
};

export const downloadReceiptPDF = (data: ReceiptData) => {
  const doc = generateReceiptPDF(data);
  const fileName = `tiquete_${data.date.getTime()}.pdf`;
  doc.save(fileName);
};

export const printReceiptPDF = (data: ReceiptData) => {
  const doc = generateReceiptPDF(data);
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);

  const printWindow = window.open(blobUrl);
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.print();
    });
  }
};
