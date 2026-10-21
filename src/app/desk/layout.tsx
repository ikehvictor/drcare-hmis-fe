import { DeskShell } from "@/components/desk-shell";

export default function DeskLayout({ children }: LayoutProps<"/desk">) {
  return <DeskShell>{children}</DeskShell>;
}
