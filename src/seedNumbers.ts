import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function seedNumbers() {
  for (let i = 1; i <= 300; i++) {
    const id = String(i).padStart(3, "0");

    await setDoc(doc(db, "numbers", id), {
      number: i,
      status: "AVAILABLE",
      name: "",
      whatsapp: "",
      reservedAt: null,
    });
  }

  alert("✅ 300 números criados!");
}
