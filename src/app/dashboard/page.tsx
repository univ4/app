import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  async function logout() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const email = user.email ?? "사용자";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-black">안녕하세요, {email}님</h1>
          <form action={logout}>
            <Button type="submit" className="w-auto px-4">
              로그아웃
            </Button>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link href="/dashboard/scores" className="block">
            <Card>
              <CardHeader>
                <CardTitle>성적 관리</CardTitle>
                <CardDescription>
                  모의고사 및 내신 성적 입력 및 추이 확인
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/analysis" className="block">
            <Card>
              <CardHeader>
                <CardTitle>합격 가능성</CardTitle>
                <CardDescription>
                  서성한 이공계 합격 가능성 분석
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/chat" className="block">
            <Card>
              <CardHeader>
                <CardTitle>AI 요강 챗봇</CardTitle>
                <CardDescription>대학 요강 질의응답</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/calendar" className="block">
            <Card>
              <CardHeader>
                <CardTitle>입시 캘린더</CardTitle>
                <CardDescription>전형 일정 확인</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
