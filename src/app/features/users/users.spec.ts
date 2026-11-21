import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../core/notifications/toast.service';
import { UsersComponent } from './users.component';
import { MockUsersService, UsersService } from './users.service';

registerLocaleData(localeEsAr, 'es-AR');

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

async function setup() {
  TestBed.configureTestingModule({
    imports: [UsersComponent],
    providers: [{ provide: UsersService, useClass: MockUsersService }, { provide: LOCALE_ID, useValue: 'es-AR' }],
  });
  const fixture = TestBed.createComponent(UsersComponent);
  fixture.detectChanges();
  await tick();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async (ms = 10) => {
    await tick(ms);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const click = (selector: string, index = 0) => (el.querySelectorAll(selector)[index] as HTMLElement).click();
  const type = (selector: string, value: string) => {
    const input = el.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  return { fixture, el, settle, click, type, toast: TestBed.inject(ToastService) };
}

describe('UsersComponent', () => {
  it('lista los usuarios con tipo, saldo, patentes y estado', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('.users tbody tr').length).toBe(10);
    expect(el.textContent).toContain('10 usuarios');
    const first = el.querySelector('.users tbody tr')!.textContent!;
    expect(first).toContain('Lucas Fernández');
    expect(first).toContain('Alumno');
    expect(first).toContain('$4.200');
    expect(first).toContain('Activo');
    expect(el.textContent).toContain('Inactivo');
  });

  it('resalta el saldo bajo con texto accesible', async () => {
    const { el } = await setup();
    const low = Array.from(el.querySelectorAll('td.low')).map((td) => td.textContent?.replace(/\s+/g, ' ').trim());
    expect(low).toEqual(['$300 (saldo bajo)', '$0 (saldo bajo)']);
  });

  it('filtra por nombre, correo o legajo (sin distinguir tildes) y vuelve a la página 1', async () => {
    const { el, type, settle } = await setup();
    type('#search', 'sofia');
    await settle(350);
    expect(el.querySelectorAll('.users tbody tr').length).toBe(1);
    expect(el.textContent).toContain('1 usuarios');

    type('#search', '82116');
    await settle(350);
    expect(el.querySelectorAll('.users tbody tr').length).toBe(1);
    expect(el.textContent).toContain('Lucas Fernández');
  });

  it('muestra el estado vacío cuando no hay coincidencias', async () => {
    const { el, type, settle } = await setup();
    type('#search', 'zzzz');
    await settle(350);
    expect(el.textContent).toContain('No se encontraron usuarios');
  });

  it('valida el formulario de alta', async () => {
    const { el, click, settle } = await setup();
    click('.btn--primary');
    await settle();
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('Nuevo usuario');
    (el.querySelector('#user-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle();
    expect(el.textContent).toContain('Ingresá el nombre completo.');
    expect(el.textContent).toContain('Ingresá el correo.');
    expect(el.textContent).toContain('Ingresá una contraseña inicial.');
  });

  it('exige que la contraseña cumpla la política de seguridad', async () => {
    const { el, click, type, settle } = await setup();
    click('.btn--primary');
    await settle();
    type('#fullName', 'Nuevo Usuario');
    type('#email', 'nuevo@utn.edu.ar');
    type('#password', 'corta');
    (el.querySelector('#user-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle();
    expect(el.textContent).toContain('La contraseña no cumple con la política de seguridad.');
    expect(el.querySelector('#status')).toBeNull(); // el estado solo se elige al editar
  });

  it('crea un usuario y refresca el listado', async () => {
    const { el, click, type, settle, toast } = await setup();
    click('.btn--primary');
    await settle();
    type('#fullName', 'Nuevo Usuario');
    type('#email', 'nuevo@utn.edu.ar');
    type('#password', 'Clave-Segura-2026');
    (el.querySelector('#user-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle(30);
    expect(el.querySelector('[role=dialog]')).toBeNull();
    expect(toast.toasts()[0].message).toBe('Usuario creado correctamente.');
    expect(el.textContent).toContain('11 usuarios');
    expect(el.querySelectorAll('.users tbody tr').length).toBe(10); // pagina de 10 -> 2 páginas
    expect(el.querySelector('app-pagination')).not.toBeNull();
  });

  it('rechaza un correo ya existente', async () => {
    const { el, click, type, settle } = await setup();
    click('.btn--primary');
    await settle();
    type('#fullName', 'Otra Persona');
    type('#email', 'lucas.fernandez@utn.edu.ar');
    type('#password', 'Clave-Segura-2026');
    (el.querySelector('#user-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle(30);
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Ya existe un usuario con ese correo.');
    expect(el.querySelector('[role=dialog]')).not.toBeNull();
  });

  it('edita un usuario precargando sus datos', async () => {
    const { el, click, type, settle, toast } = await setup();
    click('.link', 0); // Editar a Lucas Fernández
    await settle();
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('Editar usuario');
    expect((el.querySelector('#fullName') as HTMLInputElement).value).toBe('Lucas Fernández');
    expect(el.querySelector('#password')).toBeNull(); // la contraseña solo se define al crear
    type('#fullName', 'Lucas F. Fernández');
    (el.querySelector('#user-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle(30);
    expect(toast.toasts()[0].message).toBe('Usuario actualizado correctamente.');
    expect(el.textContent).toContain('Lucas F. Fernández');
  });

  it('pide confirmación con el nombre del usuario antes de darlo de baja', async () => {
    const { el, click, settle, toast } = await setup();
    click('.link--danger', 2); // Sofía Herrera
    await settle();
    const dialog = el.querySelector('[role=dialog]')!;
    expect(dialog.textContent).toContain('Confirmar baja');
    expect(dialog.textContent).toContain('¿Está seguro de que desea dar de baja a Sofía Herrera?');
    click('.dialog__footer .btn--primary');
    await settle(30);
    expect(el.querySelector('[role=dialog]')).toBeNull();
    expect(toast.toasts()[0].message).toBe('Se dio de baja a Sofía Herrera.');
    // baja lógica: sigue en el listado, como inactivo
    expect(el.textContent).toContain('10 usuarios');
    expect(el.querySelectorAll('.users tbody tr')[2].textContent).toContain('Inactivo');
  });

  it('cancelar la baja no modifica al usuario', async () => {
    const { el, click, settle } = await setup();
    click('.link--danger', 0);
    await settle();
    click('.dialog__footer .btn:not(.btn--primary)');
    await settle();
    expect(el.querySelector('[role=dialog]')).toBeNull();
    expect(el.querySelector('.users tbody tr')?.textContent).toContain('Activo');
  });

  const names = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('.users tbody tr .name')).map((td) => td.textContent?.trim());

  it('ordena por nombre ascendente y descendente al presionar la columna', async () => {
    const { el, click, settle } = await setup();
    click('th[appSortHeader="fullName"] button');
    await settle();
    expect(names(el)[0]).toBe('Ana López');
    expect(el.querySelector('th[appSortHeader="fullName"]')?.getAttribute('aria-sort')).toBe('ascending');
    click('th[appSortHeader="fullName"] button');
    await settle();
    expect(names(el)[0]).toBe('Valentina Romero');
    expect(el.querySelector('th[appSortHeader="fullName"]')?.getAttribute('aria-sort')).toBe('descending');
  });

  it('ordena el saldo por valor numérico', async () => {
    const { el, click, settle } = await setup();
    click('th[appSortHeader="balance"] button');
    await settle();
    expect(names(el)[0]).toBe('Diego Morales'); // $0
    click('th[appSortHeader="balance"] button');
    await settle();
    expect(names(el)[0]).toBe('Roberto Sánchez'); // $15.300
  });

  it('al ordenar conserva la búsqueda', async () => {
    const { el, click, type, settle } = await setup();
    type('#search', 'utn.edu.ar');
    await settle(350);
    click('th[appSortHeader="balance"] button');
    await settle();
    expect(el.textContent).toContain('10 usuarios');
    expect(names(el)[0]).toBe('Diego Morales');
  });
});
