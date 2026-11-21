import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TopUpsComponent } from './top-ups.component';
import { MockTopUpsService, TopUpsService } from './top-ups.service';

registerLocaleData(localeEsAr, 'es-AR');

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

async function setup() {
  TestBed.configureTestingModule({
    imports: [TopUpsComponent],
    providers: [{ provide: TopUpsService, useClass: MockTopUpsService }, { provide: LOCALE_ID, useValue: 'es-AR' }],
  });
  const fixture = TestBed.createComponent(TopUpsComponent);
  fixture.detectChanges();
  const settle = async (ms = 10) => {
    await tick(ms);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  await settle();
  return { fixture, el: fixture.nativeElement as HTMLElement, settle };
}

describe('TopUpsComponent', () => {
  it('lista las cargas, la más reciente primero, con paginación', async () => {
    const { el } = await setup();
    const rows = el.querySelectorAll('.topups tbody tr');
    expect(rows.length).toBe(10);
    expect(rows[0].textContent).toContain('TX-54EFBE');
    expect(rows[0].textContent).toContain('$5.000');
    expect(el.querySelector('app-pagination')).not.toBeNull();
  });

  it('busca por transacción o por usuario', async () => {
    const { el, settle } = await setup();
    const input = el.querySelector('#topup-search') as HTMLInputElement;
    input.value = 'tx-7a21';
    input.dispatchEvent(new Event('input'));
    await settle(350);
    expect(el.querySelectorAll('.topups tbody tr').length).toBe(1);
    expect(el.textContent).toContain('Valentina Romero');

    input.value = 'lucas';
    input.dispatchEvent(new Event('input'));
    await settle(350);
    expect(el.querySelectorAll('.topups tbody tr').length).toBe(3);
  });

  it('ver detalle abre el comprobante en verde y solo las acreditadas tienen PDF', async () => {
    const { el, settle } = await setup();
    const rows = el.querySelectorAll('.topups tbody tr');
    // la 4.ª fila (TX-1F6E8A) está pendiente: sin botón de PDF
    expect(rows[3].textContent).toContain('Pendiente');
    expect(rows[3].textContent).not.toContain('Generar PDF');
    expect(rows[0].textContent).toContain('Generar PDF');

    (rows[0].querySelector('button.link') as HTMLButtonElement).click();
    await settle();
    expect(el.querySelector('.receipt__title')?.textContent).toContain('Carga de Saldo');
    expect(el.querySelector('.receipt__amount--credit')?.textContent?.trim()).toBe('+ $5.000');
  });

  it('ordena por monto', async () => {
    const { el, settle } = await setup();
    (el.querySelector('th[appSortHeader="amount"] button') as HTMLButtonElement).click();
    await settle();
    const first = el.querySelector('.topups tbody tr .amount')?.textContent?.trim();
    expect(first).toBe('$900');
  });

  describe('cargar saldo', () => {
    const type = async (el: HTMLElement, selector: string, value: string, settle: (ms?: number) => Promise<void>, ms = 10) => {
      const input = el.querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await settle(ms);
    };
    const open = async (el: HTMLElement, settle: (ms?: number) => Promise<void>) => {
      (el.querySelector('button.toolbar__action') as HTMLButtonElement).click();
      await settle();
    };
    const submit = async (el: HTMLElement, settle: (ms?: number) => Promise<void>) => {
      (el.querySelector('button[form="top-up-form"]') as HTMLButtonElement).click();
      await settle();
    };

    it('el botón abre el diálogo', async () => {
      const { el, settle } = await setup();
      expect(el.querySelector('#top-up-form')).toBeNull();

      await open(el, settle);

      expect(el.querySelector('#top-up-form')).not.toBeNull();
      expect(el.textContent).toContain('Cargar saldo');
    });

    it('no envía sin usuario ni monto y marca los errores', async () => {
      const { el, settle } = await setup();
      await open(el, settle);

      await submit(el, settle);

      expect(el.querySelector('#top-up-form')).not.toBeNull();
      expect(el.textContent).toContain('Elegí el usuario');
      expect(el.textContent).toContain('Ingresá el monto');
    });

    it('rechaza montos con más de 2 decimales o fuera de rango', async () => {
      const { el, settle } = await setup();
      await open(el, settle);

      await type(el, '#top-up-amount', '10.555', settle);
      await submit(el, settle);
      expect(el.textContent).toContain('más de 2 decimales');

      await type(el, '#top-up-amount', '999999', settle);
      await submit(el, settle);
      expect(el.textContent).toContain('no puede superar');

      await type(el, '#top-up-amount', '0', settle);
      await submit(el, settle);
      expect(el.textContent).toContain('mayor a cero');
    });

    it('busca un usuario, lo elige, carga el monto y la carga aparece primera en la lista', async () => {
      const { el, settle } = await setup();
      await open(el, settle);

      await type(el, '#top-up-user', 'lucas', settle, 350);
      const options = el.querySelectorAll('.results button');
      expect(options.length).toBe(1);
      expect(options[0].textContent).toContain('Lucas Fernández');

      (options[0] as HTMLButtonElement).click();
      await settle();
      expect(el.querySelector('.chosen')?.textContent).toContain('lucas.fernandez@frc.utn.edu.ar');

      await type(el, '#top-up-amount', '1500', settle);
      await submit(el, settle);

      expect(el.querySelector('#top-up-form')).toBeNull(); // el diálogo se cerró
      const firstRow = el.querySelector('.topups tbody tr') as HTMLElement;
      expect(firstRow.textContent).toContain('Lucas Fernández');
      expect(firstRow.textContent).toContain('$1.500');
      expect(firstRow.textContent).toContain('Efectivo');
      expect(firstRow.textContent).toContain('Acreditada');
    });

    it('avisa cuando no hay usuarios que coincidan', async () => {
      const { el, settle } = await setup();
      await open(el, settle);

      await type(el, '#top-up-user', 'zzzz', settle, 350);

      expect(el.querySelectorAll('.results button').length).toBe(0);
      expect(el.textContent).toContain('No se encontraron usuarios');
    });
  });
});
