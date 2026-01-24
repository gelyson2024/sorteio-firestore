import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

type TicketStatus = "AVAILABLE" | "RESERVED" | "PAID";

type Ticket = {
  number: number;
  status: TicketStatus;
  name?: string;
  whatsapp?: string;
  reservedAt?: number | null;
  paidAt?: number | null;
};

const TOTAL = 300;
const COLLECTION = "numbers";

// ✅ Dados Pix (ajuste se quiser)
const PRICE = 30;
const PIX_KEY = "37999363068"; // telefone (chave pix)
const PIX_NAME = "Gelyson Thales dos Santos Neves";

// ✅ WhatsApp que recebe o comprovante (SEU número)
const WHATSAPP_RECEIVER = "5537988285460"; // 55 + DDD + número (sem espaços)

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

function statusColor(status?: TicketStatus) {
  if (status === "PAID") return "#e74c3c";
  if (status === "RESERVED") return "#f1c40f";
  return "#2ecc71";
}

// ✅ Seed rápido: cria 001..300 apenas se 001 não existir
async function ensureSeedOnce() {
  const testRef = doc(db, COLLECTION, "001");
  const testSnap = await getDoc(testRef);
  if (testSnap.exists()) return;

  const batch = writeBatch(db);
  for (let i = 1; i <= TOTAL; i++) {
    const id = pad3(i);
    batch.set(doc(db, COLLECTION, id), {
      number: i,
      status: "AVAILABLE",
      name: "",
      whatsapp: "",
      reservedAt: null,
      paidAt: null,
    } satisfies Ticket);
  }
  await batch.commit();
}

function buildWhatsappMessage(params: {
  numberId: string;
  name: string;
  whatsapp: string;
}) {
  const { numberId, name, whatsapp } = params;

  const text =
    `✅ COMPROVANTE DE PAGAMENTO - RIFA\n\n` +
    `📌 Número reservado: ${numberId}\n` +
    `👤 Nome: ${name}\n` +
    `📱 WhatsApp: ${whatsapp}\n\n` +
    `💰 Valor: R$ ${PRICE},00\n` +
    `🔑 Pix (telefone): ${PIX_KEY}\n` +
    `👥 Favorecido: ${PIX_NAME}\n\n` +
    `📎 Vou enviar o comprovante nesta conversa.\n`;

  return encodeURIComponent(text);
}

