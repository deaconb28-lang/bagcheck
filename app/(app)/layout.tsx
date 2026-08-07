import { IconRail, TabBar } from "@/components/app/AppNav";
import { ModeScope } from "@/components/app/ModeScope";
import styles from "./app.module.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <ModeScope mode="light" />
      <IconRail />
      <div className={styles.canvas}>{children}</div>
      <TabBar />
    </div>
  );
}
