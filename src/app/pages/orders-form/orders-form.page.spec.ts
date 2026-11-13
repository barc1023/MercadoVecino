import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';

import { OrdersFormPage } from './orders-form.page';

describe('OrdersFormPage', () => {
  let component: OrdersFormPage;
  let fixture: ComponentFixture<OrdersFormPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { activeSession: async () => null } },
        { provide: OrderService, useValue: { create: async () => 'order-id' } },
      ],
    });
    fixture = TestBed.createComponent(OrdersFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());
});
