"use client";

import { startTransition, type FormEvent } from "react";

// React resets a form after its `action` finishes, which would wipe what
// someone typed when the server refuses it. Submitting through this keeps
// their text on the screen. Use as onSubmit={keepFormValues(formAction)}.
export function keepFormValues(action: (formData: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(e.currentTarget, submitter);
    startTransition(() => action(formData));
  };
}
