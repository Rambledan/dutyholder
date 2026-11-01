"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/auth/form-error";
import { YesNo } from "@/components/projects/yes-no";
import {
  saveCompetence, startCompetenceRevision, submitCompetence, type CompetenceFields,
} from "@/app/projects/task-actions";
import { FileList, type FileRow } from "./file-list";
import { FileUploader } from "./file-uploader";
import { SaveStatus, useAutosave } from "./use-autosave";
import { Term } from "@/components/help/term";

export type Statement = CompetenceFields & { version: number; submittedAt: string | null; files: FileRow[] };

export const EMPTY_FIELDS: CompetenceFields = {
  skills: "",
  knowledge: "",
  experience: "",
  behaviour_compliance: "",
  behaviour_cooperation: "",
  behaviour_limits: "",
  organisational_capability: "",
  has_serious_sanctions: null,
  sanctions_details: "",
};

// Reg 11F asks for skills, knowledge, experience and behaviours. Reg 11Q(4)
// spells out the behaviours, so each gets its own specific prompt.
const QUESTIONS: { key: keyof CompetenceFields; label: string; hint: string; group: string }[] = [
  { group: "Skills, knowledge and experience", key: "skills", label: "What skills do you bring to this work?",
    hint: "For example design or analysis methods, software, site inspection, coordination." },
  { group: "Skills, knowledge and experience", key: "knowledge",
    label: "What do you know about the Building Regulations and standards that apply to your work?",
    hint: "For example the relevant Approved Documents, British Standards or Eurocodes, recent CPD." },
  { group: "Skills, knowledge and experience", key: "experience", label: "What comparable projects have you worked on?",
    hint: "Building type and size, your role, and when." },
  { group: "Behaviours (reg 11Q(4))", key: "behaviour_compliance",
    label: "What would you do if asked to carry out work that wouldn't comply with the Building Regulations?",
    hint: "The law expects you to refuse such work. Describe how you would handle it." },
  { group: "Behaviours (reg 11Q(4))", key: "behaviour_cooperation",
    label: "How do you cooperate and share information with others on a project?",
    hint: "For example design coordination meetings, sharing drawings, responding to queries." },
  { group: "Behaviours (reg 11Q(4))", key: "behaviour_limits",
    label: "How do you make sure you don't take on work beyond your competence?",
    hint: "For example how you check scope at appointment, and when you'd bring in a specialist." },
];

