import { formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, LOCALE_ID, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ARGENTINA_UTC_OFFSET } from '../../shared/utils/argentina-time';
import { NavBadgesService } from '../nav-badges.service';

function deepestTitle(route: ActivatedRouteSnapshot): string {
  let current = route;
  while (current.firstChild) {
    current = current.firstChild;
  }
  const title = current.title;
  return typeof title === 'string' ? title : '';
}

@Component({
  selector: 'app-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private readonly router = inject(Router);
  private readonly locale = inject(LOCALE_ID);
  protected readonly badges = inject(NavBadgesService);

  protected readonly title = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => deepestTitle(this.router.routerState.snapshot.root)),
    ),
    { initialValue: '' },
  );

  /** Ej.: "Sábado 14 de noviembre de 2026" (es-AR, hora de Argentina). */
  protected readonly today = (() => {
    const text = formatDate(new Date(), "EEEE d 'de' MMMM 'de' y", this.locale, ARGENTINA_UTC_OFFSET);
    return text.charAt(0).toUpperCase() + text.slice(1);
  })();
}
