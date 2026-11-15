import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonNote,
  IonSpinner,
  ToastController,
} from '@ionic/angular';
import type { Observable } from 'rxjs';

import { userMessage } from '../../core/error-message';
import { orderStatusLabel } from '../../models/order-status';
import type { Order, OrderStatus } from '../../models/order.model';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-manage-orders',
  templateUrl: './manage-orders.page.html',
  styleUrls: ['./manage-orders.page.scss'],
  imports: [
    CommonModule,
    AsyncPipe,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonNote,
    IonSpinner,
  ],
})
export class ManageOrdersPage {
  private readonly orderService = inject(OrderService);
  private readonly toastController = inject(ToastController);

  readonly orders$: Observable<Order[]> = this.orderService.merchantOrders();
  readonly statusLabel = orderStatusLabel;
  updatingOrderId = '';

  statusOptions(status: OrderStatus): OrderStatus[] {
    return [status, ...this.orderService.nextMerchantStatuses(status)];
  }

  async updateStatus(order: Order, status: OrderStatus): Promise<void> {
    if (status === order.status) return;
    this.updatingOrderId = order.id;
    try {
      await this.orderService.updateStatus(order.id, order.status, status);
      const toast = await this.toastController.create({
        message: 'Estado actualizado.',
        duration: 1800,
        color: 'success',
      });
      await toast.present();
    } catch (error) {
      const toast = await this.toastController.create({
        message: userMessage(error, 'No se pudo actualizar el estado.'),
        duration: 2600,
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.updatingOrderId = '';
    }
  }
}
