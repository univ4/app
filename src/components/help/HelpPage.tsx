"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Link2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { MarkdownRenderer } from "./MarkdownRenderer";

type HelpPageProps = {
  manualContent: string;
};

type HelpSection = {
  id: string;
  title: string;
  content: string;
};

const HELP_SECTION_META: Array<{ id: string; title: string; keywords: string[] }> = [
  { id: "getting-started", title: "시작하기", keywords: ["시작하기", "메인 대시보드", "서비스 소개"] },
  { id: "scores", title: "성적 관리", keywords: ["성적 입력", "정시 환산점수", "학생부교과 내신 산출"] },
  { id: "signals", title: "합격 가능성 신호등", keywords: ["합격 가능성 신호등"] },
  { id: "chatbot", title: "AI 요강 챗봇", keywords: ["ai 요강 챗봇"] },
  { id: "student-record", title: "생활기록부", keywords: ["생활기록부", "생기부 공백 탐지기"] },
  { id: "calendar", title: "입시 캘린더", keywords: ["입시 d-day 캘린더"] },
  {
    id: "analysis-tools",
    title: "분석 도구",
    keywords: ["전국 대학 지원 가능 탐색기", "선택과목 분석기", "수능최저 충족 확률 계산기", "연도별 입결 추이"],
  },
  { id: "ai-assistant", title: "AI 도우미", keywords: ["자소서 코치", "ai 모의 면접 코치"] },
  { id: "susi-strategy", title: "수시 전략", keywords: ["수시 6장 원서 배분 시뮬레이터"] },
  { id: "jeongsi-strategy", title: "정시 전략", keywords: ["정시 군별 지원 전략 분석기"] },
  { id: "career-planning", title: "진로 설계", keywords: ["조기 설계 로드맵", "n수생 전략"] },
  { id: "settings", title: "설정", keywords: ["알림 설정", "자주 묻는 질문"] },
];

function splitManualByHeading(markdown: string) {
  const lines = markdown.split("\n");
  const chunks: Array<{ heading: string; content: string }> = [];
  let currentHeading = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (currentHeading) {
        chunks.push({ heading: currentHeading, content: currentBody.join("\n").trim() });
      }
      currentHeading = line.replace(/^##\s+/, "").trim();
      currentBody = [];
      continue;
    }
    if (currentHeading) {
      currentBody.push(line);
    }
  }

  if (currentHeading) {
    chunks.push({ heading: currentHeading, content: currentBody.join("\n").trim() });
  }

  return chunks;
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function buildSections(manualContent: string): HelpSection[] {
  const chunks = splitManualByHeading(manualContent);
  return HELP_SECTION_META.map((meta) => {
    const matchedChunks = chunks.filter((chunk) =>
      meta.keywords.some((keyword) => normalize(chunk.heading).includes(normalize(keyword))),
    );
    const content = matchedChunks
      .map((chunk) => `### ${chunk.heading}\n\n${chunk.content}`)
      .join("\n\n---\n\n");
    return {
      id: meta.id,
      title: meta.title,
      content: content || "해당 섹션 매뉴얼 준비 중입니다.",
    };
  });
}

export function HelpPage({ manualContent }: HelpPageProps) {
  const sections = useMemo(() => buildSections(manualContent), [manualContent]);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "getting-started");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopyLink = (sectionId: string) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/dashboard/help#${sectionId}`;
    void navigator.clipboard.writeText(url);
    setCopied(sectionId);
    window.setTimeout(() => setCopied(null), 2000);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          setActiveSectionId(visible.target.id);
        }
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0.2, 0.5, 0.8] },
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const normalizedQuery = normalize(query);
  const highlightedSectionIds = useMemo(() => {
    if (!normalizedQuery) return new Set<string>();
    return new Set(
      sections
        .filter(
          (section) =>
            normalize(section.title).includes(normalizedQuery) ||
            normalize(section.content).includes(normalizedQuery),
        )
        .map((section) => section.id),
    );
  }, [normalizedQuery, sections]);

  const hasNoSearchResult = normalizedQuery.length > 0 && highlightedSectionIds.size === 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-title text-foreground">도움말</h1>
        <p className="text-caption mt-1">사용자 매뉴얼 기반 안내를 섹션별로 확인할 수 있습니다.</p>
      </div>

      <div className="mb-4 max-w-md">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="키워드로 도움말 검색"
          aria-label="도움말 검색"
        />
      </div>

      {hasNoSearchResult ? (
        <p className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          찾을 수 없습니다
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav className="w-56 lg:sticky lg:top-4 lg:self-start" aria-label="도움말 목차">
          <ul className="space-y-1 rounded-lg border border-border bg-card p-2">
            {sections.map((section) => {
              const isActive = activeSectionId === section.id;
              const isHighlighted = highlightedSectionIds.has(section.id);
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      isHighlighted && "ring-1 ring-primary/40",
                    )}
                  >
                    {section.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="max-w-3xl space-y-6">
          {sections.map((section, index) => {
            const isHighlighted = highlightedSectionIds.has(section.id);
            return (
              <section
                key={section.id}
                id={section.id}
                className={cn(
                  "scroll-mt-24 rounded-xl border border-border bg-card p-6",
                  isHighlighted && "border-primary/50 bg-primary/5",
                )}
              >
                <h2 className="group text-heading mb-3 flex items-center gap-2 text-foreground">
                  <span>{section.title}</span>
                  <button
                    type="button"
                    aria-label="링크 복사"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleCopyLink(section.id)}
                  >
                    {copied === section.id ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <Link2 className="size-4 text-muted-foreground" />
                    )}
                  </button>
                </h2>
                <MarkdownRenderer
                  content={section.content}
                  sectionId={section.id}
                  copiedId={copied}
                  onCopyLink={handleCopyLink}
                />
                {index < sections.length - 1 ? <hr className="mt-6 border-border" /> : null}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
