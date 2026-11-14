import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Pantalla provisoria de las secciones que todavía no se desarrollaron. */
@Component({
  selector: 'app-under-construction',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card pending" aria-live="polite">
      <h2>Sección en construcción</h2>
      <p>Esta pantalla se desarrollará en una próxima historia.</p>
    </section>
  `,
  styles: `
    .pending {
      padding: 32px;
      text-align: center;
      color: var(--color-muted);

      h2 {
        margin: 0 0 6px;
        font-size: 16px;
        font-weight: 600;
        color: var(--color-text);
      }

      p {
        margin: 0;
      }
    }
  `,
})
export class UnderConstructionComponent {}
