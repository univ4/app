import { redirect } from "next/navigation";

import { completeOnboarding } from "@/app/onboarding/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { TARGET_UNIVERSITY_GROUPS } from "@/lib/onboarding/targetUniversityGroups";

const TARGET_MAJORS = ["이공계", "인문계"] as const;

type OnboardingPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = searchParams ? await searchParams : {};
  const errorMessage = params.error ? decodeURIComponent(params.error) : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (student) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>초기 정보 입력</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {errorMessage}
            </p>
          ) : null}
          <Form action={completeOnboarding} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="display_name" className="text-sm font-medium">
                이름
              </label>
              <Input id="display_name" name="display_name" required />
            </div>

            <div className="space-y-2">
              <label htmlFor="school_name" className="text-sm font-medium">
                고등학교명
              </label>
              <Input id="school_name" name="school_name" />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">목표 대학</p>
              <p className="text-xs text-muted-foreground">
                복수 선택 가능합니다. 스크롤하여 전체 목록을 확인하세요.
              </p>
              <div className="max-h-[min(28rem,55vh)] space-y-4 overflow-y-auto rounded-md border border-gray-200 bg-white p-3 pr-2">
                {TARGET_UNIVERSITY_GROUPS.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="text-xs font-semibold text-gray-700">{group.label}</p>
                      {group.note ? (
                        <span className="text-[11px] text-muted-foreground">{group.note}</span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                      {group.universities.map((university) => (
                        <label
                          key={`${group.label}-${university}`}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            name="target_universities"
                            value={university}
                            className="h-4 w-4 shrink-0"
                          />
                          <span>{university}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">목표 계열</p>
              <div className="space-y-2">
                {TARGET_MAJORS.map((major) => (
                  <label key={major} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="target_major"
                      value={major}
                      className="h-4 w-4"
                      required
                    />
                    {major}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              저장하고 시작하기
            </button>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
