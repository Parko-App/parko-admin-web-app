import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { DASHBOARD_SERVICE_PROVIDER } from './features/dashboard/dashboard.service';
import { USERS_SERVICE_PROVIDER } from './features/users/users.service';
import { VEHICLES_SERVICE_PROVIDER } from './features/vehicles/vehicles.service';
import { TOP_UPS_SERVICE_PROVIDER } from './features/top-ups/top-ups.service';
import { ACCESS_SERVICE_PROVIDER } from './features/access/access.service';
import { SETTINGS_SERVICE_PROVIDER } from './features/settings/settings.service';
import { REPORTS_SERVICE_PROVIDER } from './features/reports/reports.service';
import { PAYMENTS_SERVICE_PROVIDER } from './features/payments/payments.service';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'admin/dashboard' },
  {
    path: 'login',
    title: 'Iniciar sesión',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    title: 'Crear cuenta de administrador',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard',
        providers: [DASHBOARD_SERVICE_PROVIDER],
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'usuarios',
        title: 'Gestión de Usuarios',
        providers: [USERS_SERVICE_PROVIDER],
        loadComponent: () => import('./features/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'vehiculos',
        title: 'Gestión de Vehículos',
        providers: [VEHICLES_SERVICE_PROVIDER],
        loadComponent: () => import('./features/vehicles/vehicles.component').then((m) => m.VehiclesComponent),
      },
      {
        path: 'pagos',
        title: 'Procesamiento de Pagos',
        providers: [PAYMENTS_SERVICE_PROVIDER],
        loadComponent: () => import('./features/payments/payments.component').then((m) => m.PaymentsComponent),
      },
      {
        path: 'saldos',
        title: 'Carga de Saldos',
        providers: [TOP_UPS_SERVICE_PROVIDER],
        loadComponent: () => import('./features/top-ups/top-ups.component').then((m) => m.TopUpsComponent),
      },
      {
        path: 'reportes',
        title: 'Reportes',
        providers: [REPORTS_SERVICE_PROVIDER],
        loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },
      {
        path: 'accesos',
        title: 'Ingresos y Egresos',
        providers: [ACCESS_SERVICE_PROVIDER],
        loadComponent: () => import('./features/access/access.component').then((m) => m.AccessComponent),
      },
      {
        path: 'configuracion',
        title: 'Configuración del Sistema',
        providers: [SETTINGS_SERVICE_PROVIDER],
        loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'admin/dashboard' },
];
