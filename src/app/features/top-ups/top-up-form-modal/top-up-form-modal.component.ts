import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { TOP_UP_MAX_AMOUNT, TopUpRequest, TopUpUser } from '../../../core/models/top-up.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TopUpsService } from '../top-ups.service';

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

/** Carga manual de saldo: se elige el usuario, se ingresa el monto y se acredita en su cuenta. */
@Component({
  selector: 'app-top-up-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './top-up-form-modal.component.html',
  styleUrl: './top-up-form-modal.component.scss',
})
export class TopUpFormModalComponent {
  readonly open = input.required<boolean>();
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly saved = output<TopUpRequest & { userName: string }>();
  readonly closed = output<void>();

  private readonly service = inject(TopUpsService);

  protected readonly maxAmount = TOP_UP_MAX_AMOUNT;
  protected readonly submitted = signal(false);
  protected readonly selected = signal<TopUpUser | null>(null);
  protected readonly results = signal<TopUpUser[]>([]);
  protected readonly searching = signal(false);
  protected readonly searchFailed = signal(false);

  protected readonly form = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    amount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(TOP_UP_MAX_AMOUNT),
      (control) => (this.hasMoreThanTwoDecimals(control.value) ? { decimals: true } : null),
    ]),
  });

  constructor() {
    this.form.controls.search.valueChanges
      .pipe(
        tap(() => this.searchFailed.set(false)),
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((term) => {
          const text = term.trim();
          if (text.length < MIN_SEARCH_LENGTH) {
            this.searching.set(false);
            return of<TopUpUser[]>([]);
          }
          this.searching.set(true);
          return this.service.searchUsers(text).pipe(
            catchError(() => {
              this.searchFailed.set(true);
              return of<TopUpUser[]>([]);
            }),
          );
        }),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((users) => {
        this.results.set(users);
        this.searching.set(false);
      });

    // Cada vez que se abre, el formulario parte limpio.
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.submitted.set(false);
      this.selected.set(null);
      this.results.set([]);
      this.searchFailed.set(false);
      this.form.reset({ search: '', amount: null });
    });
  }

  protected pick(user: TopUpUser): void {
    this.selected.set(user);
    this.results.set([]);
    this.form.controls.search.setValue('', { emitEvent: false });
  }

  protected clearSelection(): void {
    this.selected.set(null);
  }

  protected get showNoResults(): boolean {
    const text = this.form.controls.search.value.trim();
    return text.length >= MIN_SEARCH_LENGTH && !this.searching() && !this.searchFailed() && this.results().length === 0;
  }

  protected submit(): void {
    this.submitted.set(true);
    const user = this.selected();
    if (!user || this.form.controls.amount.invalid || this.saving()) {
      return;
    }
    this.saved.emit({ userId: user.id, userName: user.fullName, amount: Number(this.form.controls.amount.value) });
  }

  private hasMoreThanTwoDecimals(value: number | null): boolean {
    if (value === null || Number.isNaN(Number(value))) {
      return false;
    }
    return Math.abs(Math.round(Number(value) * 100) - Number(value) * 100) > 1e-6;
  }
}
