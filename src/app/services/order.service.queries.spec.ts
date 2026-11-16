import { TestBed } from '@angular/core/testing';

import type { Order } from '../models/order.model';

import { OrderService } from './order.service';

type SnapshotHandlers = [next: (snapshot: unknown) => void, error: (error: unknown) => void];

// Firebase se reemplaza por dobles de prueba. onSnapshot guarda los callbacks
// para que cada prueba pueda simular cuando llegan datos o errores en tiempo real.
const firebase = vi.hoisted(() => ({
  ordersCollection: { path: 'orders' },
  unsubscribe: vi.fn(),
  handlers: null as SnapshotHandlers | null,
  collection: vi.fn(),
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ type: 'where', field, op, value })),
  orderBy: vi.fn((field: string, direction: string) => ({ type: 'orderBy', field, direction })),
  query: vi.fn((source: unknown, ...constraints: unknown[]) => ({ source, constraints })),
  onSnapshot: vi.fn(),
}));

// Angular no permite simular imports relativos (como ../core/firebase), asi que
// se simulan los paquetes de Firebase que ese modulo usa para inicializarse.
vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));

vi.mock('firebase/auth', () => ({ getAuth: () => ({}) }));

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: firebase.collection,
  doc: firebase.doc,
  where: firebase.where,
  orderBy: firebase.orderBy,
  query: firebase.query,
  onSnapshot: firebase.onSnapshot,
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
}));

const storedOrder = {
  productName: 'Pan integral',
  quantity: 2,
  deliveryAddress: 'Calle 10 #20-30',
  notes: '',
  ownerUid: 'uid-1',
  ownerName: 'Ana Perez',
  ownerEmail: 'ana@prueba.com',
  status: 'pending',
};

function listSnapshot(items: { id: string; data: object }[]) {
  return { docs: items.map((item) => ({ id: item.id, data: () => item.data })) };
}

function docSnapshot(id: string, data: object | null) {
  return { id, exists: () => data !== null, data: () => data };
}

function emit(snapshot: unknown): void {
  firebase.handlers?.[0](snapshot);
}

function fail(error: unknown): void {
  firebase.handlers?.[1](error);
}

describe('OrderService: consultas de pedidos', () => {
  let service: OrderService;

  beforeEach(() => {
    vi.clearAllMocks();
    firebase.handlers = null;
    firebase.collection.mockReturnValue(firebase.ordersCollection);
    firebase.onSnapshot.mockImplementation(
      (_target: unknown, next: SnapshotHandlers[0], error: SnapshotHandlers[1]) => {
        firebase.handlers = [next, error];
        return firebase.unsubscribe;
      },
    );

    TestBed.configureTestingModule({});
    service = TestBed.inject(OrderService);
  });

  describe('customerOrders (pedidos del cliente)', () => {
    it('filtra por ownerUid y ordena por createdAt descendente', () => {
      service.customerOrders('uid-1').subscribe();

      expect(firebase.query).toHaveBeenCalledWith(
        firebase.ordersCollection,
        { type: 'where', field: 'ownerUid', op: '==', value: 'uid-1' },
        { type: 'orderBy', field: 'createdAt', direction: 'desc' },
      );
    });

    it('usa los mismos campos que el indice compuesto de firestore.indexes.json', () => {
      service.customerOrders('uid-1').subscribe();

      // El indice definido es ownerUid ASC + createdAt DESC. Si la consulta cambia
      // de campos, Firestore pedira un indice nuevo y la lista dejara de cargar.
      expect(firebase.where).toHaveBeenCalledWith('ownerUid', '==', 'uid-1');
      expect(firebase.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('emite los pedidos con su id cada vez que cambian en Firestore', () => {
      const received: Order[][] = [];
      service.customerOrders('uid-1').subscribe((orders) => received.push(orders));

      emit(listSnapshot([{ id: 'pedido-1', data: storedOrder }]));
      emit(
        listSnapshot([
          { id: 'pedido-2', data: { ...storedOrder, productName: 'Leche' } },
          { id: 'pedido-1', data: storedOrder },
        ]),
      );

      expect(received).toHaveLength(2);
      expect(received[0]).toEqual([{ id: 'pedido-1', ...storedOrder }]);
      expect(received[1].map((order) => order.id)).toEqual(['pedido-2', 'pedido-1']);
    });

    it('emite una lista vacia si el cliente no tiene pedidos', () => {
      const received: Order[][] = [];
      service.customerOrders('uid-1').subscribe((orders) => received.push(orders));

      emit(listSnapshot([]));

      expect(received).toEqual([[]]);
    });

    it('propaga el error de Firestore', () => {
      const denied = Object.assign(new Error('denied'), { code: 'permission-denied' });
      const errors: unknown[] = [];
      service.customerOrders('uid-1').subscribe({ error: (error) => errors.push(error) });

      fail(denied);

      expect(errors).toEqual([denied]);
    });

    it('deja de escuchar Firestore al cancelar la suscripcion', () => {
      const subscription = service.customerOrders('uid-1').subscribe();

      subscription.unsubscribe();

      expect(firebase.unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('orderById (detalle del pedido)', () => {
    it('escucha el documento orders/{id}', () => {
      service.orderById('pedido-1').subscribe();

      expect(firebase.onSnapshot).toHaveBeenCalledWith(
        { path: 'orders/pedido-1' },
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('emite el pedido con su id y se actualiza en tiempo real', () => {
      const received: (Order | null)[] = [];
      service.orderById('pedido-1').subscribe((order) => received.push(order));

      emit(docSnapshot('pedido-1', storedOrder));
      emit(docSnapshot('pedido-1', { ...storedOrder, status: 'preparing' }));

      expect(received[0]).toEqual({ id: 'pedido-1', ...storedOrder });
      expect(received[1]?.status).toBe('preparing');
    });

    it('emite null si el pedido no existe', () => {
      const received: (Order | null)[] = [];
      service.orderById('no-existe').subscribe((order) => received.push(order));

      emit(docSnapshot('no-existe', null));

      expect(received).toEqual([null]);
    });

    it('propaga el error si el usuario no puede leer el pedido', () => {
      const denied = Object.assign(new Error('denied'), { code: 'permission-denied' });
      const errors: unknown[] = [];
      service.orderById('pedido-1').subscribe({ error: (error) => errors.push(error) });

      fail(denied);

      expect(errors).toEqual([denied]);
    });
  });

  describe('merchantOrders (pedidos para el comerciante)', () => {
    it('lista todos los pedidos ordenados por createdAt descendente, sin filtrar por cliente', () => {
      service.merchantOrders().subscribe();

      expect(firebase.query).toHaveBeenCalledWith(firebase.ordersCollection, {
        type: 'orderBy',
        field: 'createdAt',
        direction: 'desc',
      });
      expect(firebase.where).not.toHaveBeenCalled();
    });
  });
});
