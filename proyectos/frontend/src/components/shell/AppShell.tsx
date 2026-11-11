import type { ReactNode } from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import BottomNav from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="theme-tecreview flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1 pb-20 md:pb-0">{children}</div>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
