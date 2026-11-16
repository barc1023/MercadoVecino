import { TestBed } from '@angular/core/testing';

import { ORDER_STATUSES, type NewOrder } from '../models/order.model';
import type { AppSession } from '../models/user-profile.model';

import { OrderService } from './order.service';

// Firebase se reemplaza por dobles de prueba: las pruebas no escriben pedidos
// reales en Firestore.
const firebase = vi.hoisted(() => ({
  ordersCollection: { path: 'orders' },
  collection: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

// Angular no permite simular imports relativos (como ../core/firebase), asi que
// se simulan los paquetes de Firebase que ese modulo usa para inicializarse.
vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));

vi.mock('firebase/auth', () => ({ getAuth: () => ({}) }));

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: firebase.collection,
  addDoc: firebase.addDoc,
  serverTimestamp: firebase.serverTimestamp,
  doc: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
}));

const session: AppSession = {
  uid: 'uid-1',
  fullName: 'Ana Perez',
  email: 'ana@prueba.com',
  role: 'cliente',
};

const newOrder: NewOrder = {
  productName: '  Pan integral  ',
  quantity: 2,
  deliveryAddress: '  Calle 10 #20-30  ',
  notes: '  Tocar el timbre  ',
};

describe('OrderService: crear pedido', () => {
  let service: OrderService;

  beforeEach(() => {
    vi.clearAllMocks();
    firebase.collection.mockReturnValue(firebase.ordersCollection);

    TestBed.configureTestingModule({});
    service = TestBed.inject(OrderService);
  });

  describe('modelo Order', () => {
    it('define los cinco estados del flujo del pedido', () => {
      expect(ORDER_STATUSES).toEqual(['pending', 'preparing', 'on_the_way', 'delivered', 'cancelled']);
    });
  });

  describe('create', () => {
    it('usa la coleccion orders', () => {
      expect(firebase.collection).toHaveBeenCalledWith(expect.anything(), 'orders');
    });

    it('guarda el pedido en estado pending, a nombre del usuario y con fechas del servidor', async () => {
      firebase.addDoc.mockResolvedValue({ id: 'pedido-1' });

      await service.create(newOrder, session);

      expect(firebase.addDoc).toHaveBeenCalledWith(firebase.ordersCollection, {
        productName: 'Pan integral',
        quantity: 2,
        deliveryAddress: 'Calle 10 #20-30',
        notes: 'Tocar el timbre',
        ownerUid: 'uid-1',
        ownerName: 'Ana Perez',
        ownerEmail: 'ana@prueba.com',
        status: 'pending',
        createdAt: 'SERVER_TIMESTAMP',
        updatedAt: 'SERVER_TIMESTAMP',
      });
    });

    it('escribe solo los campos que permiten las reglas de Firestore', async () => {
      firebase.addDoc.mockResolvedValue({ id: 'pedido-1' });

      await service.create(newOrder, session);

      const written = firebase.addDoc.mock.calls[0][1] as Record<string, unknown>;
      expect(Object.keys(written).sort()).toEqual(
        [
          'createdAt',
          'deliveryAddress',
          'notes',
          'ownerEmail',
          'ownerName',
          'ownerUid',
          'productName',
          'quantity',
          'status',
          'updatedAt',
        ].sort(),
      );
    });

    it('devuelve el ID del pedido creado', async () => {
      firebase.addDoc.mockResolvedValue({ id: 'pedido-1' });

      await expect(service.create(newOrder, session)).resolves.toBe('pedido-1');
    });

    it('propaga el error si Firestore rechaza el pedido', async () => {
      const denied = Object.assign(new Error('denied'), { code: 'permission-denied' });
      firebase.addDoc.mockRejectedValue(denied);

      await expect(service.create(newOrder, session)).rejects.toBe(denied);
    });
  });
});
