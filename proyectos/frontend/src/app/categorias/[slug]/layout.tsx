import AppShell from "@/components/shell/AppShell";

export default function CategoriaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
