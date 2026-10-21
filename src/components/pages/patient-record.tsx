"use client";

import { ArrowLeft, CheckCircle2, UserPlus, UserX } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { DeskGate, DeskNotice, useToday } from "@/components/desk-shell";
import { Badge, Card } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { ageLabel, formatDob, fullName } from "@/lib/patients";
import { useStore } from "@/lib/store";

export function PatientRecord() {
  return (
    <DeskGate>
      <Record />
    </DeskGate>
  );
}

function Record() {
  const { id } = useParams<{ id: string }>();
  const justRegistered = useSearchParams().get("registered") === "1";
  const { patients, numbering } = useStore();
  const today = useToday();
  const patient = patients.find((p) => p.id === id);

  if (!patient)
    return (
      <DeskNotice
        icon={UserX}
        title="Patient not found"
        action={
          <Link href="/desk" className="text-sm font-medium text-teal hover:underline">
            Back to search
          </Link>
        }
      >
        This record isn&apos;t in the demo data. It may have been cleared with a demo reset.
      </DeskNotice>
    );

  const name = fullName(patient);
  const summary: [string, React.ReactNode][] = [
    ["Sex", patient.sex],
    [
      "Date of birth",
      patient.dobEstimated
        ? `Not known (born about ${patient.dateOfBirth.slice(0, 4)})`
        : formatDob(patient.dateOfBirth),
    ],
    ["Age", today ? `${ageLabel(patient.dateOfBirth, today)}${patient.dobEstimated ? " (estimated)" : ""}` : "…"],
    ["Phone", patient.phone || "—"],
    ["Category", patient.categoryName],
    ["Registered", `${formatDate(patient.registeredAt)} at ${patient.branchName} by ${patient.registeredBy}`],
  ];
  if (numbering.keepLegacyNumber || patient.legacyNumber)
    summary.splice(4, 0, ["Old card number", patient.legacyNumber || "—"]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/desk" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Find a patient
      </Link>

      {justRegistered && (
        <div
          className="mb-4 flex flex-col gap-3 rounded-xl bg-success-soft px-4 py-3 text-sm text-success sm:flex-row sm:items-center sm:justify-between"
          data-testid="registered-banner"
        >
          <p className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Registered {name} as <span className="font-mono font-semibold">{patient.number}</span>. Give them this
              number for every visit.
            </span>
          </p>
          <Link
            href="/desk/register"
            className="inline-flex shrink-0 items-center gap-1.5 font-medium whitespace-nowrap hover:underline"
          >
            <UserPlus className="size-4" aria-hidden /> Register another
          </Link>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="font-mono text-base font-semibold text-foreground" data-testid="patient-number">
              {patient.number}
            </span>
            <Badge tone="brand">{patient.categoryName}</Badge>
          </p>
        </div>
      </div>

      <Card className="mb-4 p-5">
        <h2 className="mb-3 font-display text-base font-semibold">Summary</h2>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2" aria-label="Summary">
          {summary.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {patient.sections.map((s) => (
        <Card key={s.title} className="mb-4 p-5">
          <h2 className="mb-3 font-display text-base font-semibold">{s.title}</h2>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2" aria-label={s.title}>
            {s.answers.map((a) => (
              <div key={a.key}>
                <dt className="text-xs text-muted">{a.label}</dt>
                <dd className="font-medium break-words whitespace-pre-line">{a.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
      <p className="pb-8 text-xs text-muted">
        Registered with the {patient.formName} form. Records are never deleted; editing and merging come in a later
        stage.
      </p>
    </div>
  );
}
