import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { db } from "../firebase";

const RAFFLE_ID = "sorteio2025";
const ADMIN_EMAIL = "gelysonetatiana@gmail.com";

type TicketStatus = "AVAILABLE" | "RESERVED" | "PAID";
type Ticket = { id: string; number: number; status: TicketStatus; name?: string; phone?: string };

const auth = getAuth();
const provider = new GoogleAuthProvider();

export default function Admin() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => auth.onAuthStateChanged((u) => setUserEmail(u?.email ?? null)), []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "raffles", RAFFLE_ID, "tickets"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => a.number - b.number);
      setTickets(list);
    });
    return () => unsub();
  }, []);

  const isAdmin = userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const reserved = useMemo(() => tickets.filter(t => t.status === "RESERVED"), [tickets]);

  async function login() {
    await signInWithPopup(auth, provider);
  }
  async function logout() {
    await signOut(auth);
  }

  async function confirmarPago(id: string) {
    await updateDoc(doc(db, "raffles", RAFFLE_ID, "tickets", id), { status: "PAID" });
  }

  async function liberar(id: string) {
    await updateDoc(doc(db, "raffles", RAFFLE_ID, "tickets", id), {
      status: "AVAILABLE",
      name: "",
      phone: "",
    });
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Admin</h1>
        <a href="/" style={{ fontWeight: 900 }}>Voltar</a>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div><b>Logado:</b> {userEmail ?? "não"}</div>
        {!userEmail ? (
          <button onClick={login} style={{ padding: 10, borderRadius: 10, border: 0, background: "#0b57d0", color: "#fff", fontWeight: 900 }}>
            Entrar com Google
          </button>
        ) : (
          <button onClick={logout} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontWeight: 900 }}>
            Sair
          </button>
        )}
      </div>

      {!isAdmin && userEmail && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#fff3cd", border: "1px solid #ffeeba" }}>
          Você não está autorizado como admin.
        </div>
      )}

      <h2 style={{ marginTop: 16, fontSize: 18, fontWeight: 900 }}>
        Reservados ({reserved.length})
      </h2>

      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        {reserved.map((t) => (
          <div key={t.id} style={{ padding: 12, borderRadius: 14, border: "1px solid #eee", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900 }}>Número {String(t.number).padStart(3, "0")}</div>
              <div style={{ color: "#444" }}>
                <b>Nome:</b> {t.name || "-"} • <b>Whats:</b> {t.phone || "-"}
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                disabled={!isAdmin}
                onClick={() => confirmarPago(t.id)}
                style={{ padding: 10, borderRadius: 10, border: 0, background: "#198754", color: "#fff", fontWeight: 900 }}
              >
                Confirmar PAGO
              </button>
              <button
                disabled={!isAdmin}
                onClick={() => liberar(t.id)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontWeight: 900 }}
              >
                Liberar
              </button>
            </div>
          </div>
        ))}
        {reserved.length === 0 && <div>Nenhum reservado agora.</div>}
      </div>
    </div>
  );
}
