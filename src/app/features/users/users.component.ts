import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, firstValueFrom, merge, of, switchMap, tap } from 'rxjs';
import { toErrorMessage } from '../../core/http/error-message';
import { ToastService } from '../../core/notifications/toast.service';
import { SortState } from '../../core/models/sort.model';
import { PageResponse } from '../../core/models/page-response.model';
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
import { AsyncStatus } from '../../shared/utils/async-state';
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
  private readonly query$ = new Subject<void>();

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly status = signal<AsyncStatus>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly data = signal<PageResponse<AdminUser> | null>(null);
  protected readonly page = signal(0);
  protected readonly sort = signal<SortState | null>(null);
  private readonly search = signal('');

  protected readonly users = computed(() => this.data()?.content ?? []);
  protected readonly total = computed(() => this.data()?.totalElements ?? 0);

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
    // Búsqueda: espera 300 ms sin tipear, vuelve a la página 1 y recarga.
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.search.set(term);
        this.page.set(0);
        this.query$.next();
      });

    merge(of(undefined), this.query$)
      .pipe(
        tap(() => this.status.set('loading')),
        switchMap(() =>
          this.service.list({ search: this.search(), page: this.page(), size: PAGE_SIZE, sort: this.sort() }).pipe(
            tap((page) => {
              this.data.set(page);
              this.error.set(null);
              this.status.set(page.content.length === 0 ? 'empty' : 'success');
            }),
            catchError((error: unknown) => {
              this.error.set(toErrorMessage(error));
              this.status.set('error');
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  protected reload(): void {
    this.query$.next();
  }

  protected changeSort(sort: SortState): void {
    this.sort.set(sort);
    this.page.set(0);
    this.reload();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.reload();
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
      this.reload();
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
      // Si era el único de la última página, volvemos a la anterior.
      if (this.users().length === 1 && this.page() > 0) {
        this.page.update((page) => page - 1);
      }
      this.reload();
    } catch (error) {
      this.deleting.set(null);
      this.toast.error(toErrorMessage(error));
    }
  }

  private saveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return 'Ya existe un usuario con ese correo.';
    }
    return toErrorMessage(error);
  }
}
