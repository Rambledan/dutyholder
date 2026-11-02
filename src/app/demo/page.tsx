import Link from "next/link";

export const metadata = { title: "Demo videos · Dutyholder" };

const VIDEOS = [
  {
    id: "project-setup",
    title: "Setting up a project",
    audience: "For principal designers",
    length: "1:21",
    summary:
      "Alex Morgan, a principal designer, sets up “The Old Mill”. A few scoping questions decide which duties apply to whom, then the team is added under their statutory roles and Dutyholder builds everyone's checklist.",
    steps: [
      "Create an account from the invite",
      "Two-factor login and recovery codes",
      "New project and scoping questions",
      "Add the team and send invites",
      "Checklists and the progress dashboard",
    ],
  },
  {
    id: "dutyholder-tasks",
    title: "Your Part 2A duties",
    audience: "For designers, contractors and clients",
    length: "1:27",
    summary:
      "Tom Ellis, a structural designer, is invited to the same project. He signs up, acknowledges his duties, submits a competence statement with evidence, and saves it to reuse next time.",
    steps: [
      "The invite email and account set-up",
      "Your task list",
      "Read and sign each duty",
      "Competence statement and evidence",
      "Done, and reusable on the next project",
    ],
  },
];

// Open to everyone, signed in or not. The videos are static files in
// public/demo, rendered from the Videowright project in videos/.
export default function DemoPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <Link href="/" className="mb-4 inline-block text-sm text-muted-foreground hover:underline">← Back</Link>
      <header className="mb-10 space-y-2">
        <h1 className="text-2xl font-semibold">Demo videos</h1>
        <p className="max-w-2xl text-muted-foreground">
          Real screens from Dutyholder. A principal designer sets up a project, then an invited designer completes
          their duties under Part 2A of the Building Regulations.
        </p>
      </header>
      <div className="space-y-14">
        {VIDEOS.map((v) => (
          <section key={v.id} id={v.id} aria-labelledby={`${v.id}-title`} className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 id={`${v.id}-title`} className="text-xl font-semibold">{v.title}</h2>
              <p className="text-sm text-muted-foreground tabular-nums">{v.audience} · {v.length}</p>
            </div>
            <video controls playsInline preload="metadata" poster={`/demo/${v.id}.jpg`} src={`/demo/${v.id}.mp4`}
              className="aspect-video w-full rounded-xl border bg-black" />
            <div className="grid gap-6 sm:grid-cols-2">
              <p className="text-sm text-muted-foreground">{v.summary}</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {v.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
            </div>
          </section>
        ))}
      </div>
      <p className="mt-14 border-t pt-4 text-sm text-muted-foreground">
        The people, firms and project shown are fictional. The videos have no narration yet.
      </p>
    </main>
  );
}
