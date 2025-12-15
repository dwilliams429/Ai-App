import shell from "../PageShell.module.scss";

export default function ShoppingList() {
  return (
    <section className={shell.card}>
      <h1 className={shell.title} style={{ fontSize: 44 }}>Shopping List</h1>
      <div className={shell.subtitle}>
        Next step: wire this to real data and share/export.
      </div>
    </section>
  );
}
