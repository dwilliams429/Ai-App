import shell from "../PageShell.module.scss";

export default function Recipes() {
  return (
    <section className={shell.card}>
      <h1 className={shell.title} style={{ fontSize: 44 }}>Recipes</h1>
      <div className={shell.subtitle}>
        Next step: fetch real recipes from the server and display cards here.
      </div>
    </section>
  );
}
