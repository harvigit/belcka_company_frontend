// app/utils/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAdLpTcvwOWzhK4maBtriznqiw5MwBNcZw",
  authDomain: "belcka-8f2cd.firebaseapp.com",
  projectId: "belcka-8f2cd",
  storageBucket: "belcka-8f2cd.firebasestorage.app",
  messagingSenderId: "1046367619528",
  appId: "1:1046367619528:web:b62788a844e5ee8d2418fd",
  measurementId: "G-N8MFZ6274S",
};

export const app = initializeApp(firebaseConfig);

/**
 * Lazy init messaging so SSR/unsupported browsers don’t crash
 */
export const initMessaging = async (): Promise<Messaging | null> => {
  if (typeof window === "undefined") return null; // SSR safe
  const supported = await isSupported();
  if (!supported) {
    console.warn("FCM not supported in this browser");
    return null;
  }
  return getMessaging(app);
};

export const getFcmToken = async () => {
  if (typeof window === "undefined") return null;

  const messaging = await initMessaging();
  if (!messaging) return null;

  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js"
  );

  try {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token;
  } catch (err) {
    console.error("Error getting FCM token:", err);
    return null;
  }
};

/**
 * Listen for foreground messages
 */
export const onForegroundMessage = async (
  cb: (payload: any) => void
): Promise<() => void> => {
  const messaging = await initMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, cb);
};
