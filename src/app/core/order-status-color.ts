import type { OrderStatus } from '../models/order.model';

// Color del ion-badge según el estado del pedido; lo usan la lista y el detalle
// para que ambas pantallas muestren el mismo color en cada estado.
export const orderStatusColor: Record<OrderStatus, string> = {
  pending: 'primary',
  preparing: 'primary',
  on_the_way: 'primary',
  delivered: 'success',
  cancelled: 'medium',
};
