import { DashboardMobileNav } from "@/components/dashboard/DashboardMobileNav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="pb-20 md:pb-0">
        {children}
        <footer className="mx-auto mt-8 w-full max-w-6xl px-4 pb-4 text-center text-xs text-muted-foreground sm:px-6">
          본 서비스는 대입 준비를 위한 참고 도구입니다. 모든 정보는 참고용이며 최종 결정은 반드시 공식 자료를
          확인하시기 바랍니다.
        </footer>
      </div>
      <DashboardMobileNav />
    </>
  );
}
