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
      </div>
      <DashboardMobileNav />
    </>
  );
}
