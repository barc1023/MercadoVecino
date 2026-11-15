import type { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'orders',
    canActivate: [roleGuard('cliente')],
    loadComponent: () => import('./pages/orders/orders.page').then((m) => m.OrdersPage),
  },
  {
    path: 'orders/new',
    canActivate: [roleGuard('cliente')],
    loadComponent: () => import('./pages/orders-form/orders-form.page').then((m) => m.OrdersFormPage),
  },
  {
    path: 'orders/:id',
    canActivate: [roleGuard('cliente')],
    loadComponent: () => import('./pages/orders-detail/orders-detail.page').then((m) => m.OrdersDetailPage),
  },
  {
    path: 'catalog',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/catalog/catalog.page').then((m) => m.CatalogPage),
  },
  {
    path: 'manage-orders',
    canActivate: [roleGuard('comerciante')],
    loadComponent: () => import('./pages/manage-orders/manage-orders.page').then((m) => m.ManageOrdersPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
