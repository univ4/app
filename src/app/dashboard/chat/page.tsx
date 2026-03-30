import { redirect } from "next/navigation";

import { ChatInterface } from "@/components/chat/ChatInterface";
import { DisclaimerBanner } from "@/components/common/DisclaimerBanner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6" data-testid="chat-page">
      <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col">
        <div className="mb-4">
          <PageHeader
            title="AI 요강 챗봇"
            description="/dashboard/chat — P1-1 · 전형계획·정시 청크 RAG (`guideline_chunks`)"
          />
        </div>

        <div className="mb-4">
          <DisclaimerBanner variant="ai" />
        </div>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <ChatInterface />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
