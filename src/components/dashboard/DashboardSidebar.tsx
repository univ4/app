"use client";

import { ChevronLeft, PanelLeftOpen } from "lucide-react";
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
        <Link
          href="/dashboard"
          className={cn(
            "text-heading rounded-md px-3 py-1 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            collapsed && "px-2",
          )}
        >
          {collapsed ? "u4" : "univ4"}
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          onClick={() => setCollapsed((prev) => !prev)}
          className="size-8"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>

      <div className="space-y-4 overflow-y-auto pb-6">
        {DASHBOARD_MORE_SECTIONS.map((section) => (
          <div key={section.title}>
            {!collapsed ? (
              <p className="text-caption cursor-default px-3 pb-1 pt-4 font-semibold uppercase tracking-wider">
                {section.title}
              </p>
            ) : null}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const ItemIcon = item.icon;
                return (
                  <li key={`${section.title}-${item.href}-${item.label}`}>
                    <Link
                      href={item.href}
                      className={cn(
                        "text-body group flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-foreground transition-colors",
                        active
                          ? "bg-primary/10 font-medium text-primary"
                          : "hover:bg-accent hover:text-accent-foreground",
                        collapsed && "justify-center",
                      )}
                    >
                      {ItemIcon ? (
                        <ItemIcon
                          className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary",
                            active && "text-primary",
                          )}
                          aria-hidden
                        />
                      ) : null}
                      {!collapsed ? <span>{item.label}</span> : null}
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
