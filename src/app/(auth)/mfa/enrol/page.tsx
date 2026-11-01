import { Suspense } from "react";
import { EnrolForm } from "./enrol-form";

export const metadata = { title: "Set up two-factor · Dutyholder" };

export default function EnrolPage() {
  return (
    <Suspense>
      <EnrolForm />
    </Suspense>
  );
}
