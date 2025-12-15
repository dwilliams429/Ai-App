import shell from "../PageShell.module.scss";

export default function Inventory() {
  return (
    <section className={shell.card}>
      <h1 className={shell.title} style={{ fontSize: 44 }}>Inventory</h1>
      <div className={shell.subtitle}>
        Next step: wire this to real inventory data.
      </div>
    </section>
  );
}
