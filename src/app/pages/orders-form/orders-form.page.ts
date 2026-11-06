import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { userMessage } from '../../core/error-message';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-orders-form',
  templateUrl: './orders-form.page.html',
  styleUrls: ['./orders-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
    IonTextarea,
    IonTitle,
    IonToolbar,
  ],
})
export class OrdersFormPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly orders = inject(OrderService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  readonly form = this.formBuilder.nonNullable.group({
    productName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
    deliveryAddress: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(180)]],
    notes: ['', [Validators.maxLength(300)]],
  });
  busy = false;

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const session = await this.auth.activeSession();
    if (!session) {
      await this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }
    this.busy = true;
    try {
      const id = await this.orders.create(this.form.getRawValue(), session);
      await this.router.navigateByUrl(`/orders/${id}`, { replaceUrl: true });
      await this.showMessage('Pedido creado correctamente.', 'success');
    } catch (error) {
      await this.showMessage(userMessage(error, 'No se pudo guardar el pedido.'), 'danger');
    } finally {
      this.busy = false;
    }
  }

  private async showMessage(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}
