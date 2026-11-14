import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ErrorStateComponent } from '../error-state/error-state.component';
import { LoadingStateComponent } from '../loading-state/loading-state.component';
import { AsyncStatus } from '../../utils/async-state';

/**
 * Muestra el estado correcto de una pantalla: cargando, error, vacío o el contenido.
 * <app-async-state [status]="state().status" [error]="state().error" (retry)="reload()">
 *   ...contenido (tabla, gráfico)...
 * </app-async-state>
 */
@Component({
  selector: 'app-async-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  template: `
    @switch (status()) {
      @case ('loading') {
        <app-loading-state [message]="loadingMessage()" />
      }
      @case ('error') {
        <app-error-state [message]="error() ?? 'Ocurrió un error inesperado.'" (retry)="retry.emit()" />
      }
      @case ('empty') {
        <app-empty-state [title]="emptyTitle()" [description]="emptyDescription()" />
      }
      @default {
        <ng-content />
      }
    }
  `,
})
export class AsyncStateComponent {
  readonly status = input.required<AsyncStatus>();
  readonly error = input<string | null>(null);
  readonly loadingMessage = input('Cargando…');
  readonly emptyTitle = input('No hay resultados');
  readonly emptyDescription = input('');
  readonly retry = output<void>();
}
