import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  type Firestore,
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

// Estas pruebas corren contra el emulador de Firestore con el archivo real
// firestore.rules. Se ejecutan con `pnpm test:rules` (requiere Java 21).

const CLIENTE = { uid: 'cliente-1', email: 'cliente@prueba.com', fullName: 'Ana Perez' };
const OTRO_CLIENTE = { uid: 'cliente-2', email: 'otro@prueba.com', fullName: 'Luis Gomez' };
const COMERCIANTE = { uid: 'comerciante-1', email: 'comerciante@prueba.com', fullName: 'Tienda Vecina' };

let env: RulesTestEnvironment;

function dbAs(user: { uid: string; email: string }): Firestore {
  return env.authenticatedContext(user.uid, { email: user.email }).firestore() as unknown as Firestore;
}

function anonymousDb(): Firestore {
  return env.unauthenticatedContext().firestore() as unknown as Firestore;
}

function orderData(status: string, owner = CLIENTE) {
  return {
    productName: 'Pan integral',
    quantity: 2,
    deliveryAddress: 'Calle 10 #20-30',
    notes: '',
    ownerUid: owner.uid,
    ownerName: owner.fullName,
    ownerEmail: owner.email,
    status,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

function newOrder(owner = CLIENTE) {
  return {
    ...orderData('pending', owner),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function newProfile(user: { email: string; fullName: string }, role = 'cliente') {
  return { fullName: user.fullName, email: user.email, role, createdAt: serverTimestamp() };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-mercadovecino',
    firestore: { rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    for (const user of [CLIENTE, OTRO_CLIENTE]) {
      await setDoc(doc(db, 'users', user.uid), { ...newProfile(user), createdAt: Timestamp.now() });
    }
    await setDoc(doc(db, 'users', COMERCIANTE.uid), {
      ...newProfile(COMERCIANTE, 'comerciante'),
      createdAt: Timestamp.now(),
    });
    await setDoc(doc(db, 'orders', 'pendiente'), orderData('pending'));
    await setDoc(doc(db, 'orders', 'preparando'), orderData('preparing'));
    await setDoc(doc(db, 'orders', 'en-camino'), orderData('on_the_way'));
    await setDoc(doc(db, 'orders', 'entregado'), orderData('delivered'));
  });
});

describe('orders: cambio de estado (MER-22)', () => {
  const status = (next: string) => ({ status: next, updatedAt: serverTimestamp() });

  it('el comerciante avanza pending -> preparing', async () => {
    await assertSucceeds(updateDoc(doc(dbAs(COMERCIANTE), 'orders', 'pendiente'), status('preparing')));
  });

  it('el comerciante avanza preparing -> on_the_way', async () => {
    await assertSucceeds(updateDoc(doc(dbAs(COMERCIANTE), 'orders', 'preparando'), status('on_the_way')));
  });

  it('el comerciante avanza on_the_way -> delivered', async () => {
    await assertSucceeds(updateDoc(doc(dbAs(COMERCIANTE), 'orders', 'en-camino'), status('delivered')));
  });

  it('el comerciante no puede saltar estados (pending -> delivered)', async () => {
    await assertFails(updateDoc(doc(dbAs(COMERCIANTE), 'orders', 'pendiente'), status('delivered')));
  });

  it('el comerciante no puede retroceder (preparing -> pending)', async () => {
    await assertFails(updateDoc(doc(dbAs(COMERCIANTE), 'orders', 'preparando'), status('pending')));
  });

  it('el comerciante no puede cambiar un pedido entregado', async () => {
    await assertFails(updateDoc(doc(dbAs(COMERCIANTE), 'orders', 'entregado'), status('cancelled')));
  });

  it('el comerciante no puede cambiar otros campos junto con el estado', async () => {
    await assertFails(
      updateDoc(doc(dbAs(COMERCIANTE), 'orders', 'pendiente'), { ...status('preparing'), quantity: 50 }),
    );
  });

  it('el cliente no puede avanzar el estado de su pedido', async () => {
    await assertFails(updateDoc(doc(dbAs(CLIENTE), 'orders', 'pendiente'), status('preparing')));
  });

  it('un visitante no puede cambiar el estado', async () => {
    await assertFails(updateDoc(doc(anonymousDb(), 'orders', 'pendiente'), status('preparing')));
  });
});

describe('orders: cancelacion', () => {
  const cancel = { status: 'cancelled', updatedAt: serverTimestamp() };

  it('el cliente cancela su pedido pendiente', async () => {
    await assertSucceeds(updateDoc(doc(dbAs(CLIENTE), 'orders', 'pendiente'), cancel));
  });

  it('el cliente no puede cancelar un pedido que ya se esta preparando', async () => {
    await assertFails(updateDoc(doc(dbAs(CLIENTE), 'orders', 'preparando'), cancel));
  });

  it('un cliente no puede cancelar el pedido de otro', async () => {
    await assertFails(updateDoc(doc(dbAs(OTRO_CLIENTE), 'orders', 'pendiente'), cancel));
  });

  it('nadie puede borrar un pedido', async () => {
    await assertFails(deleteDoc(doc(dbAs(CLIENTE), 'orders', 'pendiente')));
    await assertFails(deleteDoc(doc(dbAs(COMERCIANTE), 'orders', 'pendiente')));
  });
});

describe('orders: lectura', () => {
  it('el cliente lee su pedido', async () => {
    await assertSucceeds(getDoc(doc(dbAs(CLIENTE), 'orders', 'pendiente')));
  });

  it('un cliente no lee el pedido de otro', async () => {
    await assertFails(getDoc(doc(dbAs(OTRO_CLIENTE), 'orders', 'pendiente')));
  });

  it('el cliente lista sus pedidos filtrando por ownerUid', async () => {
    const db = dbAs(CLIENTE);
    await assertSucceeds(getDocs(query(collection(db, 'orders'), where('ownerUid', '==', CLIENTE.uid))));
  });

  it('el cliente no puede listar todos los pedidos sin filtro', async () => {
    await assertFails(getDocs(collection(dbAs(CLIENTE), 'orders')));
  });

  it('el comerciante lista todos los pedidos', async () => {
    await assertSucceeds(getDocs(collection(dbAs(COMERCIANTE), 'orders')));
  });

  it('un visitante no lee pedidos', async () => {
    await assertFails(getDoc(doc(anonymousDb(), 'orders', 'pendiente')));
  });
});

describe('orders: creacion', () => {
  it('el cliente crea un pedido valido a su nombre', async () => {
    await assertSucceeds(setDoc(doc(dbAs(CLIENTE), 'orders', 'nuevo'), newOrder()));
  });

  it('no se puede crear un pedido a nombre de otro usuario', async () => {
    await assertFails(setDoc(doc(dbAs(CLIENTE), 'orders', 'nuevo'), newOrder(OTRO_CLIENTE)));
  });

  it('no se puede crear un pedido en un estado distinto de pending', async () => {
    await assertFails(setDoc(doc(dbAs(CLIENTE), 'orders', 'nuevo'), { ...newOrder(), status: 'delivered' }));
  });

  it('no se puede crear un pedido con cantidad fuera de rango', async () => {
    await assertFails(setDoc(doc(dbAs(CLIENTE), 'orders', 'nuevo'), { ...newOrder(), quantity: 150 }));
  });

  it('no se puede crear un pedido con campos extra', async () => {
    await assertFails(setDoc(doc(dbAs(CLIENTE), 'orders', 'nuevo'), { ...newOrder(), price: 0 }));
  });
});

describe('users: perfiles', () => {
  const NUEVO = { uid: 'nuevo-1', email: 'nuevo@prueba.com', fullName: 'Maria Ruiz' };

  it('el usuario crea su perfil con rol cliente', async () => {
    await assertSucceeds(setDoc(doc(dbAs(NUEVO), 'users', NUEVO.uid), newProfile(NUEVO)));
  });

  it('nadie puede registrarse como comerciante', async () => {
    await assertFails(setDoc(doc(dbAs(NUEVO), 'users', NUEVO.uid), newProfile(NUEVO, 'comerciante')));
  });

  it('el usuario no puede crear el perfil de otro', async () => {
    await assertFails(setDoc(doc(dbAs(NUEVO), 'users', 'otro-uid'), newProfile(NUEVO)));
  });

  it('el usuario lee su perfil pero no el de otros', async () => {
    await assertSucceeds(getDoc(doc(dbAs(CLIENTE), 'users', CLIENTE.uid)));
    await assertFails(getDoc(doc(dbAs(CLIENTE), 'users', COMERCIANTE.uid)));
  });

  it('el usuario cambia su nombre pero no su rol', async () => {
    const db = dbAs(CLIENTE);
    await assertSucceeds(updateDoc(doc(db, 'users', CLIENTE.uid), { fullName: 'Ana Maria Perez' }));
    await assertFails(updateDoc(doc(db, 'users', CLIENTE.uid), { role: 'comerciante' }));
  });

  it('nadie puede borrar un perfil', async () => {
    await assertFails(deleteDoc(doc(dbAs(CLIENTE), 'users', CLIENTE.uid)));
  });
});
