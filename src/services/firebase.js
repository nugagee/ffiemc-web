// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDadaZdPgBvhymO9oqfVsEM8oRYRmFKlYI",
  authDomain: "fire-fire-v2.firebaseapp.com",
  projectId: "fire-fire-v2",
  storageBucket: "fire-fire-v2.firebasestorage.app",
  messagingSenderId: "904761949399",
  appId: "1:904761949399:web:3ed3239cc407ebcf7c8492",
  measurementId: "G-9K8ECT6P5V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);