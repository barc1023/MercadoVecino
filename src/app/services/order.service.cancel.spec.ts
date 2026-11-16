import { TestBed } from '@angular/core/testing';

import { userMessage } from '../core/error-message';
import type { OrderStatus } from '../models/order.model';

import { OrderService } from './order.service';

// Firebase se reemplaza por dobles de prueba: las pruebas no modifican pedidos
// reales en Firestore.
const firebase = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` })),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
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
  deleteDoc: firebase.deleteDoc,
  serverTimestamp: firebase.serverTimestamp,
  collection: vi.fn(),
  addDoc: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

describe('OrderService: cancelar pedido', () => {
  let service: OrderService;

  beforeEach(() => {
    vi.clearAllMocks();
    firebase.updateDoc.mockResolvedValue(undefined);

    TestBed.configureTestingModule({});
    service = TestBed.inject(OrderService);
  });

  it('marca un pedido pendiente como cancelled y renueva updatedAt', async () => {
    await service.cancel('pedido-1', 'pending');

    expect(firebase.updateDoc).toHaveBeenCalledWith(
      { path: 'orders/pedido-1' },
      { status: 'cancelled', updatedAt: 'SERVER_TIMESTAMP' },
    );
  });

  it('es un borrado logico: actualiza el documento y nunca lo elimina', async () => {
    await service.cancel('pedido-1', 'pending');

    expect(firebase.deleteDoc).not.toHaveBeenCalled();
    const changes = firebase.updateDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(changes).sort()).toEqual(['status', 'updatedAt']);
  });

  const notCancellable: OrderStatus[] = ['preparing', 'on_the_way', 'delivered', 'cancelled'];

  it.each(notCancellable)('no permite cancelar un pedido en estado %s', async (status) => {
    await expect(service.cancel('pedido-1', status)).rejects.toThrow('ORDER_CANNOT_BE_CANCELLED');
    expect(firebase.updateDoc).not.toHaveBeenCalled();
  });

  it('muestra un mensaje claro cuando el pedido ya no se puede cancelar', async () => {
    const error = await service.cancel('pedido-1', 'preparing').catch((reason: unknown) => reason);

    expect(userMessage(error, 'fallback')).toMatch(/^Solo puedes cancelar pedidos/);
  });

  it('propaga el error si las reglas rechazan la cancelacion', async () => {
    const denied = Object.assign(new Error('denied'), { code: 'permission-denied' });
    firebase.updateDoc.mockRejectedValue(denied);

    await expect(service.cancel('pedido-1', 'pending')).rejects.toBe(denied);
  });
});
