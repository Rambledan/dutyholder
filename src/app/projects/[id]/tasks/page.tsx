import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { PageShell } from "@/components/projects/page-shell";
import { ProgressBar } from "@/components/tasks/progress-bar";
import { requireAal2 } from "@/lib/auth/server";
import { ITEM_TYPE_LABELS, STATUS_LABELS, rag } from "@/lib/labels";
import { loadMyTasks, nextTask, progress } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export const metadata = { title: "Your tasks · Dutyholder" };

export default function TasksPage(props: PageProps<"/projects/[id]/tasks">) {
  return (
    <PageShell back={{ href: "/", label: "Projects" }}>
      <Tasks params={props.params} />
    </PageShell>
  );
}

const RAG_DOT = { red: "bg-red-500", amber: "bg-amber-500", green: "bg-green-600" };

async function Tasks({ params }: { params: PageProps<"/projects/[id]/tasks">["params"] }) {
  const { supabase, userId } = await requireAal2();
  const { id } = await params;

  const [{ data: project }, { tasks }] = await Promise.all([
    supabase.from("projects").select("id, name, address").eq("id", id).maybeSingle(),
    loadMyTasks(supabase, id, userId),
  ]);
  if (!project) notFound();

  const { done, total } = progress(tasks);
  const next = nextTask(tasks);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{project.name}</p>
        <h1 className="text-2xl font-semibold">Your tasks</h1>
        <p className="text-sm text-muted-foreground">
          Your duties on this project under Part 2A of the Building Regulations. Most take a minute or two; the
          competence statement takes longest. Everything saves as you go.
        </p>
      </header>

      <ProgressBar done={done} total={total} />

      {next ? (
        <Link href={`/projects/${id}/tasks/${next.id}`} className={cn(buttonVariants({ size: "lg" }), "h-auto min-h-10 w-full whitespace-normal py-2 text-left sm:w-auto")}>
          {done === 0 ? "Start" : "Continue"}: {next.title}
        </Link>
      ) : total > 0 ? (
        <p className="rounded-lg border bg-green-50 p-4 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
          You&apos;re done for now. You&apos;ll hear from the project team if anything else is needed.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">You have no tasks on this project.</p>
      )}

      <ul className="divide-y rounded-lg border">
        {tasks.map((t) => {
          const inner = (
            <>
              <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", RAG_DOT[rag(t.status)])} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{t.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {t.legalReference} · {ITEM_TYPE_LABELS[t.itemType]} ·{" "}
                  {t.available ? STATUS_LABELS[t.status] : "Available in the next release"}
                </span>
              </span>
            </>
          );
          return (
            <li key={t.id}>
              {t.available ? (
                <Link href={`/projects/${id}/tasks/${t.id}`} className="flex gap-3 p-4 text-sm hover:bg-muted/50">{inner}</Link>
              ) : (
                <div className="flex gap-3 p-4 text-sm opacity-60">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>

      <Link href={`/projects/${id}`} className="inline-block text-sm text-muted-foreground hover:underline">
        Project details and team
      </Link>
    </div>
  );
}
