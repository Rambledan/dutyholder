import { Suspense } from "react";
import { AppSidebar } from "./app-sidebar";

// Signed-in layout: the sidebar panel on the left, the page on the canvas.
// `open` is for pages anyone may visit (help, demo): visitors who are not
// fully signed in get the page without the sidebar.
export function AppFrame(props: { children: React.ReactNode; width?: "default" | "wide"; open?: boolean }) {
  return (
    <div className="flex min-h-full w-full flex-1 flex-col gap-4 p-3 sm:p-4 lg:flex-row">
      <Suspense fallback={<SidebarPlaceholder />}>
        <AppSidebar optional={props.open} />
      </Suspense>
      <main className={`mx-auto w-full min-w-0 flex-1 px-1 py-4 sm:px-4 lg:py-6 ${props.width === "wide" ? "max-w-6xl" : "max-w-4xl"}`}>
        {props.children}
      </main>
    </div>
  );
}

function SidebarPlaceholder() {
  return <div aria-hidden className="h-16 shrink-0 rounded-3xl border border-border bg-card lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)] lg:w-68" />;
}
