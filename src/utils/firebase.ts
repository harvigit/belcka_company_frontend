// app/utils/firebase.ts
import {getApp, getApps, initializeApp, type FirebaseApp} from 'firebase/app';
import {
    getMessaging,
    getToken,
    onMessage,
    isSupported,
    type Messaging,
} from 'firebase/messaging';

type FirebaseClientConfig = {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
};

const FIREBASE_CONFIG_ENDPOINT = '/api/firebase/config';
let firebaseConfigPromise: Promise<FirebaseClientConfig | null> | null = null;
let firebaseAppPromise: Promise<FirebaseApp | null> | null = null;

const hasRequiredConfigFields = (config: any): config is FirebaseClientConfig =>
    Boolean(
        config &&
        typeof config.apiKey === 'string' &&
        typeof config.authDomain === 'string' &&
        typeof config.projectId === 'string' &&
        typeof config.storageBucket === 'string' &&
        typeof config.messagingSenderId === 'string' &&
        typeof config.appId === 'string'
    );

const getFirebaseConfig = async (): Promise<FirebaseClientConfig | null> => {
    if (typeof window === 'undefined') return null;

    if (!firebaseConfigPromise) {
        firebaseConfigPromise = (async () => {
            try {
                const response = await fetch(FIREBASE_CONFIG_ENDPOINT, {
                    method: 'GET',
                    credentials: 'same-origin',
                    cache: 'no-store',
                });

                if (!response.ok) {
                    console.error('❌ Failed to fetch Firebase config');
                    return null;
                }

                const config = await response.json();

                if (!hasRequiredConfigFields(config)) {
                    console.error('❌ Invalid Firebase config received');
                    return null;
                }

                return config;
            } catch (err) {
                console.error('❌ Error fetching Firebase config:', err);
                return null;
            }
        })();
    }

    return firebaseConfigPromise;
};

const getFirebaseApp = async (): Promise<FirebaseApp | null> => {
    if (typeof window === 'undefined') return null;

    if (getApps().length > 0) return getApp();

    if (!firebaseAppPromise) {
        firebaseAppPromise = (async () => {
            const firebaseConfig = await getFirebaseConfig();
            if (!firebaseConfig) return null;

            return initializeApp(firebaseConfig);
        })();
    }

    return firebaseAppPromise;
};

/**
 * Lazy init messaging so SSR / unsupported browsers don’t break
 */
export const initMessaging = async (): Promise<Messaging | null> => {
    if (typeof window === 'undefined') return null; // 🚀 SSR safe

    try {
        const app = await getFirebaseApp();
        if (!app) return null;

        const supported = await isSupported();
        if (!supported) {
            return null; // 🚀 no console.warn, just silent skip
        }
        return getMessaging(app);
    } catch (err) {
        console.error('❌ Messaging not supported:', err);
        return null;
    }
};

/**
 * Request and return FCM token
 */
export const getFcmToken = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;

    // ✅ ask for permission
    if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return null;
    }

    const messaging = await initMessaging();
    if (!messaging) return null;

    try {
        // ✅ ensure service worker exists
        if (!('serviceWorker' in navigator)) {
            console.warn('❌ Service workers not supported in this browser');
            return null;
        }

        const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const token = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: reg, // ✅ attach worker explicitly
        });

        return token;
    } catch (err) {
        console.error('❌ Error getting FCM token:', err);
        return null;
    }
};

/**
 * Foreground message listener
 */
export const onForegroundMessage = (cb: (payload: any) => void): (() => void) => {
    let unsub: () => void = () => {
    };

    initMessaging().then((messaging) => {
        if (messaging) {
            unsub = onMessage(messaging, cb);
        }
    });

    return () => unsub();
};
