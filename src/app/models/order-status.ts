import type { OrderStatus } from './order.model';

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  preparing: 'Preparando',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};
