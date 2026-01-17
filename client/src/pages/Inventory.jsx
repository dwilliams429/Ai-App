import React, { useEffect, useState } from "react";
import ft from "../api/ft";

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const data = await ft.listInventory();
      setItems(data || []);
    } catch {
      setError("Failed to load inventory");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <h1>Inventory</h1>
      {error && <div className="error-banner">⚠️ {error}</div>}
      {items.length === 0 && <p>No items yet.</p>}
      <ul>
        {items.map(i => (
          <li key={i._id}>{i.name}</li>
        ))}
      </ul>
    </div>
  );
}
