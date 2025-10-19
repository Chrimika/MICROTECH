// Import the functions you need from the SDKs you need
// import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { initializeAuth,getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
   apiKey: "AIzaSyAGO-3oRJJ4rDhICFSEOqtBD6TryPBGS4A",
  authDomain: "globaltravelfinence.firebaseapp.com",
  projectId: "globaltravelfinence",
  storageBucket: "globaltravelfinence.firebasestorage.app",
  messagingSenderId: "18498747909",
  appId: "1:18498747909:web:0780e13a84ce60aba5e66c",
  measurementId: "G-8CSTG7B79Z"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app)