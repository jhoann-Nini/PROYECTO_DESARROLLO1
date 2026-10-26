import SiteHeader from "@/components/shell/SiteHeader";
import BottomNav from "@/components/shell/BottomNav";
import SiteFooter from "@/components/shell/SiteFooter";

export default function ProductosLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="theme-tecnoreview flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1 pb-20 md:pb-0">{children}</div>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
