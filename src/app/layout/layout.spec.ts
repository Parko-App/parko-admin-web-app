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

  it('el sidebar muestra los 8 ítems y no incluye "Llaves"', async () => {
    const fixture = TestBed.createComponent(SidebarComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const labels = Array.from(el.querySelectorAll('.nav-link__label')).map((n) => n.textContent?.trim());
    expect(labels).toEqual(['Dashboard', 'Usuarios', 'Vehículos', 'Tickets', 'Carga de saldos', 'Reportes', 'Accesos', 'Configuración']);
    expect(el.textContent).not.toContain('Llaves');
    expect(el.textContent).toContain('Cerrar sesión');
  });

  it('el encabezado del sidebar usa el logo de Parko, no una letra', async () => {
    const fixture = TestBed.createComponent(SidebarComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;

    const logo = el.querySelector('.sidebar__brand .sidebar__logo img') as HTMLImageElement;
    expect(logo).not.toBeNull();
    expect(logo.getAttribute('src')).toBe('logo.png');
    expect(el.querySelector('.sidebar__name')?.textContent?.trim()).toBe('PARKO');
    expect(el.querySelector('.sidebar__logo')?.textContent?.trim()).toBe('');
  });

  it('el layout se fija a la ventana y solo el contenido scrollea (una sola barra de scroll)', async () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;

    const layout = getComputedStyle(el.querySelector('.admin-layout')!);
    expect(layout.position).toBe('fixed');
    expect(layout.overflow).toBe('hidden');
    expect(getComputedStyle(el.querySelector('.admin-layout__content')!).overflowY).toBe('auto');
    expect(getComputedStyle(el.querySelector('.admin-layout__main')!).minHeight).toBe('0px');
  });

  it('resalta la opción activa', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/tickets');
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const active = fixture.nativeElement.querySelector('.nav-link--active');
    expect(active?.textContent).toContain('Tickets');
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
    expect(el.textContent).not.toContain('Sistema operativo');
    expect(el.querySelector('button')).toBeNull(); // sin campana de notificaciones
  });

  it('la pantalla se llama Tickets (menú, título y URL) y la URL vieja /pagos redirige', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/pagos');
    expect(router.url).toBe('/admin/tickets');

    const fixture = TestBed.createComponent(TopbarComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Tickets');
    expect(fixture.nativeElement.querySelector('h1')?.textContent).not.toContain('Pagos');
  });

  it('redirige la raíz al dashboard dentro del layout', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    expect(router.url).toBe('/admin/dashboard');
  });
});
