import { NavLink } from "react-router-dom";
import { useState } from "react";
import styles from "./Navbar.module.scss";

export default function Navbar() {
  const [q, setQ] = useState("");

  function onSearch(e) {
    e.preventDefault();
    // later: navigate to /recipes?q=...
    // for now: keep UI consistent with screenshots
    console.log("search:", q);
  }

  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.brand}>
          <div className={styles.logo} aria-hidden="true">🔎</div>
          <div>
            <div className={styles.title}>AI Recipe</div>
            <div className={styles.subtitle}>simple • modern • auto-generated</div>
          </div>
        </div>

        <form className={styles.search} onSubmit={onSearch}>
          <input
            className={styles.searchInput}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search recipes..."
          />
          <button className={styles.searchBtn} type="submit">
            Search
          </button>
        </form>
      </div>

      <nav className={styles.nav}>
        <NavLink to="/" className={({ isActive }) => (isActive ? styles.active : styles.link)}>
          Home
        </NavLink>
        <NavLink to="/recipes" className={({ isActive }) => (isActive ? styles.active : styles.link)}>
          Recipes
        </NavLink>
        <NavLink to="/inventory" className={({ isActive }) => (isActive ? styles.active : styles.link)}>
          Inventory
        </NavLink>
        <NavLink
          to="/shopping-list"
          className={({ isActive }) => (isActive ? styles.active : styles.link)}
        >
          Shopping List
        </NavLink>
      </nav>
    </header>
  );
}
