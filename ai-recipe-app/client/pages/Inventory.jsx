import React, { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/GlassCard";
import { api } from "../api/http";

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [shopping, setShopping] = useState([]);
  const [invName, setInvName] = useState("");
  const [shopName, setShopName] = useState("");
  const [err, setErr] = useState("");

  const rightSlot = useMemo(() => <button className="pill-btn pill-btn--ghost" type="button">Search</button>, []);

  async function load() {
    setErr("");
    try {
      const [inv, shop] = await Promise.all([api.listInventory(), api.listShopping()]);
      setInventory(inv.items || []);
      setShopping(shop.items || []);
    } catch (e) {
      setErr(e.message || "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addInventory() {
    if (!invName.trim()) return setErr("Inventory item name is required");
    setErr("");
    try {
      const data = await api.addInventory(invName.trim());
      setInventory((prev) => [data.item, ...prev]);
      setInvName("");
    } catch (e) {
      setErr(e.message || "Failed to add inventory");
    }
  }

  async function toggleInventory(item) {
    setErr("");
    try {
      const data = await api.updateInventory(item._id, { checked: !item.checked });
      setInventory((prev) => prev.map((x) => (x._id === item._id ? data.item : x)));
    } catch (e) {
      setErr(e.message || "Failed to update");
    }
  }

  async function addShopping() {
    if (!shopName.trim()) return setErr("Shopping item name is required");
    setErr("");
    try {
      const data = await api.addShopping(shopName.trim());
      setShopping((prev) => [data.item, ...prev]);
      setShopName("");
    } catch (e) {
      setErr(e.message || "Failed to add shopping item");
    }
  }

  async function toggleShopping(item) {
    setErr("");
    try {
      const data = await api.updateShopping(item._id, { checked: !item.checked });
      setShopping((prev) => prev.map((x) => (x._id === item._id ? data.item : x)));
    } catch (e) {
      setErr(e.message || "Failed to update");
    }
  }

  async function removeShopping(id) {
    setErr("");
    try {
      await api.deleteShopping(id);
      setShopping((prev) => prev.filter((x) => x._id !== id));
    } catch (e) {
      setErr(e.message || "Failed to delete");
    }
  }

  return (
    <GlassCard title="Inventory" rightSlot={rightSlot}>
      {err ? <div className="error-banner">⚠️ {err}</div> : null}

      <div className="two-col">
        <section className="panel">
          <h2 className="panel__title">Inventory</h2>
          <div className="checklist">
            {inventory.map((it) => (
              <label key={it._id} className="checkrow">
                <input type="checkbox" checked={!!it.checked} onChange={() => toggleInventory(it)} />
                <span>{it.name}</span>
              </label>
            ))}
            {inventory.length === 0 ? <div className="muted">No inventory yet.</div> : null}
          </div>

          <div className="panel__footer">
            <div className="muted" style={{ marginTop: 12 }}>Steps</div>
            <label className="checkrow"><input type="checkbox" /> Step 1</label>
            <label className="checkrow"><input type="checkbox" /> Step 2</label>
            <label className="checkrow"><input type="checkbox" /> Step 3</label>
          </div>

          <div className="inline-add">
            <input
              className="field__input"
              value={invName}
              onChange={(e) => setInvName(e.target.value)}
              placeholder="Add inventory item"
            />
            <button className="pill-btn" onClick={addInventory} type="button">Add</button>
          </div>
        </section>

        <section className="panel">
          <h2 className="panel__title">Shopping List</h2>

          <div className="shop-grid">
            <div className="checklist">
              {shopping.map((it) => (
                <label key={it._id} className="checkrow">
                  <input type="checkbox" checked={!!it.checked} onChange={() => toggleShopping(it)} />
                  <span>{it.name}</span>
                </label>
              ))}
              {shopping.length === 0 ? <div className="muted">No shopping items yet.</div> : null}
            </div>

            <div className="shop-actions">
              {shopping.map((it) => (
                <button
                  key={`${it._id}-x`}
                  className="icon-x"
                  onClick={() => removeShopping(it._id)}
                  type="button"
                  aria-label={`Delete ${it.name}`}
                >
                  ×
                </button>
              ))}
            </div>
          </div>

          <div className="inline-add">
            <input
              className="field__input"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Add Item"
            />
            <button className="pill-btn" onClick={addShopping} type="button">Add</button>
          </div>

          <button
            className="big-btn big-btn--ghost"
            type="button"
            onClick={() => navigator.share ? navigator.share({ title: "Shopping List", text: shopping.map(s => `- ${s.name}`).join("\n") }) : alert("Share not supported in this browser")}
          >
            Share
          </button>
        </section>
      </div>
    </GlassCard>
  );
}
