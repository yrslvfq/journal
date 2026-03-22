import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#080c14] bg-mesh-dark">
      <div className="max-w-2xl text-center space-y-10">
        <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-sm">
          Flow Journal
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed max-w-md mx-auto">
          Trading journal for options flow, order flow & Auction Market Theory
          traders. Track trades, analyze flow, and refine your edge.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 border border-slate-700/50 transition-all duration-200"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 shadow-glow-sm transition-all duration-200 font-medium"
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
