import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

const ADMIN_EMAIL = "gelysonetatiana@gmail.com";
const COLLECTION = "numbers";

type TicketStatus = "AVAILABLE" | "RESERVED" | "PAID";

type Ticket = {
  number: number;
  status: TicketStatus;
  name?: string;
  whatsapp?: string;
  reservedAt?: number | null;
  paidAt?: number | null;
};

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

function fmtDate(ms?: number | null) {
  if (!ms) return "-";
  try {
    return new Date(ms).toLocaleString("pt-BR");
  } catch {
    return "-";
  }
}

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [items, setItems] = useState<Array<{ id: string; data: Ticket }>>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // filtro de tela
  const [filter, setFilter] = useState<"ALL" | "RESERVED" | "PAID">("ALL");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  async function login() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function logout() {
    await signOut(auth);
  }

  const isAdmin = useMemo(() => user?.email === ADMIN_EMAIL, [user]);

  useEffect(() => {
    if (!isAdmin) return;

    setLoadingList(true);

    // ✅ Mostrar somente RESERVED e PAID (controle)
    // Sem orderBy pra não precisar de índice
    const q = query(
      collection(db, COLLECTION),
      where("status", "in", ["RESERVED", "PAID"])
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, data: d.data() as Ticket }))
          .sort((a, b) => (a.data.number ?? 0) - (b.data.number ?? 0));

        setItems(data);
        setLoadingList(false);
      },
      (err) => {
        console.error("Erro Admin snapshot:", err);
        setLoadingList(false);
      }
    );

    return () => unsub();
  }, [isAdmin]);

  async function confirmarPago(id: string) {
    try {
      setBusyId(id);
      await updateDoc(doc(db, COLLECTION, id), {
        status: "PAID",
        paidAt: Date.now(),
      });
    } finally {
      setBusyId(null);
    }
  }

  // ✅ liberar mesmo depois de pago (volta para AVAILABLE e limpa dados)
  async function liberar(id: string) {
    try {
      setBusyId(id);
      await updateDoc(doc(db, COLLECTION, id), {
        status: "AVAILABLE",
        name: "",
        whatsapp: "",
        reservedAt: null,
        paidAt: null,
      });
    } finally {
      setBusyId(null);
    }
  }

  // (opcional) voltar pago -> reservado sem apagar dados
  async function voltarReservado(id: string) {
    try {
      setBusyId(id);
      await updateDoc(doc(db, COLLECTION, id), {
        status: "RESERVED",
        paidAt: null,
        // mantém name/whatsapp/reservedAt
      });
    } finally {
      setBusyId(null);
    }
  }

  const filteredItems = useMemo(() => {
    if (filter === "ALL") return items;
    return items.filter((x) => x.data.status === filter);
  }, [items, filter]);

  if (loadingAuth) return <div style={{ padding: 20 }}>Carregando…</div>;

  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h1>🔒 Área Admin</h1>
        <button onClick={login} style={{ padding: 10, cursor: "pointer" }}>
          Entrar com Google
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 20 }}>
        <h1>⛔ Acesso negado</h1>
        <p>
          Você entrou como: <b>{user.email}</b>
        </p>
        <button onClick={logout} style={{ padding: 10, cursor: "pointer" }}>
          Sair
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ color: "red" }}>✅ ÁREA ADMIN</h1>
      <p>
        Logado como: <b>{user.email}</b>
      </p>

      <button onClick={logout} style={{ padding: 10, cursor: "pointer" }}>
        Sair
      </button>

      <hr style={{ margin: "20px 0" }} />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>📋 Controle</h2>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setFilter("ALL")}
            style={{ padding: "8px 10px", cursor: "pointer", fontWeight: filter === "ALL" ? 900 : 600 }}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter("RESERVED")}
            style={{ padding: "8px 10px", cursor: "pointer", fontWeight: filter === "RESERVED" ? 900 : 600 }}
          >
            Reservados
          </button>
          <button
            onClick={() => setFilter("PAID")}
            style={{ padding: "8px 10px", cursor: "pointer", fontWeight: filter === "PAID" ? 900 : 600 }}
          >
            Pagos
          </button>
        </div>
      </div>

      {loadingList ? (
        <p>Carregando…</p>
      ) : filteredItems.length === 0 ? (
        <p>Nenhum item para mostrar.</p>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {filteredItems.map(({ id, data }) => {
            const isReserved = data.status === "RESERVED";
            const isPaid = data.status === "PAID";

            return (
              <div key={id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>
                      Nº {pad3(data.number)} —{" "}
                      <span style={{ color: isPaid ? "#e74c3c" : "#b8860b" }}>
                        {data.status}
                      </span>
                    </div>

                    <div><b>Nome:</b> {data.name || "-"}</div>
                    <div><b>WhatsApp:</b> {data.whatsapp || "-"}</div>
                    <div><b>Reservado em:</b> {fmtDate(data.reservedAt)}</div>
                    <div><b>Pago em:</b> {fmtDate(data.paidAt)}</div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {isReserved && (
                      <button
                        onClick={() => confirmarPago(id)}
                        disabled={busyId === id}
                        style={{ padding: "10px 12px", cursor: "pointer" }}
                      >
                        ✅ Confirmar PAGO
                      </button>
                    )}

                    {isPaid && (
                      <button
                        onClick={() => voltarReservado(id)}
                        disabled={busyId === id}
                        style={{ padding: "10px 12px", cursor: "pointer" }}
                        title="Volta para RESERVED sem apagar nome/whatsapp"
                      >
                        ↩️ Voltar p/ Reservado
                      </button>
                    )}

                    {/* ✅ Disponível em ambos os casos */}
                    <button
                      onClick={() => liberar(id)}
                      disabled={busyId === id}
                      style={{ padding: "10px 12px", cursor: "pointer" }}
                      title="Libera e limpa dados (mesmo se estiver PAGO)"
                    >
                      ♻️ Liberar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
