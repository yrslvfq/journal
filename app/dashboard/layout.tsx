import { AuthGuard } from "@/components/auth-guard";
import { DashboardNav } from "@/components/dashboard-nav";
import { QuickAddTrade } from "@/components/quick-add-trade";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#080c14] flex">
        <DashboardNav />
        <main className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8 overflow-auto">{children}</main>
        <QuickAddTrade />
      </div>
    </AuthGuard>
  );
}
