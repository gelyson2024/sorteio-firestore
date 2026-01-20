import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyALLxRyWoiFouDsLY2eIESkL8cHlqEAVc",
  authDomain: "rifa-526e7.firebaseapp.com",
  projectId: "rifa-526e7",
  storageBucket: "rifa-526e7.appspot.com",
  messagingSenderId: "106478301661",
  appId: "1:106478301661:web:d613b58b4d031e45930634",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
