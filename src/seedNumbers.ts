import { doc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

export async function seedNumbers() {
  try {
    const batch = writeBatch(db);

    for (let i = 1; i <= 300; i++) {
      const id = String(i).padStart(3, "0");
      batch.set(doc(db, "numbers", id), {
        number: i,
        status: "AVAILABLE",
        name: "",
        whatsapp: "",
        reservedAt: null,
      });
    }

    await batch.commit();
    alert("✅ 300 números criados!");
  } catch (e: any) {
    console.error("❌ Erro no seed:", e);
    alert("❌ Não foi possível criar. Veja o Console (F12).");
  }
}
