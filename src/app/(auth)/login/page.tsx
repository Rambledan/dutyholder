import { Suspense } from "react";
import { DEMO_VIDEOS_URL } from "@/lib/links";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Dutyholder" };

export default function LoginPage() {
  return (
    <>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        New to Dutyholder?{" "}
        <a href={DEMO_VIDEOS_URL} target="_blank" rel="noopener noreferrer"
          className="font-medium text-foreground underline-offset-4 hover:underline">
          Watch the demo videos
        </a>
      </p>
    </>
  );
}
