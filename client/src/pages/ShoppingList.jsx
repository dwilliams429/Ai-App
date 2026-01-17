// client/src/pages/ShoppingList.jsx
import React, { useEffect, useState } from "react";
import GlassCard from "../components/GlassCard";
import ft from "../api/ft";

export default function ShoppingList() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setBusy(true);
    try {
      const list = await ft.listShopping();
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.message || "Failed to fetch");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    setErr("");
    if (!name.trim()) return setErr("Item name is required");
    setBusy(true);
    try {
      await ft.addShopping({ name: name.trim(), qty: qty?.trim() || "" });
      setName("");
      setQty("");
      await load();
    } catch (e) {
      setErr(e?.message || "Failed to add item");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <GlassCard title="Shopping List" subtitle="Add items, check them off, remove them, and share/export.">
      {err ? <div className="error-banner">⚠️ {err}</div> : null}

      <button className="small-btn" onClick={load} disabled={busy} style={{ marginTop: 10 }}>
        {busy ? "Loading..." : "Refresh"}
      </button>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          className="field__input"
          style={{ flex: 1, minWidth: 260 }}
          placeholder="Add item (e.g., Milk)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="field__input"
          style={{ width: 200 }}
          placeholder="Qty (optional) e.g., 2"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <button className="small-btn" onClick={add} disabled={busy}>
          Add
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        {items.length === 0 && !busy ? <div className="muted">No items yet. Add one below.</div> : null}
        {items.map((it, idx) => {
          const label = it?.name || it?.item || `Item ${idx + 1}`;
          return (
            <div key={it?._id || it?.id || idx} className="list-card" style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700 }}>{label}</div>
              {it?.qty ? <div className="muted">{it.qty}</div> : null}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
