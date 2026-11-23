import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TicketRow } from '../../core/models/payment.model';
import { ReceiptDialogComponent } from '../components/receipt-dialog/receipt-dialog.component';
import { ticketReceipt } from './receipt-builders';
import { buildReceiptPdf, receiptAmountText, receiptQrText } from './receipt-pdf';

registerLocaleData(localeEsAr, 'es-AR');

const QR_URL = 'http://localhost:8081/api/v1/access/sessions/da6aee87-f7e5-4a5c-9d3e-111111111111';

const pending: TicketRow = {
  id: 't1',
  ticketNumber: 'TCK-2DC4B0AD',
  issuedAt: '2026-11-21T08:12:00-03:00',
  paidAt: null,
  status: 'PENDING',
  sessionType: 'VISITOR',
  plate: 'XY987ZW',
  amount: 3000,
  method: null,
  cashierName: null,
};

const paid: TicketRow = {
  ...pending,
  id: 't2',
  ticketNumber: 'TCK-E52984AF',
  status: 'PAID',
  sessionType: 'REGISTERED',
  paidAt: '2026-11-21T10:47:00-03:00',
  amount: 1500,
  method: 'CASH',
  cashierName: 'Facundo Morales',
};

const labels = (rows: { label: string }[]) => rows.map((r) => r.label);
const value = (rows: { label: string; value: string }[], label: string) => rows.find((r) => r.label === label)?.value;

describe('comprobante de ticket', () => {
  describe('ticket pendiente', () => {
    it('es un ticket a cobrar, sin signo en el monto, y lleva el qr_data para el PDF', () => {
      const receipt = ticketReceipt(pending, { qrData: QR_URL, balance: null });

      expect(receipt.title).toBe('Ticket pendiente de pago');
      expect(receipt.direction).toBe('neutral');
      expect(receiptAmountText(receipt)).toBe('$3.000');
      expect(receipt.qrData).toBe(QR_URL);
      expect(receipt.code).toBe('TCK-2DC4B0AD'); // el nombre del archivo sigue siendo el del ticket
      expect(value(receipt.rows, 'Estado')).toBe('Pendiente de cobro');
      expect(value(receipt.rows, 'Patente')).toBe('XY 987 ZW');
      expect(value(receipt.rows, 'Fecha de emisión')).toBeDefined();
      expect(value(receipt.rows, 'Hora de emisión')).toBe('08:12');
    });

    it('sin qr_data no inventa un QR de pago', () => {
      expect(ticketReceipt(pending, { qrData: null, balance: null }).qrData).toBeUndefined();
    });

    it('suma el saldo del usuario si tiene cuenta', () => {
      const receipt = ticketReceipt({ ...pending, sessionType: 'REGISTERED' }, { qrData: QR_URL, balance: 12500 });
      expect(value(receipt.rows, 'Saldo del usuario')).toBe('$12.500');
    });

    it('un visitante no tiene saldo: no muestra la fila', () => {
      expect(labels(ticketReceipt(pending, { qrData: QR_URL, balance: null }).rows)).not.toContain('Saldo del usuario');
    });
  });

  describe('ticket cobrado', () => {
    it('conserva el comprobante de pago (resta, método, cajero) y suma el saldo del usuario', () => {
      const receipt = ticketReceipt(paid, { qrData: QR_URL, balance: 8000.5 });

      expect(receipt.title).toBe('Pago realizado');
      expect(receipt.direction).toBe('debit');
      expect(receiptAmountText(receipt)).toBe('- $1.500');
      expect(value(receipt.rows, 'Método')).toBe('Efectivo');
      expect(value(receipt.rows, 'Cajero')).toBe('Facundo Morales');
      expect(value(receipt.rows, 'Hora')).toBe('10:47');
      expect(value(receipt.rows, 'Saldo del usuario')).toBe('$8.000,5');
    });

    it('no cambia el QR del PDF: no lleva qr_data', () => {
      expect(ticketReceipt(paid, { qrData: QR_URL, balance: null }).qrData).toBeUndefined();
    });

    it('un ticket utilizado también suma el saldo', () => {
      const receipt = ticketReceipt({ ...paid, status: 'USED' }, { qrData: QR_URL, balance: 100 });
      expect(value(receipt.rows, 'Saldo del usuario')).toBe('$100');
    });
  });
});

describe('QR del PDF', () => {
  it('en un ticket pendiente codifica el qr_data de la tabla tickets', () => {
    expect(receiptQrText(ticketReceipt(pending, { qrData: QR_URL, balance: null }))).toBe(QR_URL);
  });

  it('en un comprobante sin qr_data codifica el código del comprobante, como antes', () => {
    expect(receiptQrText(ticketReceipt(paid, { qrData: QR_URL, balance: null }))).toBe('TCK-E52984AF');
    expect(receiptQrText(ticketReceipt(pending, { qrData: null, balance: null }))).toBe('TCK-2DC4B0AD');
  });

  it('genera un PDF válido para un ticket pendiente con un QR de link largo', async () => {
    const blob = await buildReceiptPdf(ticketReceipt(pending, { qrData: QR_URL, balance: 500 }));

    expect(blob.type).toBe('application/pdf');
    const header = new TextDecoder('latin1').decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 5));
    expect(header).toBe('%PDF-');
  });
});

describe('diálogo de detalle', () => {
  async function render(showQr?: boolean) {
    TestBed.configureTestingModule({ imports: [ReceiptDialogComponent], providers: [{ provide: LOCALE_ID, useValue: 'es-AR' }] });
    const fixture = TestBed.createComponent(ReceiptDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('data', ticketReceipt(pending, { qrData: QR_URL, balance: 500 }));
    if (showQr !== undefined) {
      fixture.componentRef.setInput('showQr', showQr);
    }
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 20));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('sin QR en pantalla cuando se pide, aunque el comprobante lo tenga', async () => {
    const el = await render(false);

    expect(el.querySelector('svg.receipt__qr')).toBeNull();
    expect(el.textContent).toContain('Saldo del usuario');
  });

  it('muestra el QR por defecto (tickets)', async () => {
    const el = await render();

    expect(el.querySelector('svg.receipt__qr')).not.toBeNull();
  });
});
