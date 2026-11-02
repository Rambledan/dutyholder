import Link from "next/link";
import { Suspense } from "react";
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
        <Link href="/demo" className="font-medium text-foreground underline-offset-4 hover:underline">
          Watch the demo videos
        </Link>
      </p>
    </>
  );
}
