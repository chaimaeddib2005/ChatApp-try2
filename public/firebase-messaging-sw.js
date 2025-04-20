// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBzzronBZr1aQ2nxeJiq8_jHjOPYpWsKXE",
  authDomain: "chatapp-a9297.firebaseapp.com",
  
  projectId: "chatapp-a9297",
  
  messagingSenderId: "806594827553",
  appId: "1:806594827553:web:786e07011753d1b014da60"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const { title, body } = payload.notification;

  self.registration.showNotification(title, {
    body: body,
    icon: '/firebase-logo.png'
  });
});
