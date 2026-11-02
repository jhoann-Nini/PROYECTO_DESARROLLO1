import AppShell from "@/components/shell/AppShell";

export default function PerfilLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
