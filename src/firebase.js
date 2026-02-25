  // src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 🔴 Reemplaza estos valores con los de tu proyecto Firebase
// (los encuentras en Firebase Console → Project Settings → Your apps)
const firebaseConfig = {
  apiKey: "AIzaSyDSODyeLd3Y7DXmY1djmvLm4QL7vcbuwlQ",
  authDomain: "sgi-01-8d1e2.firebaseapp.com",
  databaseURL: "https://sgi-01-8d1e2-default-rtdb.firebaseio.com",
  projectId: "sgi-01-8d1e2",
  storageBucket: "sgi-01-8d1e2.firebasestorage.app",
  messagingSenderId: "1070712317784",
  appId: "1:1070712317784:web:c58f4635e011507e37a72d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
