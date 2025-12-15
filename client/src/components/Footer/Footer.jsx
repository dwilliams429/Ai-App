import styles from "./Footer.module.scss";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div>© {new Date().getFullYear()} AI Recipe</div>
      <div className={styles.links}>
        <a href="#" onClick={(e) => e.preventDefault()}>About</a>
        <a href="#" onClick={(e) => e.preventDefault()}>Contact</a>
        <a href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
      </div>
    </footer>
  );
}
