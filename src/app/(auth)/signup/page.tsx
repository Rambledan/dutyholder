import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Accept invite · Dutyholder" };

export default function SignupPage(props: PageProps<"/signup">) {
  return (
    <Suspense>
      <InviteCheck searchParams={props.searchParams} />
    </Suspense>
  );
}

async function InviteCheck({ searchParams }: { searchParams: PageProps<"/signup">["searchParams"] }) {
  const { token } = await searchParams;
  const inviteToken = typeof token === "string" ? token : "";

  let email: string | null = null;
  if (inviteToken) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("check_invite", { p_token: inviteToken });
    email = typeof data === "string" ? data : null;
  }

  if (!email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>This invite link doesn&apos;t work</CardTitle>
          <CardDescription>
            It may have expired (links last 7 days), already been used, or been copied incompletely.
            Ask the person who invited you to send a new one.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    );
  }

  return <SignupForm email={email} token={inviteToken} />;
}
