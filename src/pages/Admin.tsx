import { useEffect, useMemo, useState } from "react";
import { seedNumbers } from "../seedNumbers";
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
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  where,
} from "firebase/firestore";

const ADMIN_EMAIL = "gelysonetatiana@gmail.com";

type RifaNumber = {
  id: string;
  number: number;
  status: "AVAILABLE" | "RESERVED" | "PAID";
  name?: string;
  whatsapp?: string;
  reservedAt?: any;
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

  // 🔥 Firestore realtime – somente RESERVED
  useEffect(() => {
    if (!isAdmin) return;

    setLoadingList(true);

    const q = query(
      collection(db, "numbers"),
      where("status", "==", "RESERVED"),
      orderBy("number", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: RifaNumber[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setItems(data);
      setLoadingList(false);
    });

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

  // 🔐 Auth UI
  if (loadingAuth) return <div style={{ padding: 20 }}>Carregando…</div>;

  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h1>🔒 Área Admin</h1>
        <button onClick={login}>Entrar com Google</button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 20 }}>
        <h1>⛔ Acesso negado</h1>
        <p>{user.email}</p>
        <button onClick={logout}>Sair</button>
      </div>
    );
  }

  // ✅ ADMIN LIBERADO
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ color: "red" }}>✅ ÁREA ADMIN</h1>
      <p>
        Logado como: <b>{user.email}</b>
      </p>

      <button onClick={logout} style={{ marginRight: 10 }}>
        Sair
      </button>

      <button
        onClick={seedNumbers}
        style={{
          padding: "8px 12px",
          cursor: "pointer",
          background: "#0d6efd",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          fontWeight: "bold",
        }}
      >
        ⚡ Criar 300 números
      </button>

      <hr style={{ margin: "20px 0" }} />

      <h2>🟡 Reservados</h2>

      {loadingList ? (
        <p>Carregando…</p>
      ) : items.length === 0 ? (
        <p>Nenhum número reservado.</p>
      ) : (
        items.map((it) => (
          <div
            key={it.id}
            style={{
              border: "1px solid #ccc",
              padding: 10,
              marginBottom: 10,
            }}
          >
            <b>Nº {formatNumber(it.number)}</b>
            <div>Nome: {it.name}</div>
            <div>WhatsApp: {it.whatsapp}</div>

            <button
              onClick={() => confirmarPago(it)}
              disabled={busyId === it.id}
              style={{ marginRight: 10 }}
            >
              ✅ PAGO
            </button>

            <button
              onClick={() => liberar(it)}
              disabled={busyId === it.id}
            >
              ♻️ LIBERAR
            </button>
          </div>
        ))
      )}
    </div>
  );
}