export default function Home() {
  const [tickets, setTickets] = useState<Record<string, Ticket>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [seedReady, setSeedReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // depois de reservar com sucesso, guardamos qual foi o número reservado
  const [reservedId, setReservedId] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => {};

    (async () => {
      await ensureSeedOnce();
      setSeedReady(true);

      unsub = onSnapshot(collection(db, COLLECTION), (snap) => {
        const map: Record<string, Ticket> = {};
        snap.docs.forEach((d) => {
          map[d.id] = d.data() as Ticket;
        });
        setTickets(map);
        setLoading(false);
      });
    })().catch((e) => {
      console.error("Erro Home init:", e);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const grid = useMemo(() => {
    const arr: Array<{ id: string; data?: Ticket }> = [];
    for (let i = 1; i <= TOTAL; i++) {
      const id = pad3(i);
      arr.push({ id, data: tickets[id] });
    }
    return arr;
  }, [tickets]);

  const selected = selectedId ? tickets[selectedId] : undefined;

  async function reserve() {
    if (!selectedId) return;

    if (!seedReady || loading) {
      alert("Aguarde carregar os números…");
      return;
    }

    const current = tickets[selectedId];

    if (!current) {
      alert("Aguarde carregar este número e tente novamente.");
      return;
    }

    if (current.status !== "AVAILABLE") {
      alert("Esse número já foi reservado ou pago. Escolha outro.");
      return;
    }

    if (!name.trim() || !whatsapp.trim()) {
      alert("Preencha nome e WhatsApp.");
      return;
    }

    setBusy(true);
    try {
      const ref = doc(db, COLLECTION, selectedId);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error("DOC_NOT_FOUND");

        const data = snap.data() as Ticket;

        if (data.status !== "AVAILABLE") {
          throw new Error("NOT_AVAILABLE");
        }

        tx.update(ref, {
          status: "RESERVED",
          name: name.trim(),
          whatsapp: whatsapp.trim(),
          reservedAt: Date.now(),
        });
      });

      setReservedId(selectedId);
      alert(`✅ Número ${selectedId} reservado!`);
    } catch (e: any) {
      console.error("Erro ao reservar:", e);

      if (String(e?.message).includes("NOT_AVAILABLE")) {
        alert("Esse número acabou de ser reservado por outra pessoa. Escolha outro.");
      } else if (String(e?.message).includes("DOC_NOT_FOUND")) {
        alert("Número ainda não foi criado. Recarregue a página (Ctrl+F5).");
      } else {
        alert("❌ Não foi possível reservar. Veja o Console (F12).");
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyPix() {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      alert("✅ Pix copiado!");
    } catch (e) {
      console.error(e);
      alert("❌ Não consegui copiar. Copie manualmente: " + PIX_KEY);
    }
  }

  function sendWhatsapp() {
    const id = reservedId || selectedId;
    if (!id) {
      alert("Selecione um número e reserve antes.");
      return;
    }

    const ticket = tickets[id];
    const finalName = (ticket?.name || name || "").trim();
    const finalWhatsapp = (ticket?.whatsapp || whatsapp || "").trim();

    if (!finalName || !finalWhatsapp) {
      alert("Preencha nome e WhatsApp (ou reserve o número) antes de enviar.");
      return;
    }

    const msg = buildWhatsappMessage({
      numberId: id,
      name: finalName,
      whatsapp: finalWhatsapp,
    });

    // wa.me exige número no formato internacional (55 + DDD + número)
    const url = `https://wa.me/${WHATSAPP_RECEIVER}?text=${msg}`;
    window.open(url, "_blank");
  }

  const reserveDisabled =
    !selectedId ||
    busy ||
    loading ||
    !seedReady ||
    !selected ||
    selected.status !== "AVAILABLE";

  const showPaymentBox = !!reservedId || (selectedId && selected?.status === "RESERVED");

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1 style={{ margin: 0 }}>🎟️ Rifa Online</h1>
      <p style={{ marginTop: 8 }}>
        <b>Prêmio:</b> 1 semana de mão de obra OU R$ 1.000 no Pix
        <br />
        <b>Valor:</b> R$ {PRICE},00 por número | <b>Sorteio:</b> 01/05 às 10h
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <span>🟢 Disponível</span>
        <span>🟡 Reservado</span>
        <span>🔴 Pago</span>
      </div>

      {loading ? (
        <p>Carregando…</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(10, minmax(48px, 1fr))",
            gap: 6,
            maxWidth: 900,
          }}
        >
          {grid.map(({ id, data }) => (
            <button
              key={id}
              onClick={() => setSelectedId(id)}
              style={{
                padding: 10,
                borderRadius: 8,
                border: selectedId === id ? "2px solid #000" : "1px solid #ddd",
                background: statusColor(data?.status),
                cursor: "pointer",
                fontWeight: 800,
              }}
              title={data?.status || "Carregando..."}
            >
              {id}
            </button>
          ))}
        </div>
      )}

      <hr style={{ margin: "20px 0" }} />

      <h2 style={{ marginTop: 0 }}>Reserva</h2>
      <p>
        Número selecionado: <b>{selectedId ?? "-"}</b>{" "}
        {selected ? `(${selected.status})` : ""}
      </p>

      <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
        <input
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 10 }}
        />
        <input
          placeholder="WhatsApp (com DDD)"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          style={{ padding: 10 }}
        />

        <button
          onClick={reserve}
          disabled={reserveDisabled}
          style={{
            padding: 12,
            cursor: reserveDisabled ? "not-allowed" : "pointer",
            fontWeight: 900,
          }}
        >
          ✅ Reservar número
        </button>

        {selectedId && selected && selected.status !== "AVAILABLE" && (
          <small style={{ color: "#555" }}>
            Esse número está <b>{selected.status}</b>. Escolha outro.
          </small>
        )}
      </div>

      {showPaymentBox && (
        <>
          <hr style={{ margin: "20px 0" }} />

          <h2>💸 Pagamento via Pix</h2>
          <p style={{ marginTop: 6 }}>
            <b>Chave (telefone):</b> {PIX_KEY}
            <br />
            <b>Favorecido:</b> {PIX_NAME}
            <br />
            <b>Valor:</b> R$ {PRICE},00
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={copyPix}
              style={{ padding: "10px 12px", cursor: "pointer", fontWeight: 800 }}
            >
              📋 Copiar Pix
            </button>

            <button
              onClick={sendWhatsapp}
              style={{ padding: "10px 12px", cursor: "pointer", fontWeight: 800 }}
            >
              📲 Enviar comprovante (WhatsApp)
            </button>
          </div>

          <p style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
            💡 Depois do Pix, clique em “Enviar comprovante” para abrir o WhatsApp com a mensagem pronta.
          </p>
        </>
      )}
    </div>
  );
}
