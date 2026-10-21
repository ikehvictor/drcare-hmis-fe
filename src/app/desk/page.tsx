"use client";

import { Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DeskGate, useToday } from "@/components/desk-shell";
import { RelativeTime } from "@/components/relative-time";
import { Badge, Card, Input, PageHeader } from "@/components/ui";
import { ageLabel, fullName, searchPatients, type Patient } from "@/lib/patients";
import { useStore } from "@/lib/store";

export default function FindPatientPage() {
  return (
    <DeskGate>
      <FindPatient />
    </DeskGate>
  );
}

function FindPatient() {
  const { patients, numbering } = useStore();
  const [query, setQuery] = useState("");
  const legacy = numbering.keepLegacyNumber;
  const searching = query.trim().length > 0;
  const results = searching ? searchPatients(patients, query, legacy) : patients.slice(0, 10);

  return (
    <>
      <PageHeader
        title="Find a patient"
        description="Search before you register, so returning patients keep the number they already have."
        actions={
          <Link
            href="/desk/register"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal px-4 text-sm font-medium text-white hover:bg-teal-dark"
          >
            <UserPlus className="size-4" aria-hidden /> Register a patient
          </Link>
        }
      />

      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Search patients"
          placeholder={`Patient number, name or phone${legacy ? ", or old card number" : ""}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 pl-10 text-base"
          autoFocus
        />
      </div>

      {patients.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-medium">No patients registered yet</p>
          <p className="text-sm text-muted">Patients you register appear here and can be searched.</p>
        </Card>
      ) : searching && results.length === 0 ? (
        <Card className="p-10 text-center">
          <Search className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-medium">No patient matches “{query.trim()}”</p>
          <p className="text-sm text-muted">
            Check the spelling or try their phone number.{" "}
            <Link href="/desk/register" className="font-medium text-teal hover:underline">
              Register a new patient
            </Link>
          </p>
        </Card>
      ) : (
        <PatientTable
          patients={results}
          caption={
            searching
              ? `${results.length} ${results.length === 1 ? "patient matches" : "patients match"}`
              : "Recently registered"
          }
          showLegacy={legacy}
        />
      )}
    </>
  );
}

function PatientTable({
  patients,
  caption,
  showLegacy,
}: {
  patients: Patient[];
  caption: string;
  showLegacy: boolean;
}) {
  const today = useToday();
  return (
    <Card className="overflow-hidden">
      <h2 className="border-b border-line px-4 py-3 text-sm font-medium" aria-live="polite">
        {caption}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Patients">
          <thead className="bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Patient</th>
              <th className="px-4 py-2 font-medium">Number</th>
              <th className="hidden px-4 py-2 font-medium sm:table-cell">Sex · age</th>
              <th className="hidden px-4 py-2 font-medium md:table-cell">Phone</th>
              <th className="hidden px-4 py-2 font-medium lg:table-cell">Category</th>
              <th className="hidden px-4 py-2 font-medium lg:table-cell">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {patients.map((p) => (
              <tr key={p.id} className="hover:bg-background/60">
                <td className="px-4 py-3">
                  <Link href={`/desk/patients/${p.id}`} className="font-medium text-foreground hover:text-teal">
                    {fullName(p)}
                  </Link>
                  <div className="text-xs text-muted sm:hidden">
                    {p.sex}
                    {today && ` · ${ageLabel(p.dateOfBirth, today)}`}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-[13px] whitespace-nowrap">{p.number}</span>
                  {showLegacy && p.legacyNumber && <div className="text-xs text-muted">Old card {p.legacyNumber}</div>}
                </td>
                <td className="hidden px-4 py-3 whitespace-nowrap sm:table-cell">
                  {p.sex}
                  {today && ` · ${ageLabel(p.dateOfBirth, today)}`}
                </td>
                <td className="hidden px-4 py-3 whitespace-nowrap md:table-cell">{p.phone || "—"}</td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <Badge>{p.categoryName}</Badge>
                </td>
                <td className="hidden px-4 py-3 text-muted lg:table-cell">
                  <RelativeTime iso={p.registeredAt} /> · {p.branchName}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
