import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { OrderService } from '../../services/order.service';

import { OrdersDetailPage } from './orders-detail.page';

describe('OrdersDetailPage', () => {
  let component: OrdersDetailPage;
  let fixture: ComponentFixture<OrdersDetailPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'order-id' }) } } },
        { provide: OrderService, useValue: { orderById: () => of(null), cancel: async () => undefined } },
      ],
    });
    fixture = TestBed.createComponent(OrdersDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());
});
