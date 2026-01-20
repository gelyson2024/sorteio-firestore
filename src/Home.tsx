import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

type TicketStatus = "AVAILABLE" | "RESERVED" | "PAID";

interface Ticket {
  id: string;
  number: number;
  status: TicketStatus;
  name?: string;
  phone?: string;
}

export default function Home() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Criar os 300 números automaticamente
  useEffect(() => {
    for (let i = 1; i <= 300; i++) {
      const ref = doc(db, "raffles/main/tickets", i.toString());
      setDoc(
        ref,
        { number: i, status: "AVAILABLE" },
        { merge: true }
      );
    }
  }, []);

  // Escutar mudanças em tempo real
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "raffles/main/tickets"),
      (snap) => {
        const list: Ticket[] = [];
        snap.forEach((doc) =>
          list.push({ id: doc.id, ...(doc.data() as Ticket) })
        );
        setTickets(list.sort((a, b) => a.number - b.number));
      }
    );
    return () => unsub();
  }, []);

  const reserve = async (t: Ticket) => {
    const name = prompt("Seu nome:");
    const phone = prompt("WhatsApp:");

    if (!name || !phone) return;

    await updateDoc(doc(db, "raffles/main/tickets", t.id), {
      status: "RESERVED",
      name,
      phone,
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🎉 Sorteio – 1 Semana de Mão de Obra de Pedreiro</h1>
      <p>R$ 30,00 por número • Sorteio 01/05 às 10h</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(10, 1fr)",
          gap: 8,
          marginTop: 20,
        }}
      >
        {tickets.map((t) => (
          <button
            key={t.id}
            onClick={() => reserve(t)}
            disabled={t.status !== "AVAILABLE"}
            style={{
              padding: 10,
              borderRadius: 6,
              border: "none",
              cursor: t.status === "AVAILABLE" ? "pointer" : "not-allowed",
              background:
                t.status === "AVAILABLE"
                  ? "#22c55e"
                  : t.status === "RESERVED"
                  ? "#facc15"
                  : "#ef4444",
              color: "#000",
              fontWeight: "bold",
            }}
          >
            {t.number.toString().padStart(3, "0")}
          </button>
        ))}
      </div>
    </div>
  );
}
