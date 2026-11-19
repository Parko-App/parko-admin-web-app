import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BadgeVariant, StatusBadgeComponent } from '../status-badge/status-badge.component';

export type KpiColor = 'primary' | 'success' | 'purple' | 'orange';

/** Indicador principal: etiqueta, valor destacado (contenido), detalle, badge y barra opcional. */
@Component({
  selector: 'app-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusBadgeComponent],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss',
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly badge = input('');
  readonly badgeVariant = input<BadgeVariant>('neutral');
  /** Porcentaje 0-100 para la barra; null la oculta. */
  readonly progress = input<number | null>(null);
  readonly color = input<KpiColor>('primary');

  protected readonly clamped = computed(() => {
    const value = this.progress();
    return value === null ? null : Math.min(100, Math.max(0, value));
  });
}
