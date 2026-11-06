import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import type { Observable } from 'rxjs';

import { userMessage } from '../../core/error-message';
import { orderStatusLabel } from '../../models/order-status';
import type { Order } from '../../models/order.model';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-orders-detail',
  templateUrl: './orders-detail.page.html',
  styleUrls: ['./orders-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    DatePipe,
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
})
export class OrdersDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  readonly orderId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly order$: Observable<Order | null> = this.orders.orderById(this.orderId);
  readonly statusLabel = orderStatusLabel;
  cancelling = false;

  async confirmCancellation(order: Order): Promise<void> {
    const alert = await this.alertController.create({
      header: '¿Cancelar pedido?',
      message: 'El pedido se conservará en tu historial, pero el comercio ya no deberá prepararlo.',
      buttons: [
        { text: 'Volver', role: 'cancel' },
        { text: 'Cancelar pedido', role: 'destructive', handler: () => void this.cancel(order) },
      ],
    });
    await alert.present();
  }

  private async cancel(order: Order): Promise<void> {
    this.cancelling = true;
    try {
      await this.orders.cancel(order.id, order.status);
      await this.showMessage('Pedido cancelado.', 'success');
    } catch (error) {
      await this.showMessage(userMessage(error, 'No se pudo cancelar el pedido.'), 'danger');
    } finally {
      this.cancelling = false;
    }
  }

  private async showMessage(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 2500, color });
    await toast.present();
  }
}
