import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; 
import { getAuth} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBzzronBZr1aQ2nxeJiq8_jHjOPYpWsKXE",
  authDomain: "chatapp-a9297.firebaseapp.com",
  databaseURL: "https://chatapp-a9297-default-rtdb.firebaseio.com",
  projectId: "chatapp-a9297",
  storageBucket: "chatapp-a9297.firebasestorage.app",
  messagingSenderId: "806594827553",
  appId: "1:806594827553:web:786e07011753d1b014da60"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app); 
const auth = getAuth(app);

export { db,auth }; 