// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, onMessage, getToken, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBzzronBZr1aQ2nxeJiq8_jHjOPYpWsKXE",
  authDomain: "chatapp-a9297.firebaseapp.com",
  databaseURL: "https://chatapp-a9297-default-rtdb.firebaseio.com",
  projectId: "chatapp-a9297",
  storageBucket: "chatapp-a9297.appspot.com", // Fixed: using correct format
  messagingSenderId: "806594827553",
  appId: "1:806594827553:web:786e07011753d1b014da60",
  measurementId: "G-XXXXXXXXXX" // Recommended if using Analytics
};

const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize messaging only in supported environments
let messaging;
const initMessaging = async () => {
  if (await isSupported()) {
    messaging = getMessaging(app);
  }
  return messaging;
};

export { 
  auth, 
  db, 
  messaging,
  initMessaging, // Export initialization function
  getToken, 
  onMessage 
};