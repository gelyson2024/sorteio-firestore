useEffect(() => {
  if (!isAdmin) return;

  setLoadingList(true);

  const q = query(
    collection(db, "numbers"),
    where("status", "==", "RESERVED")
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .sort((a: any, b: any) => (a.number ?? 0) - (b.number ?? 0));

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
