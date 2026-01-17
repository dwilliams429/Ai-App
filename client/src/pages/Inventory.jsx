// client/src/pages/Inventory.jsx
import React, { useEffect, useState } from "react";
import GlassCard from "../components/GlassCard";
import ft from "../api/ft";

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setBusy(true);
    try {
      const data = await ft.listInventory();
      const arr = Array.isArray(data?.items) ? data.items : [];
      setItems(arr);
    } catch (e) {
      setErr(e?.message || "Failed to fetch inventory");
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
      await ft.addInventory({ name: name.trim(), qty: qty?.trim() || "" });
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
    <GlassCard title="Inventory" subtitle="Track what you have on hand (real saved data).">
      {err ? <div className="error-banner">⚠️ {err}</div> : null}

      <button className="small-btn" onClick={load} disabled={busy} style={{ marginTop: 10 }}>
        {busy ? "Loading..." : "Refresh"}
      </button>

      <div style={{ marginTop: 12 }}>
        <input
          className="field__input"
          placeholder="Item (e.g., Chicken breast)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="field__input"
          placeholder="Qty (optional) e.g., 2 lbs"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          style={{ marginTop: 10 }}
        />

        <button className="small-btn" onClick={add} disabled={busy} style={{ marginTop: 10 }}>
          Add
        </button>

        <div style={{ marginTop: 14 }}>
          {!busy && items.length === 0 ? <div className="muted">No items yet. Add one above.</div> : null}

          {items.map((it, idx) => (
            <div key={it?._id || it?.id || idx} className="list-card" style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700 }}>{it?.name || it?.item || `Item ${idx + 1}`}</div>
              {it?.qty ? <div className="muted">{it.qty}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
