"use client";

import { CalendarDays, LayoutDashboard, Menu, MessageCircle, Table2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const MAIN = [
  { href: "/dashboard", label: "홈", Icon: LayoutDashboard },
  { href: "/dashboard/signals", label: "신호등", Icon: Table2 },
  { href: "/dashboard/calendar", label: "캘린더", Icon: CalendarDays },
  { href: "/dashboard/chat", label: "챗봇", Icon: MessageCircle },
] as const;

const MORE = [
  { href: "/dashboard/scores", label: "성적 입력" },
  { href: "/dashboard/student-record", label: "생활기록부" },
  { href: "/dashboard/analysis", label: "합격 가능성" },
] as const;

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

  useEffect(() => {
    closeMore();
  }, [pathname, closeMore]);

  return (
    <>
      <nav
        className="fixed right-0 bottom-0 left-0 z-50 border-t border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 md:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        aria-label="주요 화뷰 이동"
      >
        <ul className="flex max-w-lg mx-auto">
          {MAIN.map(({ href, label, Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href} className="min-w-0 flex-1">
                <Link
                  href={href}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.65rem] font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
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
              <Menu className="size-5 shrink-0" aria-hidden />
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
                다른 메뉴
              </h2>
              <p className="text-muted-foreground text-sm">
                성적·생기부·분석으로 이동합니다.
              </p>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {MORE.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="hover:bg-muted block min-h-11 rounded-lg px-3 py-3 text-base font-medium"
                    onClick={closeMore}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
