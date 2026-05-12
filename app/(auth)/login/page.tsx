"use client";

import Link from "next/link";
import MatrixRain from "@/app/components/MatrixRain";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { deriveKey, storeSessionKey } from "@/lib/client-crypto";
import { motion } from "framer-motion";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError("");
    try {
      // 1. Fetch the KDF salt for this email (needed to derive the encryption key)
      const saltRes = await fetch("/api/auth/salt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const { salt } = await saltRes.json();

      // 2. Authenticate
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const json = await loginRes.json();

      if (!loginRes.ok) {
        setServerError(json.error || "Invalid credentials");
        return;
      }

      // 3. Derive and store the encryption key only after successful auth
      if (salt) {
        const key = await deriveKey(data.password, salt);
        await storeSessionKey(key);
      }

      router.push("/dashboard");
    } catch {
      setServerError("Network error. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <MatrixRain />
      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 group">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-xl font-semibold text-zinc-50 group-hover:text-zinc-300 transition-colors">
            wePass
          </span>
        </Link>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <h1 className="text-xl font-bold text-zinc-50 mb-1">Welcome back</h1>
          <p className="text-sm text-zinc-500 mb-6">Sign in to access your vault.</p>

          {justRegistered && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm px-3 py-2 rounded-lg mb-4">
              Account created! You can now sign in.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {serverError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">
                {serverError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400">Email</label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {errors.email && <span className="text-xs text-red-400">{errors.email.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400">Password</label>
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {errors.password && <span className="text-xs text-red-400">{errors.password.message}</span>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {isSubmitting ? "Deriving key & signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
