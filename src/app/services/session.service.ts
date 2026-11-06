import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject } from 'rxjs';

import type { AppSession } from '../models/user-profile.model';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private static readonly storageKey = 'mercado-vecino-session';
  private readonly sessionSubject = new BehaviorSubject<AppSession | null>(null);

  readonly session$ = this.sessionSubject.asObservable();

  get snapshot(): AppSession | null {
    return this.sessionSubject.value;
  }

  async restore(): Promise<AppSession | null> {
    const { value } = await Preferences.get({ key: SessionService.storageKey });

    if (!value) {
      return null;
    }

    try {
      const session = JSON.parse(value) as AppSession;
      if (!session.uid || !session.email || !session.fullName || !session.role) {
        throw new Error('Invalid stored session');
      }

      this.sessionSubject.next(session);
      return session;
    } catch {
      await this.clear();
      return null;
    }
  }

  async save(session: AppSession): Promise<void> {
    await Preferences.set({
      key: SessionService.storageKey,
      value: JSON.stringify(session),
    });
    this.sessionSubject.next(session);
  }

  async clear(): Promise<void> {
    await Preferences.remove({ key: SessionService.storageKey });
    this.sessionSubject.next(null);
  }
}
