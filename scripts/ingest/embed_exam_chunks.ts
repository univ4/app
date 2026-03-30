/**
 * 논술/면접 기출 Markdown → OpenAI 임베딩 → exam_chunks (pgvector)
 *
 * @see docs/01_PRD_v2.md P2-4 · supabase/migrations/20260330280000_exam_chunks.sql
 *
 * 입력: 프로젝트 루트 `record/exam/*.md` (UTF-8)
 * 각 파일 상단 YAML frontmatter 예:
 *   ---
 *   univ_name: "연세대"
 *   year: 2026
 *   exam_type: "논술"
 *   dept_name: "공학계열"
 *   source_file: "yonsei_2026_nonsul.pdf"
 *   ---
 *
 * 실행(환경 변수 로드 후):
 *   ./node_modules/.bin/tsx scripts/ingest/embed_exam_chunks.ts
 *
 * 실제 PDF 파싱·청킹 로직은 데이터 확보 후 `embed_and_store.ts` 패턴으로 확장한다.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const EXAM_DIR = path.join(process.cwd(), "record", "exam");

function getEnvUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  if (!url.trim()) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_URL 이 필요합니다.",
    );
  }
  return url.trim();
}

function getServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!key.trim()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  }
  return key.trim();
}

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY ?? "";
  if (!key.trim()) throw new Error("OPENAI_API_KEY 가 필요합니다.");
  return key.trim();
}

const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";

/** frontmatter 파싱 (embed_and_store.ts 와 동일 패턴) */
function splitFrontmatter(md: string): {
  body: string;
  meta: Record<string, string>;
} {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { body: md, meta: {} };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z0-9_]+)\s*:\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { body: m[2], meta };
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = getOpenAIKey();
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `OpenAI embeddings ${res.status}: ${JSON.stringify(json).slice(0, 400)}`,
    );
  }
  const data = json as {
    data?: Array<{ embedding: number[] }>;
  };
  const out = data.data?.map((d) => d.embedding) ?? [];
  if (out.length !== texts.length) {
    throw new Error("임베딩 응답 개수가 입력과 일치하지 않습니다.");
  }
  return out;
}

async function main(): Promise<void> {
  let files: string[];
  try {
    files = (await readdir(EXAM_DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    console.warn(
      `[embed_exam_chunks] ${EXAM_DIR} 가 없거나 읽을 수 없습니다. 폴더를 만든 뒤 MD를 넣어 주세요.`,
    );
    return;
  }

  if (files.length === 0) {
    console.warn(
      "[embed_exam_chunks] record/exam/*.md 파일이 없습니다. 샘플 MD를 추가한 뒤 다시 실행하세요.",
    );
    return;
  }

  const supabase = createClient(getEnvUrl(), getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const file of files) {
    const full = path.join(EXAM_DIR, file);
    const raw = await readFile(full, "utf8");
    const { body, meta } = splitFrontmatter(raw);
    const univName = meta.univ_name?.trim();
    const year = meta.year ? Number(meta.year) : NaN;
    const examType = meta.exam_type?.trim();
    if (!univName || !Number.isFinite(year) || (examType !== "논술" && examType !== "면접")) {
      console.warn(
        `[embed_exam_chunks] 건너뜀 (frontmatter: univ_name, year, exam_type 필수): ${file}`,
      );
      continue;
    }

    const chunkText = body.trim();
    if (chunkText.length < 10) {
      console.warn(`[embed_exam_chunks] 본문이 너무 짧음: ${file}`);
      continue;
    }

    const deptName = meta.dept_name?.trim() || null;
    const [embedding] = await embedTexts([chunkText]);

    const metadata = {
      source_file: meta.source_file?.trim() || file,
      page_section: meta.page_section?.trim() || "",
      citation_hint: meta.citation_hint?.trim() || "",
    };

    const { error } = await supabase.from("exam_chunks").insert({
      exam_type: examType,
      univ_name: univName,
      year,
      dept_name: deptName,
      chunk_text: chunkText,
      embedding,
      metadata,
    });

    if (error) {
      console.error(`[embed_exam_chunks] insert 실패 ${file}:`, error.message);
    } else {
      console.log(`[embed_exam_chunks] 적재 완료: ${file}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
