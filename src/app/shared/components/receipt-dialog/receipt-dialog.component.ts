import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';
import { qrMatrix, qrPath } from '../../receipt/qr';
import { receiptAmountText } from '../../receipt/receipt-pdf';
import { ReceiptData } from '../../receipt/receipt.model';
import { ReceiptService } from '../../receipt/receipt.service';

/** Detalle de un comprobante (marca, datos, monto con signo y código QR) con botón para bajar el PDF. */
@Component({
  selector: 'app-receipt-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent],
  templateUrl: './receipt-dialog.component.html',
  styleUrl: './receipt-dialog.component.scss',
})
export class ReceiptDialogComponent {
  private readonly receipts = inject(ReceiptService);

  readonly open = input.required<boolean>();
  readonly data = input.required<ReceiptData | null>();
  /** Permite deshabilitar el PDF (por ejemplo, cargas que no fueron acreditadas). */
  readonly pdfEnabled = input(true);
  readonly closed = output<void>();

  protected readonly generating = signal(false);
  protected readonly qr = signal<{ size: number; path: string } | null>(null);
  private qrRequest = 0;

  constructor() {
    effect(() => {
      const data = this.data();
      const request = ++this.qrRequest;
      this.qr.set(null);
      if (this.open() && data) {
        void qrMatrix(data.code).then((matrix) => {
          if (request === this.qrRequest) {
            this.qr.set({ size: matrix.length, path: qrPath(matrix) });
          }
        });
      }
    });
  }

  protected amountText(data: ReceiptData): string {
    return receiptAmountText(data);
  }

  protected async downloadPdf(): Promise<void> {
    const data = this.data();
    if (!data || this.generating()) {
      return;
    }
    this.generating.set(true);
    try {
      await this.receipts.download(data);
    } finally {
      this.generating.set(false);
    }
  }
}
