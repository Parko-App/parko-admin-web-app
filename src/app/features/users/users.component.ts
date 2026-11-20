import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { toErrorMessage } from '../../core/http/error-message';
import { ToastService } from '../../core/notifications/toast.service';
import {
  AdminUser,
  USER_STATUS_LABELS,
  USER_TYPE_LABELS,
  UserStatus,
  UserType,
  UserUpsertRequest,
} from '../../core/models/user.model';
import { AsyncStateComponent } from '../../shared/components/async-state/async-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { SortHeaderComponent } from '../../shared/components/sort-header/sort-header.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BadgeVariant, StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CurrencyArPipe } from '../../shared/pipes/currency-ar.pipe';
import { PagedList } from '../../shared/utils/paged-list';
import { UserFormModalComponent } from './user-form-modal/user-form-modal.component';
import { UsersService } from './users.service';

const PAGE_SIZE = 10;

/**
 * Saldo por debajo del cual se resalta en rojo (el Figma marca $300 y $0).
 * PROVISORIO: debería derivarse de la tarifa diaria que define el backend.
 */
export const LOW_BALANCE_THRESHOLD = 500;

const TYPE_VARIANTS: Record<UserType, BadgeVariant> = { STUDENT: 'neutral', TEACHER: 'info', STAFF: 'success' };
const STATUS_VARIANTS: Record<UserStatus, BadgeVariant> = { ACTIVE: 'success', SUSPENDED: 'danger', INACTIVE: 'neutral' };

@Component({
  selector: 'app-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    AsyncStateComponent,
    ConfirmDialogComponent,
    PaginationComponent,
    SortHeaderComponent,
    StatusBadgeComponent,
    CurrencyArPipe,
    UserFormModalComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent {
  private readonly service = inject(UsersService);
  private readonly toast = inject(ToastService);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly list = new PagedList<AdminUser>((query) => this.service.list(query), PAGE_SIZE);

  // Diálogos
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<AdminUser | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly deleting = signal<AdminUser | null>(null);
  protected readonly deleteMessage = computed(() => {
    const user = this.deleting();
    return user ? `¿Está seguro de que desea eliminar a ${user.fullName}? Esta acción no se puede deshacer.` : '';
  });

  constructor() {
    this.list.bindSearch(this.searchControl);
  }

  protected typeLabel(type: UserType): string { return USER_TYPE_LABELS[type]; }
  protected typeVariant(type: UserType): BadgeVariant { return TYPE_VARIANTS[type]; }
  protected statusLabel(status: UserStatus): string { return USER_STATUS_LABELS[status]; }
  protected statusVariant(status: UserStatus): BadgeVariant { return STATUS_VARIANTS[status]; }
  protected isLowBalance(user: AdminUser): boolean { return user.balance < LOW_BALANCE_THRESHOLD; }

  // ---- alta / edición
  protected openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(user: AdminUser): void {
    this.editing.set(user);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    if (!this.saving()) {
      this.formOpen.set(false);
    }
  }

  protected async save(request: UserUpsertRequest): Promise<void> {
    const editing = this.editing();
    this.saving.set(true);
    this.formError.set(null);
    try {
      await firstValueFrom(editing ? this.service.update(editing.id, request) : this.service.create(request));
      this.formOpen.set(false);
      this.toast.success(editing ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');
      this.list.reload();
    } catch (error) {
      this.formError.set(this.saveErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  // ---- baja
  protected askDelete(user: AdminUser): void {
    this.deleting.set(user);
  }

  protected cancelDelete(): void {
    this.deleting.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const user = this.deleting();
    if (!user) {
      return;
    }
    try {
      await firstValueFrom(this.service.delete(user.id));
      this.deleting.set(null);
      this.toast.success(`Se eliminó a ${user.fullName}.`);
      this.list.reloadAfterRemoval();
    } catch (error) {
      this.deleting.set(null);
      this.toast.error(toErrorMessage(error));
    }
  }

  private saveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      const body = error.error as { message?: unknown } | null;
      return typeof body?.message === 'string' ? body.message : 'Ya existe un usuario con ese correo.';
    }
    return toErrorMessage(error);
  }
}
