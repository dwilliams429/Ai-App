import { Outlet } from "react-router-dom";
import Navbar from "../../Navbar/Navbar";
import Footer from "../../Footer/Footer";
import styles from "./Layout.module.scss";

export default function Layout() {
  return (
    <div className={styles.appBg}>
      <div className={styles.shell}>
        <Navbar />
        <main className={styles.main}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
