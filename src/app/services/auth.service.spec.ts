import { TestBed } from '@angular/core/testing';

import type { AppSession } from '../models/user-profile.model';

import { AuthService } from './auth.service';
import { SessionService } from './session.service';

// Firebase se reemplaza por dobles de prueba: las pruebas no abren conexiones
// reales ni crean cuentas o documentos en el proyecto.
const firebase = vi.hoisted(() => ({
  auth: {
    currentUser: null as { uid: string; email: string | null } | null,
    authStateReady: vi.fn(async () => undefined),
  },
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

// Angular no permite simular imports relativos (como ../core/firebase), asi que
// se simulan los paquetes de Firebase que ese modulo usa para inicializarse.
vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));

vi.mock('firebase/auth', () => ({
  getAuth: () => firebase.auth,
  createUserWithEmailAndPassword: firebase.createUserWithEmailAndPassword,
  signInWithEmailAndPassword: firebase.signInWithEmailAndPassword,
  signOut: firebase.signOut,
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  doc: firebase.doc,
  getDoc: firebase.getDoc,
  setDoc: firebase.setDoc,
  serverTimestamp: firebase.serverTimestamp,
}));

const user = { uid: 'uid-1', email: 'ana@prueba.com' };

const profile = { fullName: 'Ana Perez', email: 'ana@prueba.com', role: 'cliente' as const };

const expectedSession: AppSession = { uid: 'uid-1', ...profile };

function profileSnapshot(data: object | null) {
  return { exists: () => data !== null, data: () => data };
}

describe('AuthService', () => {
  let service: AuthService;
  let session: {
    snapshot: AppSession | null;
    restore: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    firebase.auth.currentUser = null;

    session = {
      snapshot: null,
      restore: vi.fn(async () => null),
      save: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: SessionService, useValue: session }],
    });
    service = TestBed.inject(AuthService);
  });

  describe('register', () => {
    it('crea la cuenta y el perfil con rol cliente, y guarda la sesion', async () => {
      firebase.createUserWithEmailAndPassword.mockResolvedValue({ user });
      firebase.setDoc.mockResolvedValue(undefined);
      firebase.getDoc.mockResolvedValue(profileSnapshot(profile));

      const result = await service.register('  Ana Perez  ', '  ana@prueba.com  ', 'secreto1');

      expect(firebase.createUserWithEmailAndPassword).toHaveBeenCalledWith(firebase.auth, 'ana@prueba.com', 'secreto1');
      expect(firebase.setDoc).toHaveBeenCalledWith(
        { path: 'users/uid-1' },
        {
          fullName: 'Ana Perez',
          email: 'ana@prueba.com',
          role: 'cliente',
          createdAt: 'SERVER_TIMESTAMP',
        },
      );
      expect(session.save).toHaveBeenCalledWith(expectedSession);
      expect(result).toEqual(expectedSession);
    });

    it('cierra la sesion y propaga el error si no se puede crear el perfil', async () => {
      const denied = Object.assign(new Error('denied'), { code: 'permission-denied' });
      firebase.createUserWithEmailAndPassword.mockResolvedValue({ user });
      firebase.setDoc.mockRejectedValue(denied);

      await expect(service.register('Ana Perez', 'ana@prueba.com', 'secreto1')).rejects.toBe(denied);

      expect(firebase.signOut).toHaveBeenCalledWith(firebase.auth);
      expect(session.clear).toHaveBeenCalled();
      expect(session.save).not.toHaveBeenCalled();
    });

    it('no escribe el perfil si Authentication rechaza la cuenta', async () => {
      const inUse = Object.assign(new Error('in use'), { code: 'auth/email-already-in-use' });
      firebase.createUserWithEmailAndPassword.mockRejectedValue(inUse);

      await expect(service.register('Ana Perez', 'ana@prueba.com', 'secreto1')).rejects.toBe(inUse);

      expect(firebase.setDoc).not.toHaveBeenCalled();
      expect(session.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('inicia sesion, lee el perfil y guarda la sesion', async () => {
      firebase.signInWithEmailAndPassword.mockResolvedValue({ user });
      firebase.getDoc.mockResolvedValue(profileSnapshot(profile));

      const result = await service.login(' ana@prueba.com ', 'secreto1');

      expect(firebase.signInWithEmailAndPassword).toHaveBeenCalledWith(firebase.auth, 'ana@prueba.com', 'secreto1');
      expect(firebase.getDoc).toHaveBeenCalledWith({ path: 'users/uid-1' });
      expect(session.save).toHaveBeenCalledWith(expectedSession);
      expect(result).toEqual(expectedSession);
    });

    it('lanza PROFILE_NOT_FOUND si la cuenta no tiene perfil', async () => {
      firebase.signInWithEmailAndPassword.mockResolvedValue({ user });
      firebase.getDoc.mockResolvedValue(profileSnapshot(null));

      await expect(service.login('ana@prueba.com', 'secreto1')).rejects.toThrow('PROFILE_NOT_FOUND');
      expect(session.save).not.toHaveBeenCalled();
    });

    it('propaga el error de credenciales invalidas', async () => {
      const invalid = Object.assign(new Error('invalid'), { code: 'auth/invalid-credential' });
      firebase.signInWithEmailAndPassword.mockRejectedValue(invalid);

      await expect(service.login('ana@prueba.com', 'mala')).rejects.toBe(invalid);
      expect(firebase.getDoc).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('cierra la sesion de Firebase y borra la sesion local', async () => {
      firebase.signOut.mockResolvedValue(undefined);

      await service.logout();

      expect(firebase.signOut).toHaveBeenCalledWith(firebase.auth);
      expect(session.clear).toHaveBeenCalled();
    });

    it('borra la sesion local aunque falle signOut', async () => {
      firebase.signOut.mockRejectedValue(new Error('network'));

      await expect(service.logout()).rejects.toThrow('network');
      expect(session.clear).toHaveBeenCalled();
    });
  });

  describe('initializeSession', () => {
    it('devuelve null y borra la sesion local si no hay usuario autenticado', async () => {
      const result = await service.initializeSession();

      expect(firebase.auth.authStateReady).toHaveBeenCalled();
      expect(session.clear).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('reutiliza la sesion guardada si corresponde al mismo usuario', async () => {
      firebase.auth.currentUser = user;
      session.restore.mockResolvedValue(expectedSession);

      const result = await service.initializeSession();

      expect(firebase.getDoc).not.toHaveBeenCalled();
      expect(result).toEqual(expectedSession);
    });

    it('vuelve a leer el perfil si la sesion guardada es de otro usuario', async () => {
      firebase.auth.currentUser = user;
      session.restore.mockResolvedValue({ ...expectedSession, uid: 'otro-uid' });
      firebase.getDoc.mockResolvedValue(profileSnapshot(profile));

      const result = await service.initializeSession();

      expect(firebase.getDoc).toHaveBeenCalledWith({ path: 'users/uid-1' });
      expect(session.save).toHaveBeenCalledWith(expectedSession);
      expect(result).toEqual(expectedSession);
    });
  });
});
