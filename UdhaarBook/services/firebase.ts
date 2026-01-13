
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDSuVzxMay3tJKPekKfzmSg5ruKYZIwQW0",
  authDomain: "udhaarbook-6786a.firebaseapp.com",
  databaseURL: "https://udhaarbook-6786a-default-rtdb.firebaseio.com",
  projectId: "udhaarbook-6786a",
  storageBucket: "udhaarbook-6786a.firebasestorage.app",
  messagingSenderId: "387446923178",
  appId: "1:387446923178:web:7f3c024f9f07eb7750d5d3",
  measurementId: "G-C2DH555TJS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
