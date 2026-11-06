import { Injectable, inject } from '@angular/core';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '../core/firebase';
import type { AppSession, UserProfile } from '../models/user-profile.model';

import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = inject(SessionService);

  /** Reconciles the local cache with Firebase Authentication on app start. */
  async initializeSession(): Promise<AppSession | null> {
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      await this.session.clear();
      return null;
    }

    const cached = this.session.snapshot ?? (await this.session.restore());
    if (cached?.uid === user.uid) {
      return cached;
    }

    return this.cacheProfile(user);
  }

  async activeSession(): Promise<AppSession | null> {
    return this.initializeSession();
  }

  async register(fullName: string, email: string, password: string): Promise<AppSession> {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);

    try {
      await setDoc(doc(db, 'users', credential.user.uid), {
        fullName: fullName.trim(),
        email: credential.user.email ?? email.trim(),
        role: 'cliente',
        createdAt: serverTimestamp(),
      });

      return this.cacheProfile(credential.user);
    } catch (error) {
      await signOut(auth);
      await this.session.clear();
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AppSession> {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return this.cacheProfile(credential.user);
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } finally {
      await this.session.clear();
    }
  }

  private async cacheProfile(user: User): Promise<AppSession> {
    const profile = await this.getProfile(user.uid);
    if (!profile) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    const session: AppSession = {
      uid: user.uid,
      fullName: profile.fullName,
      email: profile.email,
      role: profile.role,
    };
    await this.session.save(session);
    return session;
  }

  private async getProfile(uid: string): Promise<UserProfile | null> {
    const snapshot = await getDoc(doc(db, 'users', uid));
    if (!snapshot.exists()) {
      return null;
    }

    return { uid, ...(snapshot.data() as Omit<UserProfile, 'uid'>) };
  }
}
