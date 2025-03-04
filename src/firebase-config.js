// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCbqgUqNtQFGP6taKzjTWfyWwtN3xonlKM",
  authDomain: "arapp-6e448.firebaseapp.com",
  projectId: "arapp-6e448",
  storageBucket: "arapp-6e448.firebasestorage.app",
  messagingSenderId: "484236996264",
  appId: "1:484236996264:web:1a80bf0a8ada5a0ed9dc9d",
  measurementId: "G-EN3YXB2ZDZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);