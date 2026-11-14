import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { NavBadgesService } from '../nav-badges.service';

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  badge?: 'incidents';
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Usuarios', path: '/admin/usuarios', icon: 'users' },
  { label: 'Vehículos', path: '/admin/vehiculos', icon: 'car' },
  { label: 'Pagos', path: '/admin/pagos', icon: 'payments' },
  { label: 'Reportes', path: '/admin/reportes', icon: 'reports' },
  { label: 'Incidencias', path: '/admin/incidencias', icon: 'alert', badge: 'incidents' },
  { label: 'Configuración', path: '/admin/configuracion', icon: 'settings' },
];

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  protected readonly user = inject(CurrentUserService);
  protected readonly badges = inject(NavBadgesService);
  protected readonly items = NAV_ITEMS;

  readonly logout = output<void>();
}
