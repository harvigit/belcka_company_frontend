importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAdLpTcvwOWzhK4maBtriznqiw5MwBNcZw",
  authDomain: "belcka-8f2cd.firebaseapp.com",
  projectId: "belcka-8f2cd",
  storageBucket: "belcka-8f2cd.firebasestorage.app",
  messagingSenderId: "1046367619528",
  appId: "1:1046367619528:web:b62788a844e5ee8d2418fd",
  measurementId: "G-N8MFZ6274S"
});

// handle background messages
const messaging = firebase.messaging();
messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || 'Notification';
  const options = {
    body: payload.notification?.body || '',
    icon: "/favicon.svg",
    sound: "default", 
  };
  self.registration.showNotification(title, options);
});
