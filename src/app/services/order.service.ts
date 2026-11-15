import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable } from 'rxjs';

import { db } from '../core/firebase';
import type { Order, OrderStatus, NewOrder } from '../models/order.model';
import type { AppSession } from '../models/user-profile.model';

const merchantTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing'],
  preparing: ['on_the_way'],
  on_the_way: ['delivered'],
  delivered: [],
  cancelled: [],
};

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly orders = collection(db, 'orders');

  customerOrders(ownerUid: string): Observable<Order[]> {
    const ordersQuery = query(this.orders, where('ownerUid', '==', ownerUid), orderBy('createdAt', 'desc'));
    return this.observeOrders(ordersQuery);
  }

  merchantOrders(): Observable<Order[]> {
    return this.observeOrders(query(this.orders, orderBy('createdAt', 'desc')));
  }

  orderById(id: string): Observable<Order | null> {
    return new Observable((subscriber) =>
      onSnapshot(
        doc(db, 'orders', id),
        (snapshot) => subscriber.next(snapshot.exists() ? this.toOrder(snapshot.id, snapshot.data()) : null),
        (error) => subscriber.error(error),
      ),
    );
  }

  async create(order: NewOrder, session: AppSession): Promise<string> {
    const reference = await addDoc(this.orders, {
      productName: order.productName.trim(),
      quantity: order.quantity,
      deliveryAddress: order.deliveryAddress.trim(),
      notes: order.notes.trim(),
      ownerUid: session.uid,
      ownerName: session.fullName,
      ownerEmail: session.email,
      status: 'pending' satisfies OrderStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return reference.id;
  }

  async updateStatus(id: string, currentStatus: OrderStatus, nextStatus: OrderStatus): Promise<void> {
    if (!merchantTransitions[currentStatus].includes(nextStatus)) {
      throw new Error('INVALID_STATUS_TRANSITION');
    }

    await updateDoc(doc(db, 'orders', id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  }

  async cancel(id: string, currentStatus: OrderStatus): Promise<void> {
    if (currentStatus !== 'pending') {
      throw new Error('ORDER_CANNOT_BE_CANCELLED');
    }

    await updateDoc(doc(db, 'orders', id), {
      status: 'cancelled' satisfies OrderStatus,
      updatedAt: serverTimestamp(),
    });
  }

  nextMerchantStatuses(status: OrderStatus): OrderStatus[] {
    return merchantTransitions[status];
  }

  private observeOrders(ordersQuery: ReturnType<typeof query>): Observable<Order[]> {
    return new Observable((subscriber) =>
      onSnapshot(
        ordersQuery,
        (snapshot) => subscriber.next(snapshot.docs.map((item) => this.toOrder(item.id, item.data()))),
        (error) => subscriber.error(error),
      ),
    );
  }

  private toOrder(id: string, data: unknown): Order {
    return { id, ...(data as Omit<Order, 'id'>) };
  }
}
