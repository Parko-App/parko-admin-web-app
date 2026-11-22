import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ACCESS_METHOD_LABELS, ACCESS_MOVEMENT_LABELS, ACCESS_USER_TYPE_LABELS, AccessMethod, AccessRecord, accessMovementText } from '../../core/models/access.model';
import { AccessMovement, AccessUserType } from '../../core/models/dashboard.model';
import { AsyncStateComponent } from '../../shared/components/async-state/async-state.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { SortHeaderComponent } from '../../shared/components/sort-header/sort-header.component';
import { BadgeVariant, StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { DateTimeArPipe } from '../../shared/pipes/date-time-ar.pipe';
import { PlatePipe } from '../../shared/pipes/plate.pipe';
import { PagedList } from '../../shared/utils/paged-list';
import { AccessService } from './access.service';

const PAGE_SIZE = 10;

const USER_TYPE_VARIANTS: Record<AccessUserType, BadgeVariant> = {
  REGISTERED: 'neutral',
  VISITOR: 'orange',
  TEACHER: 'info',
  STAFF: 'success',
};

const MOVEMENT_ARROWS: Record<AccessMovement, string> = { ENTRY: '↓', EXIT: '↑' };

@Component({
  selector: 'app-access',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    AsyncStateComponent,
    PaginationComponent,
    SortHeaderComponent,
    StatusBadgeComponent,
    DateTimeArPipe,
    PlatePipe,
  ],
  templateUrl: './access.component.html',
  styleUrl: './access.component.scss',
})
export class AccessComponent {
  private readonly service = inject(AccessService);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly movementControl = new FormControl<'' | AccessMovement>('', { nonNullable: true });
  /** Los movimientos más recientes primero, hasta que se elija otra columna. */
  protected readonly list = new PagedList<AccessRecord>(
    (query) => this.service.list(query),
    PAGE_SIZE,
    { field: 'timestamp', direction: 'desc' },
  );
  protected readonly lastUpdated = signal<Date | null>(null);

  protected readonly movements = Object.entries(ACCESS_MOVEMENT_LABELS) as [AccessMovement, string][];

  constructor() {
    this.list.bindSearch(this.searchControl);
  }

  protected filtering(): boolean {
    return this.searchControl.value.trim() !== '' || this.movementControl.value !== '';
  }

  protected setMovement(): void {
    this.list.setFilter('movement', this.movementControl.value);
  }

  protected clearFilters(): void {
    this.movementControl.setValue('');
    this.searchControl.setValue('');
    this.list.search.set(''); // el campo se aplica con demora; esto asegura la consulta inmediata sin filtros
    this.list.setFilter('movement', '');
  }

  protected refresh(): void {
    this.list.reload();
  }

  protected movementLabel(movement: AccessMovement): string { return ACCESS_MOVEMENT_LABELS[movement]; }
  protected movementText(record: AccessRecord): string { return accessMovementText(record); }
  protected movementClass(record: AccessRecord): string {
    return record.result === 'DENIED' ? 'denied' : record.movement === 'ENTRY' ? 'entry' : 'exit';
  }
  protected movementArrow(movement: AccessMovement): string { return MOVEMENT_ARROWS[movement]; }
  protected userTypeLabel(type: AccessUserType): string { return ACCESS_USER_TYPE_LABELS[type]; }
  protected userTypeVariant(type: AccessUserType): BadgeVariant { return USER_TYPE_VARIANTS[type]; }
  protected methodLabel(method: AccessMethod): string { return ACCESS_METHOD_LABELS[method]; }
}
