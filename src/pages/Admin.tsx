import { seedNumbers } from "../seedNumbers"; // se o Admin estiver em src/pages/Admin.tsx
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase"; // ajuste o caminho se necessário
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  where,
} from "firebase/firestore";

const ADMIN_EMAIL = "gelysonetatiana@gmail.com";

type RifaNumber = {
  id: string; // doc id
  number: number; // 1..300
  status: "AVAILABLE" | "RESERVED" | "PAID";
  name?: string;
  whatsapp?: string;
  reservedAt?: any; // Timestamp
};

function formatNumber(n: number) {
  return String(n).padStart(3, "0");
}

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [items, setItems] = useState<RifaNumber[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  // Firestore realtime: apenas RESERVED
  useEffect(() => {
    if (!isAdmin) return;

    setLoadingList(true);

    // Ajuste o nome da coleção caso seja diferente:
    // Ex: "numbers", "rifa", "tickets", etc.
    const colRef = collection(db, "numbers");

    const q = query(
      colRef,
      where("status", "==", "RESERVED"),
      orderBy("number", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: RifaNumber[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setItems(data);
        setLoadingList(false);
      },
      (err) => {
        console.error("Erro ao ler RESERVED:", err);
        setLoadingList(false);
      }
    );

    return () => unsub();
  }, [isAdmin]);

  async function confirmarPago(item: RifaNumber) {
    try {
      setBusyId(item.id);
      await updateDoc(doc(db, "numbers", item.id), {
        status: "PAID",
        paidAt: new Date(),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function liberar(item: RifaNumber) {
    try {
      setBusyId(item.id);
      await updateDoc(doc(db, "numbers", item.id), {
        status: "AVAILABLE",
        name: "",
        whatsapp: "",
        reservedAt: null,
      });
    } finally {
      setBusyId(null);
    }
  }

  // UI auth
  if (loadingAuth) return <div style={{ padding: 20 }}>Carregando…</div>;

  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>🔒 Área Admin</h1>
        <p>Faça login com Google para acessar.</p>
        <button onClick={login} style={{ padding: 10, cursor: "pointer" }}>
          Entrar com Google
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>⛔ Acesso negado</h1>
        <p>
          Você entrou como: <b>{user.email}</b>
        </p>
        <p>
          Somente <b>{ADMIN_EMAIL}</b> pode acessar.
        </p>
       <button
  onClick={seedNumbers}
  style={{ padding: 10, cursor: "pointer", marginRight: 10 }}
>
  ⚡ Criar 300 números
</button>

      </div>
    );
  }

  // UI admin
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, color: "red" }}>✅ ÁREA ADMIN</h1>
      <p>
        Logado como: <b>{user.email}</b>
      </p>
      <button onClick={logout} style={{ padding: 10, cursor: "pointer" }}>
        Sair
      </button>

      <hr style={{ margin: "20px 0" }} />

      <h2 style={{ fontSize: 20, marginBottom: 10 }}>🟡 Reservados (aguardando pagamento)</h2>

      {loadingList ? (
        <p>Carregando lista…</p>
      ) : items.length === 0 ? (
        <p>Nenhum número reservado no momento.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((it) => (
            <div
              key={it.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>
                    Nº {formatNumber(it.number)}
                  </div>
                  <div>
                    <b>Nome:</b> {it.name || "-"}
                  </div>
                  <div>
                    <b>WhatsApp:</b> {it.whatsapp || "-"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => confirmarPago(it)}
                    disabled={busyId === it.id}
                    style={{ padding: "10px 12px", cursor: "pointer" }}
                  >
                    ✅ Confirmar PAGO
                  </button>

                  <button
                    onClick={() => liberar(it)}
                    disabled={busyId === it.id}
                    style={{ padding: "10px 12px", cursor: "pointer" }}
                  >
                    ♻️ Liberar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
