/**
 * 전형계획 Markdown (GitHub Release) → OpenAI 임베딩 → guideline_chunks (pgvector)
 *
 * @see docs/01_PRD_v2.md §11.3, docs/05_AI_PIPELINE.md §2-2~2-4
 * @see docs/08_USER_MANUAL.md §12 (출처: 「대학명 N학년도 입학전형 시행계획」 + 섹션)
 *
 * 비공개 Release: GITHUB_TOKEN + fetchGithubReleaseAsset (browser_download_url 직접 금지)
 *
 * 실행:
 *   export $(cat .env.local | grep -v '^#' | xargs) && \
 *   ./node_modules/.bin/tsx scripts/ingest/embed_and_store.ts
 */

import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  fetchGithubReleaseBinary,
  listGithubReleaseAssets,
  type GithubReleaseAsset,
} from "./githubReleaseFetch";

const DATA_COLLECTOR_REPO = "univ4/data-collector";
const RELEASE_TAG = "v2026.1";

/**
 * v2026.1 Release Markdown 자산 (guideline_manifest.json 없음 → 하드코딩)
 * 전형계획: `{slug}_2027_plan.md`, 정시자료 4종: 파일명 고정
 */
const V2026_1_PLAN_SLUGS = [
  "snu",
  "yonsei",
  "korea_univ",
  "skku",
  "hanyang",
  "sogang",
  "cau",
  "kyunghee",
  "uos",
  "konkuk",
  "dongguk",
  "hongik_univ",
  "ajou",
  "sejong",
  "kwangwoon",
  "kookmin",
  "soongsil",
] as const;

/** 영문 slug → univ_name 메타데이터용 한글 대학명 */
const V2026_1_SLUG_TO_UNIV_NAME_KO: Record<
  (typeof V2026_1_PLAN_SLUGS)[number],
  string
> = {
  snu: "서울대",
  yonsei: "연세대",
  korea_univ: "고려대",
  skku: "성균관대",
  hanyang: "한양대",
  sogang: "서강대",
  cau: "중앙대",
  kyunghee: "경희대",
  uos: "서울시립대",
  konkuk: "건국대",
  dongguk: "동국대",
  hongik_univ: "홍익대",
  ajou: "아주대",
  sejong: "세종대",
  kwangwoon: "광운대",
  kookmin: "국민대",
  soongsil: "숭실대",
};

const V2026_1_JEONGSI_FILES: readonly {
  name: string;
  univ_name: string;
  year: number;
}[] = [
  {
    name: "jeongsi_seoul_2026.md",
    univ_name: "서울권 정시자료",
    year: 2026,
  },
  {
    name: "jeongsi_sudogwon_2026.md",
    univ_name: "수도권 정시자료",
    year: 2026,
  },
  {
    name: "jeongsi_jeonmundae_2026.md",
    univ_name: "전문대 정시자료",
    year: 2026,
  },
  {
    name: "jeongsi_chongron_2026.md",
    univ_name: "정시 총론",
    year: 2026,
  },
];

function buildHardcodedV2026FilePlans(): FilePlan[] {
  const plans: FilePlan[] = V2026_1_PLAN_SLUGS.map((slug) => ({
    name: `${slug}_2027_plan.md`,
    univ_name: V2026_1_SLUG_TO_UNIV_NAME_KO[slug],
    year: 2027,
    default_admission_type: "학생부종합" as AdmissionType,
  }));
  for (const j of V2026_1_JEONGSI_FILES) {
    plans.push({
      name: j.name,
      univ_name: j.univ_name,
      year: j.year,
      default_admission_type: "정시",
    });
  }
  return plans;
}

const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
const EMBED_BATCH_SIZE = 100;

/** PRD §2-2: ~1500 토큰 상한(한국어 가중), 표는 예외로 단일 청크 */
const MAX_CHUNK_CHARS = 5200;
const MIN_CHUNK_CHARS = 320;
const OVERLAP_CHARS = 280;

type AdmissionType =
  | "학생부교과"
  | "학생부종합"
  | "논술전형"
  | "정시";

const ADMISSION_TYPES: AdmissionType[] = [
  "학생부교과",
  "학생부종합",
  "논술전형",
  "정시",
];

type FilePlan = {
  name: string;
  univ_name: string;
  year: number;
  default_admission_type: AdmissionType;
};

type PreparedChunk = {
  text: string;
  page_section: string;
  admission_type: AdmissionType;
  is_table: boolean;
};

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

function parseAdmissionType(s: string | undefined): AdmissionType | null {
  if (!s) return null;
  const t = s.trim();
  return ADMISSION_TYPES.includes(t as AdmissionType)
    ? (t as AdmissionType)
    : null;
}

