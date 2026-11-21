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
});
