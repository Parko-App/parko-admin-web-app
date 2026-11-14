# Parko Admin (frontend)

Módulo web de administración de Parko — UTN FRC. Angular + TypeScript estricto.

## Requisitos
- Node.js `^22.22.3` o `^24.15.0` (o superior)
- npm 10+
- (Opcional) Angular CLI global: `npm i -g @angular/cli` (el proyecto también funciona con `npx ng`)

## Comandos
```bash
npm install          # instalar dependencias
npm start            # servidor de desarrollo en http://localhost:4200
npm run build        # build de producción (dist/parko-admin)
npm test             # pruebas unitarias (Vitest)
```

## Configuración
- `src/environments/environment.development.ts`: `apiUrl` (por defecto `http://localhost:8080/api/v1`) y `useMocks`.
- `src/environments/environment.ts`: valores de producción.
- `useMocks: true` hace que los servicios de cada feature usen datos mock; `false` consume la API real.

## Arquitectura
```
src/app/
├── core/      auth, http (interceptores), services (ApiClient), models, config (tokens)
├── layout/    admin-layout (sidebar + topbar)
├── shared/    components reutilizables, pipes (currencyAr, dateTimeAr), utils
└── features/  auth, dashboard, users, vehicles, payments, reports, incidents, settings
```
Reglas: los componentes no usan `HttpClient`; toda llamada pasa por un servicio que usa `ApiClient`.
Sin datos mock dentro de componentes.

## Formato regional
Locale `es-AR`. Pipes: `currencyAr` ($18.340) y `dateTimeAr` (dd/MM/yyyy HH:mm, UTC-3).
