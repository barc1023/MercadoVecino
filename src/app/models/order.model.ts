import type { Timestamp } from 'firebase/firestore';

export const ORDER_STATUSES = ['pending', 'preparing', 'on_the_way', 'delivered', 'cancelled'] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Order {
  id: string;
  productName: string;
  quantity: number;
  deliveryAddress: string;
  notes: string;
  ownerUid: string;
  ownerName: string;
  ownerEmail: string;
  status: OrderStatus;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface NewOrder {
  productName: string;
  quantity: number;
  deliveryAddress: string;
  notes: string;
}
