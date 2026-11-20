import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { routes } from '../app.routes';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from '../core/auth/auth.service';
import { MOCK_AUTH_PROVIDERS } from '../core/auth/auth.providers';

registerLocaleData(localeEsAr, 'es-AR');

describe('Layout administrativo', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [provideRouter(routes), provideHttpClient(), ...MOCK_AUTH_PROVIDERS, { provide: LOCALE_ID, useValue: 'es-AR' }],
    }).compileComponents();
    sessionStorage.clear();
    await TestBed.inject(AuthService).login('admin@parko.site', 'Admin1234!');
  });

  it('el sidebar muestra los 7 ítems y no incluye "Llaves"', async () => {
    const fixture = TestBed.createComponent(SidebarComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const labels = Array.from(el.querySelectorAll('.nav-link__label')).map((n) => n.textContent?.trim());
    expect(labels).toEqual(['Dashboard', 'Usuarios', 'Vehículos', 'Pagos', 'Reportes', 'Accesos', 'Configuración']);
    expect(el.textContent).not.toContain('Llaves');
    expect(el.textContent).toContain('Cerrar sesión');
  });

  it('resalta la opción activa', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/pagos');
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const active = fixture.nativeElement.querySelector('.nav-link--active');
    expect(active?.textContent).toContain('Pagos');
    expect(active?.getAttribute('aria-current')).toBe('page');
  });

  it('el topbar muestra el título de la ruta y la fecha en español', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/usuarios');
    const fixture = TestBed.createComponent(TopbarComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('Gestión de Usuarios');
    expect(el.querySelector('time')?.textContent).toMatch(/ de .* de \d{4}/);
    expect(el.textContent).toContain('Sistema operativo');
  });

  it('redirige la raíz al dashboard dentro del layout', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    expect(router.url).toBe('/admin/dashboard');
  });
});
