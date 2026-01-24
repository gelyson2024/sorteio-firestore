import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  // COPIE EXATAMENTE do seu firebase.ts
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  for (let i = 1; i <= 300; i++) {
    const id = String(i).padStart(3, "0");

    await setDoc(doc(db, "numbers", id), {
      number: i,
      status: "AVAILABLE",
      name: "",
      whatsapp: "",
      reservedAt: null,
    });

    console.log("Criado:", id);
  }
}

seed().then(() => {
  console.log("✅ 300 números criados");
});
