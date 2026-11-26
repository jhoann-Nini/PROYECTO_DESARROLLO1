import AppShell from "@/components/shell/AppShell";

export default function ComunidadLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
