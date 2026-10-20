"use client";

import clsx from "clsx";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Dialog, Field, Input, PageHeader, SaveBar, Select, Switch } from "@/components/ui";
import {
  PRESETS,
  render,
  sampleRegistrations,
  seqDigits,
  TOKENS,
  validate,
  type NumberingConfig,
  type ResetRule,
  type SequenceScope,
} from "@/lib/numbering";
import { useStore } from "@/lib/store";

type Draft = Omit<NumberingConfig, "configured" | "updatedAt">;

const SCOPES: { value: SequenceScope; label: string; help: string }[] = [
  { value: "hospital", label: "One counter for the whole hospital", help: "Every branch shares the next number." },
  { value: "branch", label: "One counter per branch", help: "Each branch starts from its own number. Needs {BR}." },
  {
    value: "category",
    label: "One counter per patient category",
    help: "e.g. antenatal patients count separately. Needs {CAT}.",
  },
];

const toDraft = (c: NumberingConfig): Draft => ({
  template: c.template,
  prefix: c.prefix,
  scope: c.scope,
  reset: c.reset,
  startAt: c.startAt,
  keepLegacyNumber: c.keepLegacyNumber,
});

export default function NumberingPage() {
  const { numbering, ready } = useStore();
  if (!ready) return null;
  // Keyed so a save or a demo reset reloads the form from the store.
  return <NumberingEditor key={numbering.updatedAt ?? "unsaved"} saved={numbering} />;
}

