"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        theme="dark"
        toastOptions={{
          style: { background: "#1e293b", border: "1px solid #334155", color: "#f8fafc" },
        }}
      />
    </SessionProvider>
  );
}