/** 최소 YAML frontmatter (univ_name, year, default_admission_type) */
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

function inferAdmissionTypeFromPath(
  sectionPath: string,
  fallback: AdmissionType,
): AdmissionType {
  const s = sectionPath;
  if (/논술\s*전형|논술전형|\(논술/.test(s)) return "논술전형";
  if (/(^|>|\s)정시(\s|전형|$)|정시\s*전형|\(정시\)/.test(s)) return "정시";
  if (/학생부\s*종합|학생부종합|학종/.test(s)) return "학생부종합";
  if (
    /학생부\s*교과|학생부교과|교과\s*전형|추천인재|지역균형|고른기회|실기/.test(
      s,
    )
  ) {
    return "학생부교과";
  }
  return fallback;
}

function isMarkdownTableLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.includes("|", 1);
}

function parseHeader(
  line: string,
): { level: number; title: string } | null {
  const m = line.match(/^(#{1,3})\s+(.+)$/);
  if (!m) return null;
  return { level: m[1].length, title: m[2].trim() };
}

/**
 * 헤더 기준 블록 + 표는 연속 `|` 라인을 하나의 청크로 유지 (PRD §11.3, §2-2)
 */
function buildRawBlocks(
  lines: string[],
): { text: string; page_section: string; is_table: boolean }[] {
  const out: { text: string; page_section: string; is_table: boolean }[] = [];
  const stack: { level: number; title: string }[] = [];
  let buf: string[] = [];
  let i = 0;

  const pathStr = () => stack.map((s) => s.title).join(" > ");

  const flushBuf = () => {
    if (buf.length === 0) return;
    const t = buf.join("\n").trim();
    if (t.length > 0) {
      out.push({ text: t, page_section: pathStr(), is_table: false });
    }
    buf = [];
  };

  while (i < lines.length) {
    const line = lines[i]!;
    const hdr = parseHeader(line);
    if (hdr) {
      flushBuf();
      while (stack.length && stack[stack.length - 1]!.level >= hdr.level) {
        stack.pop();
      }
      stack.push({ level: hdr.level, title: hdr.title });
      buf.push(line);
      i += 1;
      continue;
    }

    if (isMarkdownTableLine(line)) {
      flushBuf();
      const tbl: string[] = [];
      while (i < lines.length && isMarkdownTableLine(lines[i]!)) {
        tbl.push(lines[i]!);
        i += 1;
      }
      const t = tbl.join("\n").trim();
      if (t.length > 0) {
        out.push({ text: t, page_section: pathStr(), is_table: true });
      }
      continue;
    }

    buf.push(line);
    i += 1;
  }
  flushBuf();
  return out;
}

function splitOversizedProse(
  text: string,
  maxChars: number,
): string[] {
  if (text.length <= maxChars) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > maxChars) {
    const slice = rest.slice(0, maxChars);
    const breakAt = Math.max(
      slice.lastIndexOf("\n\n"),
      slice.lastIndexOf("\n"),
      Math.floor(maxChars * 0.85),
    );
    const cut = breakAt > 100 ? breakAt : maxChars;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest.length > 0) parts.push(rest);
  return parts;
}

function mergeSmallChunks(
  items: PreparedChunk[],
  minChars: number,
): PreparedChunk[] {
  const merged: PreparedChunk[] = [];
  for (const c of items) {
    if (c.is_table) {
      merged.push(c);
      continue;
    }
    const last = merged[merged.length - 1];
    if (
      last &&
      !last.is_table &&
      last.text.length < minChars &&
      last.admission_type === c.admission_type &&
      last.page_section === c.page_section
    ) {
      last.text = `${last.text}\n\n${c.text}`;
    } else {
      merged.push({ ...c });
    }
  }
  return merged;
}

function applyOverlap(
  chunks: PreparedChunk[],
  overlap: number,
): PreparedChunk[] {
  if (overlap <= 0) return chunks;
  let prevTail = "";
  return chunks.map((c, idx) => {
    if (c.is_table) {
      prevTail = "";
      return c;
    }
    let text = c.text;
    if (idx > 0 && prevTail.length > 0) {
      text = `${prevTail}\n\n${text}`;
    }
    const next = { ...c, text };
    prevTail =
      c.is_table || text.length <= overlap
        ? ""
        : text.slice(Math.max(0, text.length - overlap));
    return next;
  });
}

function chunkMarkdown(
  body: string,
  plan: FilePlan,
): PreparedChunk[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const raw = buildRawBlocks(lines);
  let prepared: PreparedChunk[] = raw.map((b) => ({
    text: b.text,
    page_section: b.page_section || "(본문)",
    admission_type: inferAdmissionTypeFromPath(
      b.page_section,
      plan.default_admission_type,
    ),
    is_table: b.is_table,
  }));

  prepared = prepared.flatMap((c) => {
    if (c.is_table || c.text.length <= MAX_CHUNK_CHARS) return [c];
    return splitOversizedProse(c.text, MAX_CHUNK_CHARS).map((t) => ({
      ...c,
      text: t,
      is_table: false,
    }));
  });

  prepared = mergeSmallChunks(prepared, MIN_CHUNK_CHARS);
  prepared = applyOverlap(prepared, OVERLAP_CHARS);
  return prepared;
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

async function loadExistingContentHashes(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const set = new Set<string>();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("guideline_chunks")
      .select("metadata")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      const m = row.metadata as Record<string, unknown> | null;
      const h = m?.content_sha256;
      if (typeof h === "string" && h.length > 0) set.add(h);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return set;
}

async function embedOpenAI(texts: string[]): Promise<number[][]> {
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
    const msg =
      json &&
      typeof json === "object" &&
      "error" in json &&
      (json as { error?: { message?: string } }).error?.message;
    throw new Error(
      `OpenAI embeddings ${res.status}: ${msg || JSON.stringify(json).slice(0, 400)}`,
    );
  }
  if (
    !json ||
    typeof json !== "object" ||
    !("data" in json) ||
    !Array.isArray((json as { data: unknown }).data)
  ) {
    throw new Error("OpenAI embeddings 응답 형식 오류");
  }
  const arr = (json as { data: { embedding: number[]; index: number }[] })
    .data;
  arr.sort((a, b) => a.index - b.index);
  return arr.map((d) => d.embedding);
}

type InsertRow = {
  university_name: string;
  admission_year: number;
  admission_type: AdmissionType;
  chunk_text: string;
  embedding: number[];
  metadata: Record<string, unknown>;
};

async function insertChunkRows(
  supabase: SupabaseClient,
  rows: InsertRow[],
): Promise<{ ok: number; fail: number }> {
  if (rows.length === 0) return { ok: 0, fail: 0 };
  const { error } = await supabase.from("guideline_chunks").insert(rows);
  if (!error) return { ok: rows.length, fail: 0 };

  console.error(
    `[embed] 배치 insert 실패 (${rows.length}건), 건별 재시도: ${error.message}`,
  );
  let ok = 0;
  let fail = 0;
  for (const row of rows) {
    const { error: e } = await supabase.from("guideline_chunks").insert([row]);
    if (e) {
      fail += 1;
      console.error(
        `[embed] skip insert: ${e.message} | university=${row.university_name} section=${row.metadata.page_section}`,
      );
    } else {
      ok += 1;
    }
  }
  return { ok, fail };
}

function resolveFilePlans(
  assetByName: Map<string, GithubReleaseAsset>,
): FilePlan[] {
  if (RELEASE_TAG !== "v2026.1") {
    throw new Error(
      `[embed] RELEASE_TAG=${RELEASE_TAG} 에 대한 파일 매핑이 없습니다. embed_and_store.ts 의 하드코딩 목록을 갱신하세요.`,
    );
  }
  const plans = buildHardcodedV2026FilePlans();
  const missing = plans.filter((p) => !assetByName.has(p.name));
  if (missing.length > 0) {
    console.warn(
      `[embed] Release 자산에 없는 파일 (${missing.length}개): ${missing.map((m) => m.name).join(", ")}`,
    );
  }
  console.log(
    `[embed] v2026.1 하드코딩 매핑: 전형계획 ${V2026_1_PLAN_SLUGS.length}개 + 정시 ${V2026_1_JEONGSI_FILES.length}개 = ${plans.length}개`,
  );
  return plans;
}

async function main(): Promise<void> {
  const supabase = createClient(getEnvUrl(), getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const releaseAssets = await listGithubReleaseAssets(
    DATA_COLLECTOR_REPO,
    RELEASE_TAG,
  );
  const assetByName = new Map(releaseAssets.map((a) => [a.name, a]));

  const plans = resolveFilePlans(assetByName);
  if (plans.length === 0) {
    console.error("[embed] 처리할 Markdown 파일이 없습니다.");
    process.exitCode = 1;
    return;
  }

  console.log(`[embed] 임베딩 모델: ${EMBEDDING_MODEL}, 배치: ${EMBED_BATCH_SIZE}`);

  const existingHashes = await loadExistingContentHashes(supabase);
  console.log(`[embed] 기존 content_sha256 ${existingHashes.size}건 로드`);

  let insertedTotal = 0;
  let skippedDup = 0;
  let skippedFail = 0;

  for (const plan of plans) {
    let text: string;
    try {
      const asset = assetByName.get(plan.name);
      if (!asset) {
        throw new Error(`Release 자산 목록에 없음: ${plan.name}`);
      }
      const res = await fetchGithubReleaseBinary(DATA_COLLECTOR_REPO, asset);
      text = await res.text();
    } catch (e) {
      skippedFail += 1;
      console.error(
        `[embed] skip 파일 다운로드: ${plan.name} — ${e instanceof Error ? e.message : e}`,
      );
      continue;
    }

    const { body, meta } = splitFrontmatter(text);
    const univ =
      meta.univ_name?.trim() ||
      meta.university_name?.trim() ||
      plan.univ_name;
    const yearRaw = meta.year ?? meta.admission_year;
    const year =
      yearRaw !== undefined && String(yearRaw).trim() !== ""
        ? parseInt(String(yearRaw), 10)
        : plan.year;
    if (!Number.isFinite(year)) {
      skippedFail += 1;
      console.error(`[embed] skip 연도 파싱 실패: ${plan.name}`);
      continue;
    }
    const defType =
      parseAdmissionType(meta.default_admission_type) ??
      plan.default_admission_type;

    const filePlan: FilePlan = {
      name: plan.name,
      univ_name: univ,
      year,
      default_admission_type: defType,
    };

    let chunks: PreparedChunk[];
    try {
      chunks = chunkMarkdown(body, filePlan);
    } catch (e) {
      skippedFail += 1;
      console.error(
        `[embed] skip 청킹 실패: ${plan.name} — ${e instanceof Error ? e.message : e}`,
      );
      continue;
    }

    type Pending = {
      chunk: PreparedChunk;
      hash: string;
      row: InsertRow;
    };
    const pending: Pending[] = [];

    for (const ch of chunks) {
      const hash = sha256Hex(ch.text);
      if (existingHashes.has(hash)) {
        skippedDup += 1;
        continue;
      }
      existingHashes.add(hash);
      const isJeongsiMd = /^jeongsi_/i.test(filePlan.name);
      const metadata = {
        univ_name: filePlan.univ_name,
        year: filePlan.year,
        admission_type: ch.admission_type,
        page_section: ch.page_section,
        content_sha256: hash,
        source_file: filePlan.name,
        source_kind: isJeongsiMd ? "jeongsi_material_md" : "admission_plan_md",
        citation_hint: isJeongsiMd
          ? `${filePlan.univ_name} (${filePlan.year}) · ${ch.page_section}`
          : `${filePlan.univ_name} ${filePlan.year}학년도 입학전형 시행계획 · ${ch.page_section}`,
      };
      pending.push({
        chunk: ch,
        hash,
        row: {
          university_name: filePlan.univ_name,
          admission_year: filePlan.year,
          admission_type: ch.admission_type,
          chunk_text: ch.text,
          embedding: [],
          metadata,
        },
      });
    }

    for (let i = 0; i < pending.length; i += EMBED_BATCH_SIZE) {
      const slice = pending.slice(i, i + EMBED_BATCH_SIZE);
      const inputs = slice.map((p) => p.row.chunk_text);
      let vectors: number[][];
      try {
        vectors = await embedOpenAI(inputs);
      } catch (e) {
        console.error(
          `[embed] OpenAI 배치 실패 (${slice.length}건), 건별 재시도: ${e instanceof Error ? e.message : e}`,
        );
        vectors = [];
        for (const one of slice) {
          try {
            const v = await embedOpenAI([one.row.chunk_text]);
            vectors.push(v[0]!);
          } catch (err) {
            skippedFail += 1;
            console.error(
              `[embed] skip 임베딩: ${filePlan.name} — ${err instanceof Error ? err.message : err}`,
            );
            vectors.push([]);
          }
        }
      }

      const rows: InsertRow[] = [];
      for (let j = 0; j < slice.length; j++) {
        const vec = vectors[j];
        if (!vec || vec.length === 0) continue;
        const r = { ...slice[j]!.row, embedding: vec };
        rows.push(r);
      }

      const { ok, fail } = await insertChunkRows(supabase, rows);
      insertedTotal += ok;
      skippedFail += fail;
    }
  }

  console.log("");
  console.log(`총 청크 수(신규 적재): ${insertedTotal}`);
  console.log(`content_sha256 중복 skip: ${skippedDup}`);
  console.log(`기타 skip(실패): ${skippedFail}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
