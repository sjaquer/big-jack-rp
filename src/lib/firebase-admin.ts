import 'server-only';

import { getApps, initializeApp, cert, applicationDefault, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

type ServiceAccountLike = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
};

function normalizePrivateKey(value: string): string {
  const unquoted = value.trim().replace(/^"([\s\S]*)"$/, '$1').replace(/^'([\s\S]*)'$/, '$1');
  return unquoted.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\r\n/g, '\n');
}

function tryParseServiceAccountJson(raw: string): ServiceAccountLike | null {
  try {
    return JSON.parse(raw) as ServiceAccountLike;
  } catch {
    return null;
  }
}

function parseServiceAccount(raw: string): ServiceAccount | null {
  const decoded = Buffer.from(raw, 'base64').toString('utf8');
  const parsed = tryParseServiceAccountJson(raw) || tryParseServiceAccountJson(decoded);

  if (!parsed?.project_id || !parsed?.client_email || !parsed?.private_key) {
    return null;
  }

  const privateKey = normalizePrivateKey(parsed.private_key);
  if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
    return null;
  }

  return {
    ...parsed,
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey,
    private_key: privateKey,
  } as ServiceAccount;
}

function getServiceAccountFromSplitEnv(): ServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    return null;
  }

  const privateKey = normalizePrivateKey(rawPrivateKey);
  if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  } as ServiceAccount;
}

function getAdminApp() {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0];
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const serviceAccount =
    (rawServiceAccount ? parseServiceAccount(rawServiceAccount) : null) || getServiceAccountFromSplitEnv();

  if (serviceAccount) {
    try {
      return initializeApp({
        credential: cert(serviceAccount),
        projectId:
          process.env.FIREBASE_PROJECT_ID ||
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
          serviceAccount.projectId,
      });
    } catch (error) {
      console.error('Firebase Admin cert credentials are invalid. Falling back to application default.', error);
    }
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export const adminDb = getFirestore(getAdminApp());
