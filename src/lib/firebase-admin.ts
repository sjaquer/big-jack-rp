import 'server-only';

import { getApps, initializeApp, cert, applicationDefault, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

type ServiceAccountLike = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
};

function parseServiceAccount(raw: string): ServiceAccount | null {
  try {
    const parsed = JSON.parse(raw) as ServiceAccountLike;
    if (!parsed?.project_id || !parsed?.client_email || !parsed?.private_key) {
      return null;
    }

    return {
      ...parsed,
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, '\n'),
      private_key: parsed.private_key.replace(/\\n/g, '\n'),
    } as ServiceAccount;
  } catch {
    return null;
  }
}

function getAdminApp() {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0];
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const serviceAccount = rawServiceAccount ? parseServiceAccount(rawServiceAccount) : null;

  if (serviceAccount) {
    return initializeApp({
      credential: cert(serviceAccount),
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        serviceAccount.projectId,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export const adminDb = getFirestore(getAdminApp());
