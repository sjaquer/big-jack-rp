const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`Falta la variable de entorno requerida: ${key}`);
  }
  return value;
};

export const firebaseConfig = {
  projectId: requiredEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  appId: requiredEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
  apiKey: requiredEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: requiredEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
  messagingSenderId: requiredEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
};
