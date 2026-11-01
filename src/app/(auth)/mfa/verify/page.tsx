import { Suspense } from "react";
import { VerifyForm } from "./verify-form";

export const metadata = { title: "Two-factor code · Dutyholder" };

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
