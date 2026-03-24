"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to request reset link");
      return;
    }
    setMessage(
      data.message ||
        "If an account with this email exists, a reset link has been sent."
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-[#080c14] bg-mesh-dark">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Forgot password</h1>
          <p className="text-slate-500 mt-2">
            Enter your email to receive a reset link
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl bg-slate-900/50 p-8 border border-slate-800/80 backdrop-blur-sm"
        >
          {error && <div className="text-red-400 text-sm text-center">{error}</div>}
          {message && (
            <div className="text-emerald-400 text-sm text-center space-y-1">
              <p>{message}</p>
              <p className="text-slate-400">
                If you don&apos;t see the email, please check your Spam folder.
              </p>
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 transition-all duration-200"
          >
            {loading ? "Sending..." : "Send reset link"}
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
