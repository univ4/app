import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인" };

function LoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
        aria-label="로딩 중"
      />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
