import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

const RAFFLE_ID = "sorteio2025";
const TOTAL = 300;

// 🔴 CONFIG PIX / WHATSAPP
const PIX_CHAVE = "37999363068";
const PIX_NOME = "Gelyson Thales dos Santos Neves";
const PIX_VALOR = "30,00";
const WHATSAPP_ADMIN = "5537999363068"; // 55+DDD+numero (sem +)

type TicketStatus = "AVAILABLE" | "RESERVED" | "PAID";

type Ticket = {
  id: string; // "001"..."300"
  number: number; // 1..300
  status: TicketStatus;
  name?: string;
  phone?: string;
};

export default function Home() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // ✅ SEED 001..300 (só se estiver vazio)
  useEffect(() => {
    (async () => {
      try {
        const colRef = collection(db, "raffles", RAFFLE_ID, "tickets");
        const existing = await getDocs(query(colRef, limit(1)));
        if (!existing.empty) return;

        setSeeding(true);
        const batch = writeBatch(db);

        for (let i = 1; i <= TOTAL; i++) {
          const id = String(i).padStart(3, "0");
          batch.set(doc(db, "raffles", RAFFLE_ID, "tickets", id), {
            number: i,
            status: "AVAILABLE",
            name: "",
            phone: "",
          });
        }

        await batch.commit();
      } catch (e) {
        console.error("Erro no seed:", e);
        alert("Erro criando números. Veja o Console (F12).");
      } finally {
        setSeeding(false);
      }
    })();
  }, []);

  // ✅ Realtime
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "raffles", RAFFLE_ID, "tickets"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .sort((a, b) => a.number - b.number);

        setTickets(list);
        setLoading(false);
      },
      (err) => {
        console.error("Erro Firestore:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // 🎟 Reservar número
  const reservar = async (t: Ticket) => {
    if (t.status !== "AVAILABLE") return;

    const name = prompt("Seu nome:");
    const phone = prompt("WhatsApp:");
    if (!name || !phone) return;

    await updateDoc(doc(db, "raffles", RAFFLE_ID, "tickets", t.id), {
      status: "RESERVED",
      name,
      phone,
    });

    alert(
      `✅ Número ${String(t.number).padStart(3, "0")} reservado!\n\n` +
        `Agora faça o PIX e clique em “Enviar comprovante”.`
    );
  };

  // 📲 Copiar Pix
  const copiarPix = async () => {
    try {
      await navigator.clipboard.writeText(PIX_CHAVE);
      alert("✅ PIX copiado!");
    } catch {
      alert("Copie manualmente: " + PIX_CHAVE);
    }
  };

  // 📩 Enviar comprovante (mensagem pronta no seu WhatsApp)
  const enviarComprovante = () => {
    // como é site público, aqui pegamos o primeiro reservado encontrado
    const reservado = tickets.find(
      (t) => t.status === "RESERVED" && (t.name || "").trim() && (t.phone || "").trim()
    );

    if (!reservado) {
      alert("Reserve um número primeiro 😊");
      return;
    }

    const msg = encodeURIComponent(
      `Olá! Já fiz o PIX da rifa.\n\n` +
        `🎟 Número: ${String(reservado.number).padStart(3, "0")}\n` +
        `👤 Nome: ${reservado.name}\n` +
        `📞 WhatsApp: ${reservado.phone}\n` +
        `💰 Valor: R$ ${PIX_VALOR}\n\n` +
        `📎 Estou enviando o comprovante agora.`
    );

    window.open(`https://wa.me/${WHATSAPP_ADMIN}?text=${msg}`, "_blank");
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>
        🎉 Sorteio – 1 Semana de mão de obra de pedreiro ou R$1.000,00 no Pix
      </h1>

      <p style={{ color: "#444" }}>
        R$ <b>{PIX_VALOR}</b> por número • Sorteio <b>01/05</b> às <b>10h</b>
      </p>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 12,
          background: "#fff",
          border: "1px solid #eee",
        }}
      >
        <b>Legenda:</b> 🟢 Disponível • 🟡 Reservado • 🔴 Pago
      </div>

      {/* PIX SEMPRE VISÍVEL */}
      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 14,
          background: "#f6f7f9",
          border: "1px solid #e5e7eb",
        }}
      >
        <b>💳 Pagamento via PIX (R$ {PIX_VALOR})</b>
        <div style={{ marginTop: 6, lineHeight: 1.5 }}>
          <div>
            <b>PIX (telefone):</b> {PIX_CHAVE}
          </div>
          <div>
            <b>Favorecido:</b> {PIX_NOME}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#444" }}>
            1) Reserve um número • 2) Faça o PIX • 3) Clique em “Enviar comprovante”.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button
            onClick={copiarPix}
            style={{
              padding: 12,
              borderRadius: 12,
              border: 0,
              background: "#0b57d0",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            📲 Copiar Pix
          </button>

          <button
            onClick={enviarComprovante}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            📩 Enviar comprovante
          </button>
        </div>
      </div>

      {seeding && <p style={{ marginTop: 12 }}>Criando números 001..300...</p>}
      {loading && <p style={{ marginTop: 12 }}>Carregando...</p>}

      {/* GRID */}
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))",
          gap: 8,
        }}
      >
        {tickets.map((t) => {
          const bg =
            t.status === "AVAILABLE"
              ? "#22c55e"
              : t.status === "RESERVED"
              ? "#facc15"
              : "#ef4444";

          return (
            <button
              key={t.id}
              disabled={t.status !== "AVAILABLE"}
              onClick={() => reservar(t)}
              style={{
                padding: 10,
                borderRadius: 10,
                border: 0,
                background: bg,
                fontWeight: 900,
                cursor: t.status === "AVAILABLE" ? "pointer" : "not-allowed",
              }}
              title={
                t.status === "AVAILABLE"
                  ? "Disponível"
                  : t.status === "RESERVED"
                  ? "Reservado"
                  : "Pago"
              }
            >
              {String(t.number).padStart(3, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
