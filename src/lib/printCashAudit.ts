import jsPDF from 'jspdf';

interface CashAuditData {
  companyName: string;
  cashierName: string;
  openedAt: Date;
  closedAt: Date;
  initialAmount: number;
  salesAmount: number;
  salesCount: number;
  manualMovements: number;
  expectedAmount: number;
  countedAmount: number;
  difference: number;
}

export const generateCashAuditPDF = (data: CashAuditData): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let yPos = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const companyLines = doc.splitTextToSize(data.companyName, contentWidth);
  companyLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
  });

  yPos += 3;
  doc.setFontSize(14);
  doc.text('ARQUEO DE CAJA', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text(`Cajero: ${data.cashierName}`, marginLeft, yPos);
  yPos += 6;

  const openDateStr = data.openedAt.toLocaleDateString('es-CR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const openTimeStr = data.openedAt.toLocaleTimeString('es-CR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Apertura: ${openDateStr} ${openTimeStr}`, marginLeft, yPos);
  yPos += 6;

  const closeDateStr = data.closedAt.toLocaleDateString('es-CR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const closeTimeStr = data.closedAt.toLocaleTimeString('es-CR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Cierre: ${closeDateStr} ${closeTimeStr}`, marginLeft, yPos);
  yPos += 10;

  doc.setLineWidth(0.5);
  doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('DESGLOSE', marginLeft, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');

  doc.text('Monto inicial:', marginLeft, yPos);
  doc.text(`₡${data.initialAmount.toFixed(2)}`, pageWidth - marginRight, yPos, { align: 'right' });
  yPos += 6;

  doc.text(`Ventas en efectivo (${data.salesCount}):`, marginLeft, yPos);
  doc.text(`₡${data.salesAmount.toFixed(2)}`, pageWidth - marginRight, yPos, { align: 'right' });
  yPos += 6;

  if (data.manualMovements !== 0) {
    doc.text('Movimientos manuales:', marginLeft, yPos);
    doc.text(`₡${data.manualMovements.toFixed(2)}`, pageWidth - marginRight, yPos, { align: 'right' });
    yPos += 6;
  }

  yPos += 2;
  doc.setLineWidth(0.3);
  doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Total esperado:', marginLeft, yPos);
  doc.text(`₡${data.expectedAmount.toFixed(2)}`, pageWidth - marginRight, yPos, { align: 'right' });
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.text('Monto contado:', marginLeft, yPos);
  doc.text(`₡${data.countedAmount.toFixed(2)}`, pageWidth - marginRight, yPos, { align: 'right' });
  yPos += 8;

  doc.setLineWidth(0.5);
  doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  const differenceLabel = data.difference >= 0 ? 'Sobrante:' : 'Faltante:';
  doc.text(differenceLabel, marginLeft, yPos);
  doc.text(`₡${Math.abs(data.difference).toFixed(2)}`, pageWidth - marginRight, yPos, { align: 'right' });
  yPos += 15;

  doc.setLineWidth(0.5);
  doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Observaciones:', marginLeft, yPos);
  yPos += 8;

  const observationsBoxHeight = 30;
  doc.setLineWidth(0.3);
  doc.rect(marginLeft, yPos, contentWidth, observationsBoxHeight);
  yPos += observationsBoxHeight + 15;

  doc.setFontSize(10);
  doc.text('_________________________________', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.text('Firma del Cajero', pageWidth / 2, yPos, { align: 'center' });

  return doc;
};

export const downloadCashAuditPDF = (data: CashAuditData) => {
  const doc = generateCashAuditPDF(data);
  const fileName = `arqueo_caja_${data.closedAt.getTime()}.pdf`;
  doc.save(fileName);
};

export const printCashAuditPDF = (data: CashAuditData) => {
  const doc = generateCashAuditPDF(data);
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);

  const printWindow = window.open(blobUrl);
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.print();
    });
  }
};
