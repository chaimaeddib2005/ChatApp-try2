import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; 
import { getAuth } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBzzronBZr1aQ2nxeJiq8_jHjOPYpWsKXE",
  authDomain: "chatapp-a9297.firebaseapp.com",
  databaseURL: "https://chatapp-a9297-default-rtdb.firebaseio.com",
  projectId: "chatapp-a9297",
  storageBucket: "chatapp-a9297.appspot.com", // 👈 petit correctif ici aussi
  messagingSenderId: "806594827553",
  appId: "1:806594827553:web:786e07011753d1b014da60"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app); 
const auth = getAuth(app);

let messaging = null;

const initMessaging = async () => {
  if (await isSupported()) {
    messaging = getMessaging(app);
    return messaging;
  }
  return null;
};

export { db, auth, initMessaging };
