import { notFound } from "next/navigation";
import { ModuleDetail } from "@/components/pages/module-detail";
import { MODULES } from "@/lib/modules";

const WITH_OPTIONS = MODULES.filter((m) => !m.core && m.settings.length > 0);

export function generateStaticParams() {
  return WITH_OPTIONS.map((m) => ({ id: m.id }));
}

export default async function ModuleDetailPage({ params }: PageProps<"/admin/modules/[id]">) {
  const { id } = await params;
  if (!WITH_OPTIONS.some((m) => m.id === id)) notFound();
  return <ModuleDetail id={id} />;
}
