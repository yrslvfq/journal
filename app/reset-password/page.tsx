"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to reset password");
      return;
    }

    setMessage("Password reset successfully. Redirecting to login...");
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1000);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-[#080c14] bg-mesh-dark">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Reset password</h1>
          <p className="text-slate-500 mt-2">Enter your new password</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl bg-slate-900/50 p-8 border border-slate-800/80 backdrop-blur-sm"
        >
          {error && <div className="text-red-400 text-sm text-center">{error}</div>}
          {message && (
            <div className="text-emerald-400 text-sm text-center">{message}</div>
          )}
          {!token && (
            <div className="text-red-400 text-sm text-center">
              Invalid reset link. Please request a new one.
            </div>
          )}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              New password (min 8 characters)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={!token}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 transition-all duration-200"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
          <p className="text-center text-sm text-slate-500">
            Back to{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 transition">
              login
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-8 bg-[#080c14] bg-mesh-dark">
          <div className="text-slate-500">Loading...</div>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
