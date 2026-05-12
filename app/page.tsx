"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import MatrixRain from "./components/MatrixRain";

const GITHUB_URL = "https://github.com/justtayyabkhxn/wepass"; // ← replace with your repo URL

// ── Animation variants ────────────────────────────────────────────────────────

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease } },
};

// ── Terminal typewriter ───────────────────────────────────────────────────────

const TERMINAL_LINES = [
  "$ wepass --add-entry 'GitHub'",
  "",
  "  [1/3] generating salt (256-bit)...... ok",
  "  [2/3] pbkdf2-sha256 (600,000)........ ok",
  "        key  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  (AES-256)",
  "",
  "  [3/3] encrypting with AES-256-GCM",
  "        plaintext   'p4ssw0rd1!'",
  "        iv          9f3a2c7e1b4d...",
  "        ciphertext  U2FsdGVkX1/m...",
  "",
  "  ✓ uploading ciphertext only",
  "  ✓ server never sees plaintext",
];

function useTypewriter(lines: string[], charMs = 28, lineMs = 380) {
  const [displayed, setDisplayed] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await new Promise((r) => setTimeout(r, 900));
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === "") {
          if (!cancelled) setDisplayed((p) => [...p, ""]);
          await new Promise((r) => setTimeout(r, 130));
          continue;
        }
        for (let j = 1; j <= line.length; j++) {
          if (cancelled) return;
          setDisplayed((p) => {
            const n = [...p];
            n[i] = line.slice(0, j);
            return n;
          });
          await new Promise((r) => setTimeout(r, charMs));
        }
        await new Promise((r) => setTimeout(r, lineMs));
      }
    }

    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return displayed;
}

function lineColor(line: string) {
  if (line.startsWith("$")) return "text-emerald-300 font-semibold";
  if (line.includes("✓")) return "text-emerald-400";
  if (line.includes("▓")) return "text-emerald-600";
  if (/^\s+\[\d/.test(line)) return "text-zinc-300";
  return "text-zinc-500";
}

// ── Data ──────────────────────────────────────────────────────────────────────

const stats = [
  { value: "256-bit", label: "Key size" },
  { value: "600,000", label: "PBKDF2 iterations" },
  { value: "AES-GCM", label: "Cipher mode" },
  { value: "bcrypt", label: "PIN hashing" },
  { value: "0 bytes", label: "Plaintext stored" },
];

const features = [
  {
    tag: "Core",
    title: "Zero-Knowledge Architecture",
    description:
      "Passwords are encrypted in your browser before upload. The server stores only ciphertext — we physically cannot read your data, ever.",
    icon: <ShieldIcon />,
  },
  {
    tag: "Cipher",
    title: "AES-256-GCM",
    description:
      "Authenticated encryption with a unique 96-bit IV per entry. Built-in tamper detection — any modification to ciphertext is cryptographically rejected.",
    icon: <LockIcon />,
  },
  {
    tag: "Key Security",
    title: "PBKDF2 Key Derivation",
    description:
      "Your password runs through 600,000 SHA-256 iterations to produce your vault key. Brute-force is computationally infeasible.",
    icon: <KeyIcon />,
  },
  {
    tag: "Access Control",
    title: "4-Digit Vault PIN",
    description:
      "A separate PIN gates every reveal and copy action. Stored as a bcrypt hash — independently protects your session even if your account is compromised.",
    icon: <PinIcon />,
  },
  {
    tag: "Brute Force",
    title: "Rate Limiting & Lockout",
    description:
      "Login locked after 10 attempts / 15 min. PIN locked after 5 attempts. Server-side cooldown on all auth endpoints.",
    icon: <TimerIcon />,
  },
  {
    tag: "Anti-Enumeration",
    title: "Timing-Safe Login",
    description:
      "Full bcrypt compare always runs regardless of whether the email exists. Prevents timing attacks that can reveal valid accounts.",
    icon: <ClockShieldIcon />,
  },
];

const steps = [
  {
    n: "01",
    title: "Sign up",
    body: "Your password runs through 600k PBKDF2 iterations in your browser to derive a 256-bit AES key. This key never leaves your device.",
  },
  {
    n: "02",
    title: "Add passwords",
    body: "Each credential is encrypted client-side with AES-256-GCM and a unique IV before upload. The server receives and stores ciphertext only.",
  },
  {
    n: "03",
    title: "Access securely",
    body: "Enter your 4-digit PIN to reveal or copy passwords. Your vault key lives only in sessionStorage — cleared when you close the tab.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <MatrixRain />
      <div className="relative z-10">
        <Nav />
        <Hero />
        <StatsBar />
        <Features />
        <HowItWorks />
        <CTA />
        <Footer />
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
      className="fixed top-0 inset-x-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LockIcon className="text-emerald-400 w-4 h-4" />
          <span className="text-lg font-semibold tracking-tight text-zinc-50">wePass</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-2 rounded-lg hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/60"
            title="View source on GitHub"
          >
            <GitHubIcon />
            <span className="hidden sm:inline">Source</span>
          </a>
          <Link href="/login" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-4 py-2">
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative pt-36 pb-20 px-6 overflow-hidden">
      <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-14 items-center">
        {/* Left — headline */}
        <motion.div
          className="flex flex-col gap-6"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Zero-Knowledge · AES-256-GCM
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight text-zinc-50"
          >
            Your passwords,
            <br />
            <span className="text-emerald-400">encrypted</span> and yours.
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg text-zinc-400 leading-relaxed max-w-md">
            wePass encrypts every password in your browser with AES-256-GCM before it ever reaches
            our servers. Zero-knowledge — we store only ciphertext.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
            >
              Create Free Account <ArrowRightIcon />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 px-6 py-3 rounded-lg transition-colors text-sm"
            >
              Sign In
            </Link>
          </motion.div>
        </motion.div>

        {/* Right — terminal */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease, delay: 0.3 }}
        >
          <TerminalWindow />
        </motion.div>
      </div>
    </section>
  );
}

