import { useEffect, useState } from "react";
import { auth } from "../firebase"; // ajuste o caminho se necessário
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

const ADMIN_EMAIL = "gelysonetatiana@gmail.com";

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
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

  if (loading) {
    return <div style={{ padding: 20 }}>Carregando…</div>;
  }

  // Não logado
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

  // Logado, mas não é admin
  if (user.email !== ADMIN_EMAIL) {
    return (
      <div style={{ padding: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>⛔ Acesso negado</h1>
        <p>Você entrou como: <b>{user.email}</b></p>
        <p>Somente <b>{ADMIN_EMAIL}</b> pode acessar.</p>
        <button onClick={logout} style={{ padding: 10, cursor: "pointer" }}>
          Sair
        </button>
      </div>
    );
  }

  // Admin liberado
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, color: "red" }}>✅ ÁREA ADMIN</h1>
      <p>Logado como: <b>{user.email}</b></p>
      <button onClick={logout} style={{ padding: 10, cursor: "pointer" }}>
        Sair
      </button>

      <hr style={{ margin: "20px 0" }} />

      <p>Aqui agora você vai colocar a lista de RESERVED e os botões ✅ PAGO / ♻️ LIBERAR.</p>
    </div>
  );
}
