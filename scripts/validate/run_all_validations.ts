/**
 * admission_records, guideline_chunks, student_record_chunks 검증을 순서대로 실행하고
 * 오류 건수를 합산한다. 오류 > 0이면 exit code 1.
 *
 * 실행:
 *   set -a; source .env.local; set +a
 *   ./node_modules/.bin/tsx scripts/validate/run_all_validations.ts
 *
 * CI: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경 변수만으로 동작 가능.
 */

import { createServiceClient } from "./_shared.js";
import { validateAdmissionRecords } from "./validate_admission_records.js";
import { validateGuidelineChunks } from "./validate_guideline_chunks.js";
import { validateStudentRecordChunks } from "./validate_student_record_chunks.js";

async function main(): Promise<void> {
  const supabase = createServiceClient();

  let totalErrors = 0;
  let totalWarns = 0;

  const r1 = await validateAdmissionRecords(supabase);
  for (const line of r1.lines) console.log(line);
  totalErrors += r1.errorCount;
  totalWarns += r1.warnCount;
  console.log("");

  const r2 = await validateGuidelineChunks(supabase);
  for (const line of r2.lines) console.log(line);
  totalErrors += r2.errorCount;
  totalWarns += r2.warnCount;
  console.log("");

  const r3 = await validateStudentRecordChunks(supabase);
  for (const line of r3.lines) console.log(line);
  totalErrors += r3.errorCount;
  totalWarns += r3.warnCount;
  console.log("");

  console.log(
    `[RUN_ALL] 합계 — 오류: ${totalErrors}건, 경고: ${totalWarns}건 (오류 시 종료 코드 1)`,
  );

  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