export function CompetenceForm(props: {
  projectId: string;
  itemId: string;
  userId: string;
  isFirm: boolean;
  isHigherRisk: boolean;
  draft: Statement | null;
  latestSubmitted: Statement | null;
  nextHref: string;
  // After "needs more info", the old version can't be reused as it is.
  mustRevise?: boolean;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<CompetenceFields>(props.draft ?? EMPTY_FIELDS);
  const [files, setFiles] = useState<FileRow[]>(props.draft?.files ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const save = useCallback((value: CompetenceFields) => saveCompetence(value), []);
  // Never autosave on the "reuse your statement" choice (there's nothing being
  // edited), or once the statement has been submitted.
  const reuseChoice = !props.draft && Boolean(props.latestSubmitted);
  const autosave = useAutosave(fields, save, !reuseChoice && !submitted);

  const set = <K extends keyof CompetenceFields>(key: K, value: CompetenceFields[K]) =>
    setFields((f) => ({ ...f, [key]: value }));

  async function run(action: () => Promise<{ error: string | null; next?: string }>, after: (next?: string) => void) {
    setBusy(true);
    setError(null);
    const result = await action();
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    after(result.next);
  }

  // Already submitted a statement elsewhere: offer to reuse it.
  if (reuseChoice && props.latestSubmitted) {
    const s = props.latestSubmitted;
    return (
      <div className="space-y-4">
        <FormError message={error} />
        <p className="text-sm">
          You submitted a competence statement (version {s.version}
          {s.submittedAt && `, ${new Date(s.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
          ) with {s.files.length} evidence file{s.files.length === 1 ? "" : "s"}.{" "}
          {props.mustRevise ? "Update it to answer the request above." : "You can use it for this project as it is, or update it first."}
        </p>
        <StatementView statement={s} isFirm={props.isFirm} projectId={props.projectId} />
        <div className="flex flex-col gap-2 sm:flex-row">
          {!props.mustRevise && (
            <Button size="lg" disabled={busy}
              onClick={() => run(() => submitCompetence(props.projectId, props.itemId), (next) => router.push(next ?? props.nextHref))}>
              Use it for this project
            </Button>
          )}
          <Button size="lg" variant="outline" disabled={busy}
            onClick={() => run(() => startCompetenceRevision(props.projectId), () => router.refresh())}>
            Update it first
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FormError message={error} />
      <p className="text-sm text-muted-foreground">
        This statement belongs to you, not the project, so you can reuse it next time. It saves as you type; you can
        leave and come back.
      </p>

      {QUESTIONS.map((q, i) => {
        const heading = i === 0 || QUESTIONS[i - 1].group !== q.group ? q.group : null;
        return (
          <div key={q.key} className="space-y-2">
            {heading && (
              <h3 className="pt-2 text-base font-semibold">
                <Term id={heading.startsWith("Behaviours") ? "behaviours" : "competence"}>{heading}</Term>
              </h3>
            )}
            <Label htmlFor={q.key}>{q.label}</Label>
            <p className="text-xs text-muted-foreground">{q.hint}</p>
            <Textarea id={q.key} rows={4} className="text-base" value={fields[q.key] as string}
              onChange={(e) => set(q.key, e.target.value as never)} />
          </div>
        );
      })}

      {props.isFirm && (
        <div className="space-y-2">
          <h3 className="pt-2 text-base font-semibold"><Term id="organisational-capability">Organisational capability</Term></h3>
          <Label htmlFor="organisational_capability">
            Describe your firm&apos;s capability to do this work in compliance with the regulations.
          </Label>
          <p className="text-xs text-muted-foreground">
            For example quality and compliance systems, supervision, training, and the people and resources available.
          </p>
          <Textarea id="organisational_capability" rows={4} className="text-base" value={fields.organisational_capability}
            onChange={(e) => set("organisational_capability", e.target.value)} />
        </div>
      )}

      {props.isHigherRisk && (
        <div className="space-y-2">
          <YesNo name="sanctions" legend="In the last 5 years, have you or your firm had a serious sanction relating to building work?"
            hint="Required for higher-risk building work (reg 11E(2))."
            value={fields.has_serious_sanctions ?? false}
            onChange={(v) => set("has_serious_sanctions", v)} />
          {fields.has_serious_sanctions && (
            <Textarea rows={3} className="text-base" placeholder="Give details" value={fields.sanctions_details}
              onChange={(e) => set("sanctions_details", e.target.value)} />
          )}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="pt-2 text-base font-semibold">Evidence</h3>
        <p className="text-sm text-muted-foreground">
          Qualifications, professional memberships, insurance certificates, examples of comparable projects.
        </p>
        <FileList projectId={props.projectId} files={files} canWithdraw
          onWithdrawn={(id) => setFiles((f) => f.filter((x) => x.id !== id))} />
        <FileUploader projectId={props.projectId} userId={props.userId}
          onUploaded={(f) => setFiles((prev) => [...prev, f])} />
      </div>

      <div className="space-y-2 border-t pt-4">
        <SaveStatus {...autosave} />
        <Button size="lg" className="w-full sm:w-auto" disabled={busy}
          onClick={() =>
            run(async () => {
              const saved = await saveCompetence(fields);
              return saved.error ? saved : submitCompetence(props.projectId, props.itemId);
            }, (next) => {
              setSubmitted(true);
              router.push(next ?? props.nextHref);
            })
          }>
          {busy ? "Submitting…" : "Submit for review"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Once submitted, this version is locked and <Term id="sha256">fingerprinted</Term>. Whoever appointed you will{" "}
          <Term id="review">review it</Term>.
        </p>
      </div>
    </div>
  );
}

// Read-only view of a statement and its evidence.
export function StatementView(props: { statement: Statement; isFirm: boolean; projectId: string }) {
  const s = props.statement;
  const rows = [
    ...QUESTIONS.map((q) => ({ label: q.label, value: s[q.key] as string })),
    ...(props.isFirm || s.organisational_capability
      ? [{ label: "Organisational capability", value: s.organisational_capability }]
      : []),
  ];
  return (
    <div className="space-y-4">
      <dl className="space-y-3 text-sm">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="whitespace-pre-line">{r.value || "—"}</dd>
          </div>
        ))}
      </dl>
      <div>
        <h4 className="mb-2 text-sm font-medium">Evidence</h4>
        <FileList projectId={props.projectId} files={s.files} canWithdraw={false} />
      </div>
    </div>
  );
}