function NumberingEditor({ saved }: { saved: NumberingConfig }) {
  const { branches, categories, isModuleOn, saveNumbering, notify } = useStore();
  const activeCategories = categories.filter((c) => c.active);
  const [draft, setDraft] = useState<Draft>(() => toDraft(saved));
  const [confirming, setConfirming] = useState(false);
  const [today, setToday] = useState<Date | null>(null);
  const templateRef = useRef<HTMLInputElement>(null);

  // The preview uses today's date, which is only read in the browser.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock is only read in the browser
  useEffect(() => setToday(new Date()), []);

  const errors = validate(draft);
  const valid = errors.length === 0;
  const dirty = !saved.configured || JSON.stringify(draft) !== JSON.stringify(toDraft(saved));
  const activeBranches = branches.filter((b) => b.active);
  const samples =
    valid && today ? sampleRegistrations({ ...draft, configured: true }, activeBranches, activeCategories, today) : [];
  const digits = seqDigits(draft.template);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const insertToken = (token: string) => {
    const el = templateRef.current;
    const start = el?.selectionStart ?? draft.template.length;
    const end = el?.selectionEnd ?? draft.template.length;
    const next = draft.template.slice(0, start) + token + draft.template.slice(end);
    set("template", next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const commit = () => {
    saveNumbering(draft);
    setConfirming(false);
    notify("Patient number format saved");
  };

  const example = (c: Draft) =>
    today
      ? render(c.template, {
          prefix: c.prefix,
          branchCode: activeBranches[0]?.code ?? "MAIN",
          categoryCode: "GEN",
          date: today,
          seq: c.startAt,
        })
      : "";

  return (
    <div className={clsx(dirty && "pb-24")}>
      <PageHeader
        title="Patient numbering"
        description="Choose how patient numbers look. The system issues them in order and never repeats or reuses one, even when two clerks register at the same second."
      />

      {!isModuleOn("medical-records") && (
        <p className="mb-4 flex gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Medical Records is off, so no numbers are issued yet. Set the format now and{" "}
            <Link href="/admin/modules" className="font-medium underline">
              switch it on
            </Link>{" "}
            when you&apos;re ready.
          </span>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card className="space-y-5 p-5">
            <div>
              <p className="text-sm font-medium">Start from a common format</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.template}
                    type="button"
                    onClick={() => set("template", p.template)}
                    aria-pressed={draft.template === p.template}
                    className={clsx(
                      "rounded-lg border px-3 py-1.5 text-left text-sm transition-colors",
                      draft.template === p.template
                        ? "border-teal bg-teal-soft/60"
                        : "border-line hover:border-teal/40",
                    )}
                  >
                    <span className="block font-medium">{p.label}</span>
                    <code className="text-xs text-muted">{p.template}</code>
                  </button>
                ))}
              </div>
            </div>

            <Field label="Format" hint="Type fixed text like / or -, and add tokens for the parts that change.">
              {(id) => (
                <Input
                  id={id}
                  ref={templateRef}
                  value={draft.template}
                  onChange={(e) => set("template", e.target.value.toUpperCase())}
                  spellCheck={false}
                  className="font-mono tracking-wide"
                  aria-invalid={!valid}
                />
              )}
            </Field>
            {/* On narrow screens the full preview sits far below, so echo the result next to the input. */}
            <p className="-mt-3 text-sm lg:hidden" aria-hidden>
              {valid ? (
                <>
                  <span className="text-muted">Next number: </span>
                  <code className="font-semibold">{samples[0]?.number}</code>
                </>
              ) : (
                <span className="text-danger">{errors[0]}</span>
              )}
            </p>

            <div>
              <p className="text-sm font-medium">Add a token</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TOKENS.map((t) => (
                  <button
                    key={t.token}
                    type="button"
                    onClick={() => insertToken(t.token)}
                    title={t.help}
                    className="rounded-md bg-background px-2 py-1 text-xs ring-1 ring-line hover:ring-teal/50"
                    aria-label={`Insert ${t.label}`}
                  >
                    <code className="font-semibold text-teal-dark">{t.token}</code>{" "}
                    <span className="text-muted">{t.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                Change the digits in <code>{"{SEQ:6}"}</code> to set the running number&apos;s length (3–9).
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prefix text" hint="Used wherever {PREFIX} appears.">
                {(id) => (
                  <Input
                    id={id}
                    value={draft.prefix}
                    maxLength={8}
                    onChange={(e) => set("prefix", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    className="uppercase"
                  />
                )}
              </Field>
              <Field label="First number" hint="Moving from paper? Continue from your last card number plus one.">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    min={1}
                    value={Number.isFinite(draft.startAt) ? draft.startAt : ""}
                    onChange={(e) => set("startAt", e.target.value === "" ? NaN : Number(e.target.value))}
                    className="tabular-nums"
                  />
                )}
              </Field>
            </div>
          </Card>

          <Card className="space-y-5 p-5">
            <fieldset>
              <legend className="text-sm font-medium">Counting</legend>
              <div className="mt-2 space-y-2">
                {SCOPES.map((s) => (
                  <label
                    key={s.value}
                    className={clsx(
                      "flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 text-sm",
                      draft.scope === s.value ? "border-teal bg-teal-soft/50" : "border-line hover:border-teal/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={draft.scope === s.value}
                      onChange={() => set("scope", s.value)}
                      className="mt-0.5 size-4 accent-teal"
                    />
                    <span>
                      <span className="block font-medium">{s.label}</span>
                      <span className="block text-muted">{s.help}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Field label="Restart the running number" hint="Restarting needs the year (and month) in the format.">
              {(id) => (
                <Select id={id} value={draft.reset} onChange={(e) => set("reset", e.target.value as ResetRule)}>
                  <option value="never">Never</option>
                  <option value="yearly">Every year, on 1 January</option>
                  <option value="monthly">Every month</option>
                </Select>
              )}
            </Field>

            <div className="flex items-start justify-between gap-4 rounded-lg bg-background p-3">
              <div className="text-sm">
                <p id="legacy-label" className="font-medium">
                  Keep old card numbers
                </p>
                <p className="text-muted">
                  Records clerks can enter a patient&apos;s paper card number. It&apos;s stored beside the new number
                  and can be searched.
                </p>
              </div>
              <Switch
                checked={draft.keepLegacyNumber}
                onChange={(v) => set("keepLegacyNumber", v)}
                label="Keep old card numbers"
              />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-5 lg:sticky lg:top-24" aria-live="polite">
            <h2 className="font-display font-semibold">Preview</h2>
            {valid ? (
              <>
                <p className="mt-3 text-xs text-muted">Next patient number</p>
                <p
                  className="font-mono text-3xl font-semibold tracking-wide break-all text-navy"
                  data-testid="next-number"
                >
                  {samples[0]?.number ?? "—"}
                </p>
                <ol className="mt-4 divide-y divide-line text-sm" aria-label="Example numbers">
                  {samples.map((r) => (
                    <li key={r.label} className="flex items-start justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block">{r.label}</span>
                        <span className="block text-xs text-muted">
                          {r.branchName} · {r.category.name}
                        </span>
                      </span>
                      <code className="shrink-0 font-semibold">{r.number}</code>
                    </li>
                  ))}
                </ol>
                {digits && (
                  <p className="mt-3 flex gap-2 text-xs text-muted">
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                    Room for {(10 ** digits - 1).toLocaleString("en-GB")} patients
                    {draft.scope === "branch" ? " per branch" : draft.scope === "category" ? " per category" : ""}
                    {draft.reset === "yearly" ? " each year" : draft.reset === "monthly" ? " each month" : ""} before
                    numbers get longer.
                  </p>
                )}
              </>
            ) : (
              <ul className="mt-3 space-y-2" aria-label="Problems with this format">
                {errors.map((e) => (
                  <li key={e} className="flex gap-2 text-sm text-danger">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {e}
                  </li>
                ))}
              </ul>
            )}

            {draft.scope === "category" && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-xs text-muted">
                  Category codes, set under{" "}
                  <Link href="/admin/forms" className="underline">
                    Registration forms
                  </Link>
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {activeCategories.map((c) => (
                    <Badge key={c.code}>
                      {c.code} · {c.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
              Receipt, invoice and visit numbers will use the same engine when Cash Point and Patient Flow arrive.
            </p>
          </Card>
        </div>
      </div>

      {dirty && (
        <SaveBar
          onDiscard={() => setDraft(toDraft(saved))}
          onSave={() => (valid ? (saved.configured ? setConfirming(true) : commit()) : templateRef.current?.focus())}
          saveLabel="Save format"
        >
          {valid
            ? saved.configured
              ? "Unsaved changes"
              : "Format not saved yet"
            : `${errors.length} to fix before saving`}
        </SaveBar>
      )}

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Change the patient number format?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={commit}>Change format</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-background p-3 font-mono">
            <span className="text-muted line-through">{example(toDraft(saved))}</span>
            <span aria-hidden>→</span>
            <span className="font-semibold">{example(draft)}</span>
          </div>
          <p className="text-muted">
            Patients already registered keep their numbers. Only new registrations get the new format.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
