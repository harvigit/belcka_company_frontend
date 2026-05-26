const serviceWorkerScript = `
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js");

let messagingInitialized = false;
let messagingInitPromise = null;

async function initMessaging() {
  if (messagingInitialized) return;
  if (messagingInitPromise) return messagingInitPromise;

  messagingInitPromise = (async () => {
    try {
      const response = await fetch("/api/firebase/config", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        console.error("Failed to fetch Firebase config in service worker");
        return;
      }

      const firebaseConfig = await response.json();
      firebase.initializeApp(firebaseConfig);

      const messaging = firebase.messaging();
      messaging.onBackgroundMessage(function (payload) {
        const title = payload.notification?.title || "Notification";
        const options = {
          body: payload.notification?.body || "",
          icon: "/favicon.svg",
          sound: "default",
        };

        self.registration.showNotification(title, options);
      });

      messagingInitialized = true;
    } catch (error) {
      console.error("Error initializing Firebase messaging in service worker:", error);
    }
  })();

  return messagingInitPromise;
}

self.addEventListener("activate", function (event) {
  event.waitUntil(initMessaging());
});

initMessaging();
`;

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(serviceWorkerScript, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
