import { AdminShell } from "@/components/admin-shell";
import { StoreProvider } from "@/lib/store";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <StoreProvider>
      <AdminShell>{children}</AdminShell>
    </StoreProvider>
  );
}
