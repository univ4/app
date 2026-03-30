import Link from "next/link";
import { redirect } from "next/navigation";

import { ChatInterface } from "@/components/chat/ChatInterface";
import { DisclaimerBanner } from "@/components/common/DisclaimerBanner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground break-words sm:text-2xl">
              AI 요강 챗봇
            </h1>
            <p className="text-muted-foreground text-sm break-words">
              /dashboard/chat — P1-1 · 전형계획·정시 청크 RAG (`guideline_chunks`)
            </p>
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        <div className="mb-4">
          <DisclaimerBanner variant="ai" />
        </div>
        <ChatInterface />
      </div>
    </div>
  );
}
