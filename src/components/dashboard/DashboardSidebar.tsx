"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { DASHBOARD_MORE_SECTIONS } from "@/components/dashboard/dashboardMenu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-border bg-card px-3 py-4 md:block",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        {!collapsed ? <p className="text-sm font-semibold text-foreground">더 보기</p> : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          onClick={() => setCollapsed((prev) => !prev)}
          className="size-8"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>

      <div className="space-y-4 overflow-y-auto pb-6">
        {DASHBOARD_MORE_SECTIONS.map((section) => (
          <div key={section.title}>
            {!collapsed ? (
              <p className="mb-2 px-2 text-xs font-medium tracking-wide text-muted-foreground">
                {section.title}
              </p>
            ) : null}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={`${section.title}-${item.href}-${item.label}`}>
                    <Link
                      href={item.href}
                      className={cn(
                        "block rounded-md px-2 py-2 text-sm transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        collapsed && "text-center text-xs",
                      )}
                    >
                      {collapsed ? item.label.slice(0, 2) : item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
