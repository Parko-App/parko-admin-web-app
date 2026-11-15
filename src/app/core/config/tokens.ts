import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** URL base de la API REST (Spring Boot). Sale de environment.apiUrl. */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});

/**
 * Indica si los servicios deben usar datos mock en lugar de la API real.
 * Cada servicio de feature decide su implementación según este flag.
 */
export const USE_MOCKS = new InjectionToken<boolean>('USE_MOCKS', {
  providedIn: 'root',
  factory: () => environment.useMocks,
});

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/** Configuración web del proyecto Firebase (el mismo que usa la app mobile). */
export const FIREBASE_CONFIG = new InjectionToken<FirebaseWebConfig>('FIREBASE_CONFIG', {
  providedIn: 'root',
  factory: () => environment.firebase,
});
