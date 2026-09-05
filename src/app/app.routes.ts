import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'confirmaciones',
    pathMatch: 'full'
  },
  {
    path: 'confirmaciones',
    loadComponent: () => import('./pages/confirmaciones/confirmaciones').then(m => m.Confirmaciones),
    title: 'Confirmaciones del Dia - Cafeteria Guarincito'
  },
  {
    path: 'entregas',
    loadComponent: () => import('./pages/entregas/entregas').then(m => m.Entregas),
    title: 'Entregas del Dia - Cafeteria Guarincito'
  },
  {
    path: 'beneficiarios',
    loadComponent: () => import('./pages/beneficiarios/beneficiarios').then(m => m.Beneficiarios),
    title: 'Padron de Beneficiarios - Cafeteria Guarincito'
  },
  {
    path: 'formularios',
    loadComponent: () => import('./pages/formularios/formularios').then(m => m.Formularios),
    title: 'Formularios Web - Cafeteria Guarincito'
  },
  {
    path: 'config',
    loadComponent: () => import('./pages/configuracion/configuracion').then(m => m.Configuracion),
    title: 'Configuracion y Formularios - Cafeteria Guarincito'
  },
  {
    path: 'verify',
    loadComponent: () => import('./pages/verify/verify').then(m => m.Verify),
    title: 'Verificar Codigo - Cafeteria Guarincito'
  },
  {
    path: '**',
    redirectTo: 'confirmaciones'
  }
];
