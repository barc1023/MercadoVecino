import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'cliente' | 'comerciante';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt?: Timestamp | null;
}

/** The minimal, non-sensitive profile cached on the device. */
export interface AppSession {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
}
