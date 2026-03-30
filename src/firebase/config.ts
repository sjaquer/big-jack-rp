import type { FirebaseOptions } from 'firebase/app';

export const firebaseConfig: FirebaseOptions = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

export function assertFirebaseConfig(config: FirebaseOptions): FirebaseOptions {
  const missing: string[] = [];

  if (!config.projectId) missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!config.appId) missing.push('NEXT_PUBLIC_FIREBASE_APP_ID');
  if (!config.apiKey) missing.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!config.authDomain) missing.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!config.messagingSenderId) missing.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno de Firebase: ${missing.join(', ')}`);
  }

  return config;
}
