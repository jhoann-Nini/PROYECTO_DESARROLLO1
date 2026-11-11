import AppShell from "@/components/shell/AppShell";

export default function ProductosLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
