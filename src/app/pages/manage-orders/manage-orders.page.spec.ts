import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { OrderService } from '../../services/order.service';

import { ManageOrdersPage } from './manage-orders.page';

describe('ManageOrdersPage', () => {
  let component: ManageOrdersPage;
  let fixture: ComponentFixture<ManageOrdersPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: OrderService, useValue: { merchantOrders: () => of([]), nextMerchantStatuses: () => [] } },
      ],
    });
    fixture = TestBed.createComponent(ManageOrdersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
