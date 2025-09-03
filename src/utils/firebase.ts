// app/utils/firebase.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage ,isSupported} from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAdLpTcvwOWzhK4maBtriznqiw5MwBNcZw",
  authDomain: "belcka-8f2cd.firebaseapp.com",
  projectId: "belcka-8f2cd",
  storageBucket: "belcka-8f2cd.firebasestorage.app",
  messagingSenderId: "1046367619528",
  appId: "1:1046367619528:web:b62788a844e5ee8d2418fd",
  measurementId: "G-N8MFZ6274S"
};

export const app = initializeApp(firebaseConfig);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : (null as any);

export const getFcmToken = async () => {
  if (typeof window === "undefined") return null;
  if (!(await isSupported())) {
    console.warn("FCM not supported in this browser");
    return null;
  }

  const messaging = getMessaging();
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  return token;
};

// Return an unsubscribe function from onMessage
export const onForegroundMessage = (cb: (payload: any) => void) => {
  if (!messaging) return () => {};
  const unsub = onMessage(messaging, cb);
  return unsub;
};
