// app/utils/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
} from "firebase/messaging";

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAdLpTcvwOWzhK4maBtriznqiw5MwBNcZw",
  authDomain: "belcka-8f2cd.firebaseapp.com",
  projectId: "belcka-8f2cd",
  storageBucket: "belcka-8f2cd.firebasestorage.app",
  messagingSenderId: "1046367619528",
  appId: "1:1046367619528:web:b62788a844e5ee8d2418fd",
  measurementId: "G-N8MFZ6274S",
};

// ✅ Initialize app once
export const app = initializeApp(firebaseConfig);

/**
 * Lazy init messaging so SSR / unsupported browsers don’t break
 */
export const initMessaging = async (): Promise<Messaging | null> => {
  if (typeof window === "undefined") return null; // 🚀 SSR safe

  try {
    const supported = await isSupported();
    if (!supported) {
      return null; // 🚀 no console.warn, just silent skip
    }
    return getMessaging(app);
  } catch (err) {
    console.error("❌ Messaging not supported:", err);
    return null;
  }
};

/**
 * Request and return FCM token
 */
export const getFcmToken = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;

  // ✅ ask for permission
  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
  }

  const messaging = await initMessaging();
  if (!messaging) return null;

  try {
    // ✅ ensure service worker exists
    if (!("serviceWorker" in navigator)) {
      console.warn("❌ Service workers not supported in this browser");
      return null;
    }

    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: reg, // ✅ attach worker explicitly
    });

    return token;
  } catch (err) {
    console.error("❌ Error getting FCM token:", err);
    return null;
  }
};

/**
 * Foreground message listener
 */
export const onForegroundMessage = (cb: (payload: any) => void): (() => void) => {
  let unsub: () => void = () => {};

  initMessaging().then((messaging) => {
    if (messaging) {
      unsub = onMessage(messaging, cb);
    }
  });

  return () => unsub();
};