function TerminalWindow() {
  const lines = useTypewriter(TERMINAL_LINES);
  const isTyping = lines.length < TERMINAL_LINES.length;

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800 shadow-2xl shadow-black/50">
      {/* Title bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
        <span className="ml-3 text-xs text-zinc-600">wepass — terminal</span>
      </div>
      {/* Body */}
      <div className="bg-zinc-950 p-5 min-h-[280px] font-mono text-xs leading-6">
        {lines.map((line, i) => (
          <div key={i} className={lineColor(line)}>
            {line}
            {isTyping && i === lines.length - 1 && (
              <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-0.5 align-middle animate-pulse" />
            )}
          </div>
        ))}
        {!isTyping && lines.length > 0 && (
          <div className="text-zinc-700 mt-1">
            <span className="inline-block w-1.5 h-3.5 bg-zinc-700 animate-pulse align-middle" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={fadeIn}
      className="border-y border-zinc-800/60 bg-zinc-900/30 py-5 px-6"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-x-10 gap-y-4"
        >
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="flex flex-col items-center gap-0.5">
              <span className="text-emerald-400 font-bold text-base tracking-tight">{s.value}</span>
              <span className="text-zinc-600 text-xs">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

function Features() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-14"
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-zinc-50 tracking-tight">
            Security without compromise
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-3 text-zinc-500 text-sm max-w-md mx-auto">
            Every layer of the stack designed around one principle — your data belongs to you alone.
          </motion.p>
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4 hover:border-zinc-700 transition-colors duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  {f.icon}
                </div>
                <span className="text-[10px] font-semibold text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded-full">
                  {f.tag}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section className="py-24 px-6 border-t border-zinc-800/50">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-zinc-50 tracking-tight">
            How wePass protects you
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-3 text-zinc-500 text-sm">
            Three steps. Zero plaintext ever sent to our servers.
          </motion.p>
        </motion.div>

        <motion.div
          className="flex flex-col gap-0"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
        >
          {steps.map((step, i) => (
            <motion.div key={step.n} variants={fadeUp} className="flex gap-8 group">
              {/* Left — number + line */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-emerald-500/40 transition-colors flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-emerald-400">{step.n}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className="w-px flex-1 bg-zinc-800 my-2" />
                )}
              </div>
              {/* Right — content */}
              <div className={`pb-10 ${i === steps.length - 1 ? "pb-0" : ""}`}>
                <h3 className="font-semibold text-zinc-100 mt-3 mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed max-w-lg">{step.body}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="py-24 px-6">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto max-w-2xl text-center flex flex-col items-center gap-6 border border-zinc-800 bg-zinc-900/40 rounded-2xl p-12"
      >
        <motion.div
          variants={fadeUp}
          className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400"
        >
          <LockIcon className="w-6 h-6 text-emerald-400" />
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-3xl font-bold text-zinc-50 tracking-tight">
          Ready to secure your vault?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-zinc-500 text-sm">
          Free forever. Your passwords, encrypted and yours.
        </motion.p>
        <motion.div variants={fadeUp}>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
          >
            Get Started for Free <ArrowRightIcon />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-zinc-800/60 py-8 px-6">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-600 text-sm">
        <div className="flex items-center gap-2">
          <LockIcon className="text-zinc-600 w-4 h-4" />
          <span className="font-semibold">wePass</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <p>© {new Date().getFullYear()} wePass. All rights reserved.</p>
          <span className="hidden sm:block text-zinc-800">·</span>
          <p>
            Engineered by{" "}
            <a
              href="https://justtayyabkhan.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Tayyab Khan
            </a>
          </p>
          <span className="hidden sm:block text-zinc-800">·</span>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <GitHubIcon />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function LockIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6M15.5 7.5l3 3" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M9 7h1M12 7h1M15 7h1M9 11h1M12 11h1M15 11h1M9 15h1M12 15h1M15 15h1" strokeLinecap="round" />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 3M9 3h6M12 1v2" />
    </svg>
  );
}

function ClockShieldIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4l2 2" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
