import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
import { EMPTY, catchError, timeout, type Observable } from 'rxjs';

import { userMessage } from '../../core/error-message';
import { orderStatusColor } from '../../core/order-status-color';
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
  private readonly router = inject(Router);

  orders$?: Observable<Order[]>;
  loadError = '';
  readonly statusLabel = orderStatusLabel;
  readonly statusColor = orderStatusColor;

  async ngOnInit(): Promise<void> {
    this.loadError = '';
    this.orders$ = undefined;

    let session;
    try {
      session = await this.auth.activeSession();
    } catch (error) {
      this.reportLoadError(error);
      return;
    }

    if (!session) {
      await this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/orders' },
        replaceUrl: true,
      });
      return;
    }

    this.orders$ = this.ordersService.customerOrders(session.uid).pipe(
      // Firestore reintenta el listener en silencio cuando no alcanza el servidor;
      // sin este límite la pantalla se quedaría "cargando" para siempre.
      timeout({ first: 15000 }),
      catchError((error) => {
        this.reportLoadError(error);
        return EMPTY;
      }),
    );
  }

  private reportLoadError(error: unknown): void {
    console.error('Error al cargar pedidos:', error);
    this.loadError = userMessage(error, 'No se pudieron cargar tus pedidos. Revisa tu conexión e inténtalo de nuevo.');
  }
}
