import { TestBed } from '@angular/core/testing';

import type { OrderStatus } from '../models/order.model';

import { OrderService } from './order.service';

// Firebase se reemplaza por dobles de prueba: las pruebas no modifican pedidos
// reales en Firestore.
const firebase = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` })),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

// Angular no permite simular imports relativos (como ../core/firebase), asi que
// se simulan los paquetes de Firebase que ese modulo usa para inicializarse.
vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));

vi.mock('firebase/auth', () => ({ getAuth: () => ({}) }));

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  doc: firebase.doc,
  updateDoc: firebase.updateDoc,
  serverTimestamp: firebase.serverTimestamp,
  collection: vi.fn(),
  addDoc: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

describe('OrderService: cambio de estado del comerciante', () => {
  let service: OrderService;

  beforeEach(() => {
    vi.clearAllMocks();
    firebase.updateDoc.mockResolvedValue(undefined);

    TestBed.configureTestingModule({});
    service = TestBed.inject(OrderService);
  });

  describe('updateStatus', () => {
    const validSteps: [OrderStatus, OrderStatus][] = [
      ['pending', 'preparing'],
      ['preparing', 'on_the_way'],
      ['on_the_way', 'delivered'],
    ];

    it.each(validSteps)('permite avanzar de %s a %s', async (current, next) => {
      await service.updateStatus('pedido-1', current, next);

      expect(firebase.updateDoc).toHaveBeenCalledWith(
        { path: 'orders/pedido-1' },
        { status: next, updatedAt: 'SERVER_TIMESTAMP' },
      );
    });

    it('solo envia status y updatedAt, como exige la regla changesOnlyStatus', async () => {
      await service.updateStatus('pedido-1', 'pending', 'preparing');

      const changes = firebase.updateDoc.mock.calls[0][1] as Record<string, unknown>;
      expect(Object.keys(changes).sort()).toEqual(['status', 'updatedAt']);
    });

    const invalidSteps: [OrderStatus, OrderStatus][] = [
      ['pending', 'delivered'],
      ['pending', 'on_the_way'],
      ['preparing', 'pending'],
      ['delivered', 'pending'],
      ['pending', 'cancelled'],
      ['cancelled', 'preparing'],
    ];

    it.each(invalidSteps)('rechaza pasar de %s a %s sin llamar a Firestore', async (current, next) => {
      await expect(service.updateStatus('pedido-1', current, next)).rejects.toThrow('INVALID_STATUS_TRANSITION');
      expect(firebase.updateDoc).not.toHaveBeenCalled();
    });

    it('propaga el error si las reglas rechazan el cambio', async () => {
      const denied = Object.assign(new Error('denied'), { code: 'permission-denied' });
      firebase.updateDoc.mockRejectedValue(denied);

      await expect(service.updateStatus('pedido-1', 'pending', 'preparing')).rejects.toBe(denied);
    });
  });

  describe('nextMerchantStatuses', () => {
    it('ofrece un solo paso siguiente en los estados activos', () => {
      expect(service.nextMerchantStatuses('pending')).toEqual(['preparing']);
      expect(service.nextMerchantStatuses('preparing')).toEqual(['on_the_way']);
      expect(service.nextMerchantStatuses('on_the_way')).toEqual(['delivered']);
    });

    it('no ofrece acciones en los estados finales', () => {
      expect(service.nextMerchantStatuses('delivered')).toEqual([]);
      expect(service.nextMerchantStatuses('cancelled')).toEqual([]);
    });
  });
});
