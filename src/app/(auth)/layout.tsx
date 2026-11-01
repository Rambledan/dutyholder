// Shared frame for the login, sign-up and two-factor screens.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center text-sm font-medium tracking-wide text-muted-foreground">
          Dutyholder
        </p>
        {children}
        <p className="mt-6 text-center text-sm">
          <a href="/help" className="text-muted-foreground hover:underline">Help with signing in</a>
        </p>
      </div>
    </main>
  );
}
