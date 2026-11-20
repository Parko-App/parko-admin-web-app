import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { DASHBOARD_SERVICE_PROVIDER } from './features/dashboard/dashboard.service';
import { USERS_SERVICE_PROVIDER } from './features/users/users.service';
import { VEHICLES_SERVICE_PROVIDER } from './features/vehicles/vehicles.service';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';

const underConstruction = () =>
  import('./shared/components/under-construction/under-construction.component').then(
    (m) => m.UnderConstructionComponent,
  );

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
      { path: 'pagos', title: 'Procesamiento de Pagos', loadComponent: underConstruction },
      { path: 'reportes', title: 'Reportes', loadComponent: underConstruction },
      { path: 'incidencias', title: 'Gestión de Incidencias', loadComponent: underConstruction },
      { path: 'configuracion', title: 'Configuración del Sistema', loadComponent: underConstruction },
    ],
  },
  { path: '**', redirectTo: 'admin/dashboard' },
];
