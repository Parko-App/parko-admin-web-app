import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { toErrorMessage } from '../../core/http/error-message';
import {
  TOP_UP_METHOD_LABELS,
  TOP_UP_STATUS_LABELS,
  TopUp,
  TopUpMethod,
  TopUpRequest,
  TopUpStatus,
} from '../../core/models/top-up.model';
import { ToastService } from '../../core/notifications/toast.service';
import { AsyncStateComponent } from '../../shared/components/async-state/async-state.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ReceiptDialogComponent } from '../../shared/components/receipt-dialog/receipt-dialog.component';
import { SortHeaderComponent } from '../../shared/components/sort-header/sort-header.component';
import { BadgeVariant, StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CurrencyArPipe } from '../../shared/pipes/currency-ar.pipe';
import { DateTimeArPipe } from '../../shared/pipes/date-time-ar.pipe';
import { topUpReceipt } from '../../shared/receipt/receipt-builders';
import { ReceiptService } from '../../shared/receipt/receipt.service';
import { PagedList } from '../../shared/utils/paged-list';
import { TopUpFormModalComponent } from './top-up-form-modal/top-up-form-modal.component';
import { TopUpsService } from './top-ups.service';

const PAGE_SIZE = 10;

const STATUS_VARIANTS: Record<TopUpStatus, BadgeVariant> = { CREDITED: 'success', PENDING: 'warning', REJECTED: 'orange' };

@Component({
  selector: 'app-top-ups',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    AsyncStateComponent,
    PaginationComponent,
    ReceiptDialogComponent,
    SortHeaderComponent,
    StatusBadgeComponent,
    TopUpFormModalComponent,
    CurrencyArPipe,
    DateTimeArPipe,
  ],
  templateUrl: './top-ups.component.html',
  styleUrl: './top-ups.component.scss',
})
export class TopUpsComponent {
  private readonly service = inject(TopUpsService);
  private readonly receipts = inject(ReceiptService);
  private readonly toast = inject(ToastService);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  /** Las cargas más recientes primero, hasta que se elija otra columna. */
  protected readonly list = new PagedList<TopUp>((query) => this.service.list(query), PAGE_SIZE, {
    field: 'timestamp',
    direction: 'desc',
  });

  protected readonly formOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly detail = signal<TopUp | null>(null);
  protected readonly detailReceipt = computed(() => {
    const topUp = this.detail();
    return topUp ? topUpReceipt(topUp) : null;
  });

  constructor() {
    this.list.bindSearch(this.searchControl);
  }

  protected filtering(): boolean {
    return this.searchControl.value.trim() !== '';
  }

  protected clearSearch(): void {
    this.searchControl.setValue('');
    this.list.search.set('');
  }

  protected statusLabel(status: TopUpStatus): string { return TOP_UP_STATUS_LABELS[status]; }
  protected statusVariant(status: TopUpStatus): BadgeVariant { return STATUS_VARIANTS[status]; }
  protected methodLabel(method: TopUpMethod): string { return TOP_UP_METHOD_LABELS[method]; }

  // ---- carga manual de saldo
  protected openForm(): void {
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    if (!this.saving()) {
      this.formOpen.set(false);
    }
  }

  protected async save(request: TopUpRequest & { userName: string }): Promise<void> {
    this.saving.set(true);
    this.formError.set(null);
    try {
      const { userName, ...body } = request;
      await firstValueFrom(this.service.create(body));
      this.formOpen.set(false);
      this.toast.success(`Se cargaron $${body.amount.toLocaleString('es-AR')} al saldo de ${userName}.`);
      this.list.reload();
    } catch (error) {
      this.formError.set(toErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected openDetail(topUp: TopUp): void {
    this.detail.set(topUp);
  }

  protected downloadPdf(topUp: TopUp): void {
    void this.receipts.download(topUpReceipt(topUp));
  }
}
