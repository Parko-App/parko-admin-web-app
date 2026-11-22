import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Usuarios', path: '/admin/usuarios', icon: 'users' },
  { label: 'Vehículos', path: '/admin/vehiculos', icon: 'car' },
  { label: 'Tickets', path: '/admin/tickets', icon: 'payments' },
  { label: 'Carga de saldos', path: '/admin/saldos', icon: 'wallet' },
  { label: 'Reportes', path: '/admin/reportes', icon: 'reports' },
  { label: 'Accesos', path: '/admin/accesos', icon: 'access' },
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
  protected readonly items = NAV_ITEMS;

  readonly logout = output<void>();
}
