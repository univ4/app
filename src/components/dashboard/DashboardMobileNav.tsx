"use client";

import {
  ChevronRight,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  DASHBOARD_CORE_CARDS,
  DASHBOARD_MORE_SECTIONS,
} from "@/components/dashboard/dashboardMenu";
import { cn } from "@/lib/utils";

export function DashboardMobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const closeMore = useCallback(() => setMoreOpen(false), []);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMore();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen, closeMore]);

  return (
    <>
      <nav
        className="fixed right-0 bottom-0 left-0 z-50 border-t border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 md:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        aria-label="주요 화뷰 이동"
      >
        <ul className="flex max-w-lg mx-auto">
          <li className="min-w-0 flex-1">
            <Link
              href="/dashboard"
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.65rem] font-medium",
                pathname === "/dashboard" ? "text-foreground" : "text-muted-foreground",
              )}
              onClick={closeMore}
            >
              홈
            </Link>
          </li>
          {DASHBOARD_CORE_CARDS.slice(0, 4).map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href} className="min-w-0 flex-1">
                <Link
                  href={href}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.65rem] font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                  onClick={closeMore}
                >
                  {Icon ? <Icon className="size-5 shrink-0" aria-hidden /> : null}
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="min-w-0 flex-1">
            <button
              type="button"
              className="text-muted-foreground flex min-h-11 w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.65rem] font-medium"
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              aria-controls="dashboard-more-sheet"
              onClick={() => setMoreOpen(true)}
            >
              <Menu className="size-4 shrink-0" aria-hidden />
              더보기
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen ? (
        <div className="md:hidden" role="presentation">
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/40"
            aria-label="메뉴 닫기"
            onClick={closeMore}
          />
          <div
            id="dashboard-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-more-title"
            className="fixed right-0 bottom-0 left-0 z-[70] max-h-[min(70vh,28rem)] rounded-t-xl border border-border bg-card shadow-lg"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="border-b border-border px-4 py-3">
              <h2 id="dashboard-more-title" className="text-base font-semibold">
                더보기 메뉴
              </h2>
              <p className="text-muted-foreground text-sm">
                분석 도구와 AI 도우미 기능으로 이동합니다.
              </p>
            </div>
            <div className="max-h-[50vh] space-y-3 overflow-y-auto p-3">
              {DASHBOARD_MORE_SECTIONS.map((section) => (
                <div key={section.title}>
                  <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">{section.title}</p>
                  <ul className="space-y-1">
                    {section.items.map(({ href, label }) => (
                      <li key={`${section.title}-${href}-${label}`}>
                        <Link
                          href={href}
                          className="hover:bg-muted flex min-h-11 items-center justify-between rounded-lg px-3 py-2 text-sm font-medium"
                          onClick={closeMore}
                        >
                          {label}
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
