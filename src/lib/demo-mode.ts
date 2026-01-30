'use client';

import { useState, useEffect } from 'react';

const DEMO_MODE_KEY = 'big-jack-demo-mode';

/**
 * Verifica si el modo demo está activo
 */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}

/**
 * Activa o desactiva el modo demo
 */
export function setDemoMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
  } else {
    localStorage.removeItem(DEMO_MODE_KEY);
  }
}

/**
 * Limpia el modo demo
 */
export function clearDemoMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEMO_MODE_KEY);
}

/**
 * Hook para verificar si el modo demo está activo
 */
export function useDemoMode(): boolean {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    setIsDemo(isDemoMode());
    
    // Escuchar cambios en localStorage
    const handleStorageChange = () => {
      setIsDemo(isDemoMode());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return isDemo;
}

/**
 * Usuario demo para el contexto de Firebase
 */
export const DEMO_USER = {
  uid: 'demo-user-123',
  email: 'admin@bigjack.demo',
  displayName: 'Administrador Demo',
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
  providerData: [],
  refreshToken: 'demo-refresh-token',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'demo-token',
  getIdTokenResult: async () => ({
    token: 'demo-token',
    expirationTime: new Date(Date.now() + 3600000).toISOString(),
    authTime: new Date().toISOString(),
    issuedAtTime: new Date().toISOString(),
    signInProvider: 'password',
    signInSecondFactor: null,
    claims: {},
  }),
  reload: async () => {},
  toJSON: () => ({}),
  phoneNumber: null,
  photoURL: null,
  providerId: 'firebase',
} as any;
