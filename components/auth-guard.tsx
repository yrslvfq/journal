"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
  }
  if (!session) redirect("/login");
  return <>{children}</>;
}
