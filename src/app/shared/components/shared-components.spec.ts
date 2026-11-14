import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError, toArray } from 'rxjs';
import { toErrorMessage } from '../../core/http/error-message';
import { ToastService } from '../../core/notifications/toast.service';
import { toAsyncState } from '../utils/async-state';
import { AsyncStateComponent } from './async-state/async-state.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { ModalComponent } from './modal/modal.component';
import { PaginationComponent } from './pagination/pagination.component';
import { StatusBadgeComponent } from './status-badge/status-badge.component';

describe('toErrorMessage', () => {
  it('mapea los códigos HTTP a mensajes en español', () => {
    expect(toErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('conectar');
    expect(toErrorMessage(new HttpErrorResponse({ status: 403 }))).toContain('permisos');
    expect(toErrorMessage(new HttpErrorResponse({ status: 500 }))).toContain('servidor');
    expect(toErrorMessage(new Error('x'))).toBe('Ocurrió un error inesperado.');
  });

  it('prioriza el mensaje del backend en 400/409', () => {
    const error = new HttpErrorResponse({ status: 409, error: { message: 'La patente ya existe' } });
    expect(toErrorMessage(error)).toBe('La patente ya existe');
  });
});

describe('toAsyncState', () => {
  it('emite cargando y luego éxito', async () => {
    const states = await firstValueFrom(toAsyncState(of([1, 2])).pipe(toArray()));
    expect(states.map((s) => s.status)).toEqual(['loading', 'success']);
  });

  it('emite vacío cuando no hay datos', async () => {
    const states = await firstValueFrom(toAsyncState(of([])).pipe(toArray()));
    expect(states[1].status).toBe('empty');
  });

  it('emite error con mensaje legible', async () => {
    const source = throwError(() => new HttpErrorResponse({ status: 500 }));
    const states = await firstValueFrom(toAsyncState(source).pipe(toArray()));
    expect(states[1].status).toBe('error');
    expect(states[1].error).toContain('servidor');
  });
});

describe('AsyncStateComponent', () => {
  @Component({
    imports: [AsyncStateComponent],
    template: `<app-async-state [status]="status()" error="Falló" (retry)="retried = true"><p id="data">datos</p></app-async-state>`,
  })
  class Host {
    status = signal<'loading' | 'error' | 'empty' | 'success'>('loading');
    retried = false;
  }

  it('muestra el estado que corresponde y permite reintentar', async () => {
    const fixture = TestBed.createComponent(Host);
    const el: HTMLElement = fixture.nativeElement;
    fixture.detectChanges();
    expect(el.querySelector('[role=status]')).not.toBeNull();
    expect(el.querySelector('#data')).toBeNull();

    fixture.componentInstance.status.set('error');
    fixture.detectChanges();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Falló');
    (el.querySelector('.error__retry') as HTMLButtonElement).click();
    expect(fixture.componentInstance.retried).toBe(true);

    fixture.componentInstance.status.set('empty');
    fixture.detectChanges();
    expect(el.textContent).toContain('No hay resultados');

    fixture.componentInstance.status.set('success');
    fixture.detectChanges();
    expect(el.querySelector('#data')).not.toBeNull();
  });
});

describe('ModalComponent y ConfirmDialog', () => {
  it('no renderiza nada cerrado y cierra con Escape', () => {
    const fixture = TestBed.createComponent(ModalComponent);
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('title', 'Prueba');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=dialog]')).toBeNull();

    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role=dialog]');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain('Prueba');
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closed).toBe(1);
  });

  it('el diálogo de confirmación emite confirmar y cancelar', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('message', '¿Eliminar?');
    fixture.componentRef.setInput('confirmLabel', 'Eliminar');
    fixture.componentRef.setInput('danger', true);
    fixture.detectChanges();
    const events: string[] = [];
    fixture.componentInstance.confirmed.subscribe(() => events.push('ok'));
    fixture.componentInstance.cancelled.subscribe(() => events.push('cancel'));
    const buttons = fixture.nativeElement.querySelectorAll('.dialog__footer button');
    (buttons[1] as HTMLButtonElement).click();
    (buttons[0] as HTMLButtonElement).click();
    expect(events).toEqual(['ok', 'cancel']);
    expect(buttons[1].classList).toContain('btn--danger');
  });
});

describe('PaginationComponent', () => {
  it('muestra el rango y emite la página pedida', () => {
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('size', 10);
    fixture.componentRef.setInput('totalElements', 25);
    fixture.componentRef.setInput('totalPages', 3);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('11–20 de 25');
    expect(el.textContent).toContain('Página 2 de 3');
    const pages: number[] = [];
    fixture.componentInstance.pageChange.subscribe((p) => pages.push(p));
    const [prev, next] = Array.from(el.querySelectorAll('button'));
    next.click();
    prev.click();
    expect(pages).toEqual([2, 0]);
  });

  it('deshabilita Anterior en la primera página', () => {
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('page', 0);
    fixture.componentRef.setInput('size', 10);
    fixture.componentRef.setInput('totalElements', 5);
    fixture.componentRef.setInput('totalPages', 1);
    fixture.detectChanges();
    const [prev, next] = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(true);
  });
});

describe('StatusBadge y ToastService', () => {
  it('aplica la variante del badge', () => {
    const fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('variant', 'danger');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.badge--danger')).not.toBeNull();
  });

  it('agrega y descarta avisos', () => {
    const toast = TestBed.inject(ToastService);
    toast.success('Guardado');
    expect(toast.toasts()[0]).toMatchObject({ type: 'success', message: 'Guardado' });
    toast.dismiss(toast.toasts()[0].id);
    expect(toast.toasts()).toHaveLength(0);
  });
});
