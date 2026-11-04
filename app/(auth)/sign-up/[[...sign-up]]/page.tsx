import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<div>Loading sign up...</div>}>
        <SignUp forceRedirectUrl="/redirect" />
      </Suspense>
    </main>
  );
}