import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBXk8vI6BXCr47gNKovTdZ-kSMrn1Nmjvg",
  authDomain: "rifa-nova.firebaseapp.com",
  projectId: "rifa-nova",
  storageBucket: "rifa-nova.firebasestorage.app",
  messagingSenderId: "32230185305",
  appId: "1:32230185305:web:7265a3de8ec2c3f4839448",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
