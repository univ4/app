"use client";

import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { login } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "로그인 중..." : "로그인"}
    </Button>
  );
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
          <CardDescription>이메일과 비밀번호로 로그인하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form action={login}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                이메일
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="********"
                required
              />
            </div>

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <SubmitButton />
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
