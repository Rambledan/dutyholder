import Link from "next/link";
import { AppFrame } from "@/components/nav/app-frame";
import { HelpBrowser } from "@/components/help/help-browser";

export const metadata = { title: "Help · Dutyholder" };

// Open to everyone, signed in or not, so people can read about two-factor
// and invites before they have an account.
export default function HelpPage() {
  return (
    <AppFrame open>
      <Link href="/" className="mb-4 inline-block text-sm text-muted-foreground hover:underline">← Back</Link>
      <header className="mb-6 space-y-1">
        <h1 className="text-4xl font-medium tracking-[-0.03em] sm:text-[44px] sm:leading-[48px]">Help</h1>
        <p className="text-muted-foreground">
          How Dutyholder works, what the law asks of each role, and what the technical terms mean. Look for the ⓘ and ?
          marks around the app: they link here.
        </p>
        <p className="text-sm text-muted-foreground">General guidance for using the app, not legal advice.</p>
      </header>
      <HelpBrowser />
    </AppFrame>
  );
}
