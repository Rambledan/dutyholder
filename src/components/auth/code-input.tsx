import { Input } from "@/components/ui/input";

// A 6-digit authenticator code box that brings up the number pad on phones.
export function CodeInput(props: { value: string; onChange: (value: string) => void; id?: string }) {
  return (
    <Input
      id={props.id ?? "code"}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      required
      autoFocus
      placeholder="123456"
      className="text-center font-mono text-lg tracking-[0.4em]"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
    />
  );
}
