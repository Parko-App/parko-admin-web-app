import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { ToastContainerComponent } from '../../shared/components/toast/toast-container.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

/** Layout compartido de todas las rutas privadas: sidebar fijo + topbar + contenido. */
@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, ToastContainerComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  private readonly user = inject(CurrentUserService);

  protected onLogout(): void {
    this.user.logout();
  }
}
