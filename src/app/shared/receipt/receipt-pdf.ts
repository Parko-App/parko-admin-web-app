import { ReceiptData } from './receipt.model';
import { qrMatrix } from './qr';

type Rgb = [number, number, number];

const PRIMARY: Rgb = [43, 87, 151];
const SUCCESS: Rgb = [22, 163, 74];
const DANGER: Rgb = [220, 38, 38];
const TEXT: Rgb = [30, 42, 56];
const MUTED: Rgb = [107, 122, 141];
const BORDER: Rgb = [209, 220, 232];

const AMOUNT_COLORS: Record<ReceiptData['direction'], Rgb> = { credit: SUCCESS, debit: DANGER, neutral: TEXT };
const SIGNS: Record<ReceiptData['direction'], string> = { credit: '+ ', debit: '- ', neutral: '' };

/** Importe en pesos argentinos con punto de miles: 2560 -> "$2.560". */
export function formatPesos(amount: number): string {
  return `$${amount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
}

export function receiptAmountText(data: Pick<ReceiptData, 'amount' | 'direction'>): string {
  return `${SIGNS[data.direction]}${formatPesos(data.amount)}`;
}

/** Texto que codifica el QR del PDF: el qr_data del ticket si lo hay (ticket a cobrar), o el código del comprobante. */
export function receiptQrText(data: Pick<ReceiptData, 'code' | 'qrData'>): string {
  return data.qrData ?? data.code;
}

export function receiptFileName(data: Pick<ReceiptData, 'code'>): string {
  return `comprobante-${data.code}.pdf`;
}

/** Arma el comprobante en PDF (A4) con el mismo diseño que el detalle en pantalla. */
export async function buildReceiptPdf(data: ReceiptData): Promise<Blob> {
  const [{ jsPDF }, matrix] = await Promise.all([import('jspdf'), qrMatrix(receiptQrText(data))]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const left = 45;
  const width = 120;
  const right = left + width;
  const top = 28;
  let y = top + 12;

  // Encabezado: marca y sello
  doc.setFont('helvetica', 'bold').setFontSize(26).setTextColor(...PRIMARY);
  doc.text('PARKO', left, y + 7);
  doc.setFillColor(...SUCCESS).roundedRect(right - 38, y, 38, 10, 2, 2, 'F');
  doc.setFontSize(9).setTextColor(255, 255, 255);
  doc.text('COMPROBANTE', right - 19, y + 6.4, { align: 'center' });

  y += 20;
  doc.setDrawColor(...BORDER).setLineWidth(0.3).line(left, y, right, y);

  // Título y subtítulo
  y += 14;
  doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(...TEXT);
  doc.text(data.title, left, y);
  y += 7;
  doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(...MUTED);
  doc.text(data.subtitle, left, y);

  // Datos
  y += 12;
  for (const row of data.rows) {
    doc.setFont('helvetica', 'normal').setFontSize(10.5).setTextColor(...MUTED);
    doc.text(row.label, left, y);
    doc.setFont('helvetica', 'bold').setTextColor(...TEXT);
    doc.text(row.value, right, y, { align: 'right' });
    y += 8;
  }

  y += 2;
  doc.setDrawColor(...BORDER).line(left, y, right, y);

  // Monto total
  y += 13;
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...TEXT);
  doc.text('Monto Total', left, y);
  doc.setFontSize(19).setTextColor(...AMOUNT_COLORS[data.direction]);
  doc.text(receiptAmountText(data), right, y, { align: 'right' });

  // Código QR (vectorial)
  y += 10;
  const qrSize = 36;
  const cell = qrSize / matrix.length;
  const qrLeft = left + (width - qrSize) / 2;
  doc.setFillColor(0, 0, 0);
  matrix.forEach((row, rowIndex) =>
    row.forEach((dark, columnIndex) => {
      if (dark) {
        // un pequeño solapamiento evita líneas blancas entre módulos al ampliar
        doc.rect(qrLeft + columnIndex * cell, y + rowIndex * cell, cell + 0.02, cell + 0.02, 'F');
      }
    }),
  );
  y += qrSize + 7;

  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED);
  doc.text('Comprobante oficial emitido por Parko', left + width / 2, y, { align: 'center' });

  // Marco de la tarjeta
  y += 8;
  doc.setDrawColor(...BORDER).setLineWidth(0.4).roundedRect(left - 10, top, width + 20, y - top, 5, 5);

  doc.setProperties({ title: `${data.title} ${data.code}`, subject: 'Comprobante Parko', creator: 'Parko' });
  return doc.output('blob');
}
