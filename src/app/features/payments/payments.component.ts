import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { toErrorMessage } from '../../core/http/error-message';
import {
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  PaymentRecord,
  RegisterPaymentRequest,
  TICKET_SESSION_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TicketRow,
  TicketSessionType,
  TicketStatus,
  VisitorTicket,
} from '../../core/models/payment.model';
import { ToastService } from '../../core/notifications/toast.service';
import { AsyncStateComponent } from '../../shared/components/async-state/async-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { SortHeaderComponent } from '../../shared/components/sort-header/sort-header.component';
import { BadgeVariant, StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CurrencyArPipe } from '../../shared/pipes/currency-ar.pipe';
import { PlatePipe } from '../../shared/pipes/plate.pipe';
import { DateTimeArPipe } from '../../shared/pipes/date-time-ar.pipe';
import { PagedList } from '../../shared/utils/paged-list';
import { ReceiptDialogComponent } from '../../shared/components/receipt-dialog/receipt-dialog.component';
import { paymentReceipt } from '../../shared/receipt/receipt-builders';
import { ReceiptService } from '../../shared/receipt/receipt.service';
import { PaymentFormModalComponent } from './payment-form-modal/payment-form-modal.component';
import { PaymentsService } from './payments.service';

const PAGE_SIZE = 20;

/** Pendiente: amarillo · Cobrado: verde · Utilizado: azul · Cancelado: rojo. */
const TICKET_VARIANTS: Record<TicketStatus, BadgeVariant> = { PENDING: 'warning', PAID: 'success', USED: 'info', CANCELLED: 'danger' };

@Component({
  selector: 'app-payments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PlatePipe,
    AsyncStateComponent,
    ConfirmDialogComponent,
    PaginationComponent,
    SortHeaderComponent,
    StatusBadgeComponent,
    CurrencyArPipe,
    DateTimeArPipe,
    PaymentFormModalComponent,
    ReceiptDialogComponent,
  ],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss',
})
export class PaymentsComponent {
  private readonly service = inject(PaymentsService);
  private readonly toast = inject(ToastService);
  private readonly receipts = inject(ReceiptService);
  private readonly currency = new CurrencyArPipe();

  protected readonly codeControl = new FormControl('', { nonNullable: true });
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly ticket = signal<VisitorTicket | null>(null);
  protected readonly confirming = signal(false);
  protected readonly charging = signal(false);

  protected readonly detail = signal<TicketRow | null>(null);
  protected readonly detailReceipt = computed(() => {
    const row = this.detail();
    return row ? paymentReceipt(toPaymentRecord(row)) : null;
  });

  protected readonly manualOpen = signal(false);
  protected readonly manualSaving = signal(false);
  protected readonly manualError = signal<string | null>(null);

  /** Todos los tickets, los más recientes primero hasta que se elija otra columna. */
  protected readonly list = new PagedList<TicketRow>((query) => this.service.listTickets(query), PAGE_SIZE, {
    field: 'issuedAt',
    direction: 'desc',
  });

  protected readonly confirmMessage = computed(() => {
    const ticket = this.ticket();
    return ticket
      ? `¿Confirmás el cobro de ${this.currency.transform(ticket.amountDue)} en efectivo del ticket ${ticket.ticketNumber}?`
      : '';
  });

  protected statusLabel(status: TicketStatus): string { return TICKET_STATUS_LABELS[status]; }
  protected statusVariant(status: TicketStatus): BadgeVariant { return TICKET_VARIANTS[status]; }
  protected sessionTypeLabel(type: TicketSessionType): string { return TICKET_SESSION_TYPE_LABELS[type]; }
  protected methodLabel(method: PaymentMethod): string { return PAYMENT_METHOD_LABELS[method]; }

  protected async search(): Promise<void> {
    const code = this.codeControl.value.trim();
    if (!code) {
      this.ticket.set(null);
      this.searchError.set('Ingresá el número de ticket o el código QR.');
      return;
    }
    this.searching.set(true);
    this.searchError.set(null);
    this.ticket.set(null);
    try {
      this.ticket.set(await firstValueFrom(this.service.findTicket(code)));
    } catch (error) {
      this.searchError.set(toErrorMessage(error));
    } finally {
      this.searching.set(false);
    }
  }

  protected askCharge(): void {
    this.confirming.set(true);
  }

  protected cancelCharge(): void {
    if (!this.charging()) {
      this.confirming.set(false);
    }
  }

  protected async confirmCharge(): Promise<void> {
    const ticket = this.ticket();
    if (!ticket || this.charging()) {
      return;
    }
    this.charging.set(true);
    try {
      const record = await firstValueFrom(
        this.service.registerPayment({ ticketNumber: ticket.ticketNumber, method: 'CASH', amount: ticket.amountDue }),
      );
      this.confirming.set(false);
      this.toast.success(`Cobro registrado: ${this.currency.transform(record.amount)} (${record.ticketNumber}).`);
      this.ticket.set({ ...ticket, status: 'PAID' });
      this.list.reload();
    } catch (error) {
      this.confirming.set(false);
      this.toast.error(toErrorMessage(error));
    } finally {
      this.charging.set(false);
    }
  }

  protected openManual(): void {
    this.manualError.set(null);
    this.manualOpen.set(true);
  }

  protected closeManual(): void {
    if (!this.manualSaving()) {
      this.manualOpen.set(false);
    }
  }

  /** Pago en efectivo cargado a mano (sin pasar por la búsqueda de ticket). */
  protected async registerManual(request: RegisterPaymentRequest): Promise<void> {
    this.manualSaving.set(true);
    this.manualError.set(null);
    try {
      const record = await firstValueFrom(this.service.registerPayment(request));
      this.manualOpen.set(false);
      this.toast.success(`Pago registrado: ${this.currency.transform(record.amount)} (${record.ticketNumber}).`);
      // Si ese ticket está abierto en la búsqueda, refleja el nuevo estado.
      const open = this.ticket();
      if (open?.ticketNumber === record.ticketNumber) {
        this.ticket.set({ ...open, status: 'PAID' });
      }
      this.list.reload();
    } catch (error) {
      this.manualError.set(toErrorMessage(error));
    } finally {
      this.manualSaving.set(false);
    }
  }

  protected openDetail(row: TicketRow): void {
    this.detail.set(row);
  }

  protected downloadPdf(row: TicketRow): void {
    void this.receipts.download(paymentReceipt(toPaymentRecord(row)));
  }

  protected countLabel(count: number): string {
    return count === 1 ? '1 ticket' : `${count} tickets`;
  }
}

/** Comprobante de un ticket cobrado. */
function toPaymentRecord(row: TicketRow): PaymentRecord {
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    paidAt: row.paidAt ?? row.issuedAt,
    amount: row.amount ?? 0,
    method: row.method,
    cashierName: row.cashierName,
  };
}
