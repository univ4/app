import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { HelpPage } from "@/components/help/HelpPage";

export const metadata: Metadata = { title: "도움말" };

export default async function DashboardHelpPage() {
  const manualPath = path.join(process.cwd(), "docs/08_USER_MANUAL.md");
  const manualContent = await readFile(manualPath, "utf8");

  return (
    <div className="min-h-screen bg-background">
      <HelpPage manualContent={manualContent} />
    </div>
  );
}
