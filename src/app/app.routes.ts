import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.page').then(m => m.HomePage)
  },
  {
    path: 'orders',
    loadComponent: () =>
      import('./pages/orders/orders.page').then(m => m.OrdersPage)
  },
  {
    path: 'catalog',
    loadComponent: () =>
      import('./pages/catalog/catalog.page').then(m => m.CatalogPage)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  }
];