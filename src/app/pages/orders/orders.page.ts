import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import type { Observable } from 'rxjs';

import { orderStatusLabel } from '../../models/order-status';
import type { Order } from '../../models/order.model';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.page.html',
  styleUrls: ['./orders.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    DatePipe,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonNote,
    IonSpinner,
  ],
})
export class OrdersPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly ordersService = inject(OrderService);

  orders$?: Observable<Order[]>;
  readonly statusLabel = orderStatusLabel;

  async ngOnInit(): Promise<void> {
    const session = await this.auth.activeSession();
    if (session) this.orders$ = this.ordersService.customerOrders(session.uid);
  }
}
