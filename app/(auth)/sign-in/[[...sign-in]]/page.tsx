import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-start justify-center px-4 pt-32 sm:pt-36 lg:pt-40">
      <Suspense fallback={<div>Loading sign in...</div>}>
        <SignIn forceRedirectUrl="/redirect" />
      </Suspense>
    </main>
  );
}