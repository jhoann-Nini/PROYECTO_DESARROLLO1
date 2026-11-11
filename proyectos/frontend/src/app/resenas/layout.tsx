import AppShell from "@/components/shell/AppShell";

export default function ResenasLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
