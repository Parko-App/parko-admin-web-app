import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeEsAr from '@angular/common/locales/es-AR';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter } from '@angular/router';
import { provideAuth } from './core/auth/auth.providers';
import { authInterceptor } from './core/http/auth.interceptor';
import { ParkoTitleStrategy } from './core/title/parko-title.strategy';
import { routes } from './app.routes';

registerLocaleData(localeEsAr, 'es-AR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideAuth(),
    { provide: LOCALE_ID, useValue: 'es-AR' },
    { provide: TitleStrategy, useClass: ParkoTitleStrategy },
  ],
};
