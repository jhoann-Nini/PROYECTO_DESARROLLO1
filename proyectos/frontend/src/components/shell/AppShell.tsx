import type { ReactNode } from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import BottomNav from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="theme-tecreview flex min-h-screen flex-col bg-canvas pb-[calc(6rem+env(safe-area-inset-bottom))] text-ink md:pb-0">
      <SiteHeader />
      <div className="min-w-0 flex-1">{children}</div>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
