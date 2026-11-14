import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' | 'orange';

/** Etiqueta de estado. Siempre lleva texto: el color nunca es el único indicador. */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge--' + variant()"><ng-content /></span>`,
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  readonly variant = input<BadgeVariant>('neutral');
}
