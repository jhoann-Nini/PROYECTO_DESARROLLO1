import AppShell from "@/components/shell/AppShell";

export default function FavoritosLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
