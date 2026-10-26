import AppShell from "@/components/shell/AppShell";

export default function BlogLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
