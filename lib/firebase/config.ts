import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') {
    return false;
  }
  const { apiKey, projectId } = firebaseConfig;
  return Boolean(
    apiKey &&
    projectId &&
    apiKey !== 'undefined' &&
    projectId !== 'undefined' &&
    !apiKey.includes('your-') &&
    !projectId.includes('your-')
  );
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (typeof window !== 'undefined' || process.env.NODE_ENV !== 'test') {
  if (isFirebaseConfigured()) {
    try {
      app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      db = getFirestore(app);
      storage = getStorage(app);
    } catch (error) {
      console.warn('Firebase initialization skipped or failed, falling back to resilient in-memory mode:', error);
    }
  }
}

export { app, db, storage };
