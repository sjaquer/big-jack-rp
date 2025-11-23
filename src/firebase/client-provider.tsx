'use client';

import React, { useEffect, useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase, initiateAnonymousSignIn, useAuth } from '@/firebase';

function AuthHandler({ children }: { children: ReactNode }) {
  const auth = useAuth();

  useEffect(() => {
    // When the auth service is ready, initiate anonymous sign-in.
    // This will provide a guest session for unauthenticated users.
    initiateAnonymousSignIn(auth);
  }, [auth]);

  return <>{children}</>;
}


export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      <AuthHandler>
        {children}
      </AuthHandler>
    </FirebaseProvider>
  );
}
