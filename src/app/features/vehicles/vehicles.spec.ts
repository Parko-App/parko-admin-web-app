import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../core/notifications/toast.service';
import { formatPlate, isValidPlate, normalizePlate } from '../../shared/utils/plate';
import { VehiclesComponent } from './vehicles.component';
import { MockVehiclesService, VehiclesService } from './vehicles.service';

registerLocaleData(localeEsAr, 'es-AR');

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

async function setup() {
  TestBed.configureTestingModule({
    imports: [VehiclesComponent],
    providers: [{ provide: VehiclesService, useClass: MockVehiclesService }, { provide: LOCALE_ID, useValue: 'es-AR' }],
  });
  const fixture = TestBed.createComponent(VehiclesComponent);
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
  const submit = async () => {
    (el.querySelector('#vehicle-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle(30);
  };
  const plates = () => Array.from(el.querySelectorAll('.vehicles tbody tr .plate')).map((td) => td.textContent?.trim());
  return { fixture, el, settle, click, type, submit, plates, toast: TestBed.inject(ToastService) };
}

describe('utilidades de patente', () => {
  it('normaliza, valida y da formato', () => {
    expect(normalizePlate('ab 123-cd')).toBe('AB123CD');
    expect(isValidPlate('AB 123 CD')).toBe(true);
    expect(isValidPlate('abc123')).toBe(true);
    expect(isValidPlate('A1B2C3')).toBe(false);
    expect(isValidPlate('AB 12 CD')).toBe(false);
    expect(formatPlate('AB123CD')).toBe('AB 123 CD');
    expect(formatPlate('ABC123')).toBe('ABC 123');
  });
});

describe('VehiclesComponent', () => {
  it('lista las patentes con usuario, vehículo, estado y fecha de registro', async () => {
    const { el, plates } = await setup();
    expect(plates().length).toBe(10);
    const first = el.querySelector('.vehicles tbody tr')!.textContent!;
    expect(first).toContain('AB 123 CD');
    expect(first).toContain('Lucas Fernández');
    expect(first).toContain('Toyota Corolla');
    expect(first).toContain('Activa');
    expect(first).toContain('12/03/2025');
    expect(el.textContent).toContain('Inactiva');
    expect(el.textContent).toContain('Hilux');
  });

  it('busca por patente (con o sin espacios)', async () => {
    const { plates, type, settle } = await setup();
    type('#search', 'ab 123');
    await settle(350);
    expect(plates()).toEqual(['AB 123 CD']);
    type('#search', 'gh');
    await settle(350);
    expect(plates()).toEqual(['GH 789 IJ', 'EF 456 GH']);
  });

  it('ordena por patente y por fecha de registro', async () => {
    const { el, plates, click, settle } = await setup();
    click('th[appSortHeader="plate"] button');
    await settle();
    expect(plates()[0]).toBe('AA 222 BB');
    click('th[appSortHeader="plate"] button');
    await settle();
    expect(plates()[0]).toBe('WX 111 YZ');
    expect(el.querySelector('th[appSortHeader="plate"]')?.getAttribute('aria-sort')).toBe('descending');

    click('th[appSortHeader="registeredAt"] button');
    await settle();
    expect(plates()[0]).toBe('AA 222 BB'); // 30/09/2023, la más antigua
  });

  it('valida la patente al registrar', async () => {
    const { el, click, type, settle, submit } = await setup();
    click('.btn--primary');
    await settle();
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('Registrar patente');
    await submit();
    expect(el.textContent).toContain('Ingresá la patente.');
    type('#plate', 'XX 1 YY');
    type('#ownerEmail', 'a.lopez@utn.edu.ar');
    await submit();
    expect(el.textContent).toContain('Formato inválido');
    expect(el.textContent).toContain('Ingresá la marca.');
    expect(el.textContent).toContain('Ingresá el modelo.');
  });

  it('registra una patente y refresca el listado', async () => {
    const { el, click, type, settle, submit, toast, plates } = await setup();
    click('.btn--primary');
    await settle();
    type('#plate', 'zz 999 xx');
    type('#ownerEmail', 'l.mendez@utn.edu.ar');
    type('#brand', 'Ford');
    type('#model', 'Ka');
    await submit();
    expect(el.querySelector('[role=dialog]')).toBeNull();
    expect(toast.toasts()[0].message).toBe('Patente registrada correctamente.');
    expect(plates().length).toBe(10);
    expect(el.querySelector('app-pagination')).not.toBeNull(); // 11 patentes -> 2 páginas
  });

  it('informa patente duplicada y usuario inexistente', async () => {
    const { el, click, type, settle, submit } = await setup();
    click('.btn--primary');
    await settle();
    type('#plate', 'AB123CD');
    type('#ownerEmail', 'a.lopez@utn.edu.ar');
    type('#brand', 'Ford');
    type('#model', 'Ka');
    await submit();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Esa patente ya está registrada.');

    type('#plate', 'ZZ999XX');
    type('#ownerEmail', 'nadie@utn.edu.ar');
    await submit();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('No existe un usuario con ese correo.');
    expect(el.querySelector('[role=dialog]')).not.toBeNull();
  });

  it('edita una patente precargando sus datos, con el estado', async () => {
    const { el, click, type, settle, submit, toast } = await setup();
    click('.link', 0);
    await settle();
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('Editar patente');
    expect((el.querySelector('#plate') as HTMLInputElement).value).toBe('AB 123 CD');
    expect((el.querySelector('#ownerEmail') as HTMLInputElement).value).toBe('lucas.fernandez@utn.edu.ar');
    expect((el.querySelector('#brand') as HTMLInputElement).value).toBe('Toyota');
    expect((el.querySelector('#model') as HTMLInputElement).value).toBe('Corolla');
    expect(el.querySelector('#status')).not.toBeNull();
    const status = el.querySelector('#status') as HTMLSelectElement;
    status.value = 'INACTIVE';
    status.dispatchEvent(new Event('change'));
    type('#plate', 'AB 123 CE');
    await submit();
    expect(toast.toasts()[0].message).toBe('Patente actualizada correctamente.');
    expect(el.textContent).toContain('AB 123 CE');
  });

  it('en el alta no muestra el estado', async () => {
    const { el, click, settle } = await setup();
    click('.btn--primary');
    await settle();
    expect(el.querySelector('#status')).toBeNull();
  });

  it('confirma la baja nombrando la patente y su titular (baja lógica)', async () => {
    const { el, click, settle, toast } = await setup();
    click('.link--danger', 8); // AA 222 BB - Carlos Pérez
    await settle();
    const dialog = el.querySelector('[role=dialog]')!;
    expect(dialog.textContent).toContain('Confirmar baja');
    expect(dialog.textContent).toContain('¿Está seguro de que desea dar de baja la patente AA 222 BB de Carlos Pérez?');
    click('.dialog__footer .btn--primary');
    await settle(30);
    expect(toast.toasts()[0].message).toBe('Se dio de baja la patente AA 222 BB.');
    expect(el.querySelectorAll('.vehicles tbody tr')[8].textContent).toContain('Inactiva');
  });
});
