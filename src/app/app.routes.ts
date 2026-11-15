import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';

const underConstruction = () =>
  import('./shared/components/under-construction/under-construction.component').then(
    (m) => m.UnderConstructionComponent,
  );

// /registro se agrega en la US5.
// Cada sección reemplaza su loadComponent cuando se desarrolla su pantalla.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'admin/dashboard' },
  {
    path: 'login',
    title: 'Iniciar sesión',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', title: 'Dashboard', loadComponent: underConstruction },
      { path: 'usuarios', title: 'Gestión de Usuarios', loadComponent: underConstruction },
      { path: 'vehiculos', title: 'Gestión de Vehículos', loadComponent: underConstruction },
      { path: 'pagos', title: 'Procesamiento de Pagos', loadComponent: underConstruction },
      { path: 'reportes', title: 'Reportes', loadComponent: underConstruction },
      { path: 'incidencias', title: 'Gestión de Incidencias', loadComponent: underConstruction },
      { path: 'configuracion', title: 'Configuración del Sistema', loadComponent: underConstruction },
    ],
  },
  { path: '**', redirectTo: 'admin/dashboard' },
];
