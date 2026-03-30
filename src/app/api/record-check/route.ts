import { NextResponse, type NextRequest } from "next/server";

import { loadRecordGapAnalysisForStudent } from "@/lib/record-check/recordGapFromDb";
import { getStudentRecordRequestContext } from "@/lib/student-record/recordStudentContext";

export async function GET(request: NextRequest) {
  const ctx = await getStudentRecordRequestContext(request);
  if (!ctx.ok) return ctx.response;

  const loaded = await loadRecordGapAnalysisForStudent(ctx.supabase, ctx.recordStudentId);
  if (!loaded.ok) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: loaded.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: {
      items: loaded.data.items,
      overallScore: loaded.data.overallScore,
      criticalCount: loaded.data.criticalCount,
      targetUnivType: loaded.targetUnivType,
    },
    error: null,
  });
}
