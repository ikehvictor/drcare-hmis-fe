import { Hammer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { ALL_NAV_ITEMS } from "@/lib/nav";

const LATER = ALL_NAV_ITEMS.filter((i) => i.stage > 1);

export function generateStaticParams() {
  return LATER.map((i) => ({ section: i.href.split("/").pop()! }));
}

// Placeholder for sections that come in later stages.
export default async function ComingSoonPage({ params }: PageProps<"/admin/[section]">) {
  const { section } = await params;
  const item = LATER.find((i) => i.href === `/admin/${section}`);
  if (!item) notFound();

  return (
    <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-teal-soft">
        <Hammer className="size-6 text-teal" aria-hidden />
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold">{item.label}</h1>
      <p className="mt-2 text-sm text-muted">
        This section is planned for stage {item.stage}. Stage 1 covers the overview and branches &amp; service points.
      </p>
      <Link href="/admin" className="mt-6 inline-block text-sm font-medium text-teal hover:underline">
        Back to overview
      </Link>
    </Card>
  );
}
