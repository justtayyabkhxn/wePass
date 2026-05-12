"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import MatrixRain from "@/app/components/MatrixRain";
import {
  getSessionKey,
  clearSessionKey,
  encryptText,
  decryptText,
} from "@/lib/client-crypto";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const CATEGORIES = [
  "All",
  "Social",
  "Work",
  "Banking",
  "Shopping",
  "Gaming",
  "Other",
] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_STYLES: Record<
  string,
  {
    bg: string;
    text: string;
    border?: string;
    avatarBg: string;
    avatarText: string;
  }
> = {
  Social: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    avatarBg: "bg-blue-500/15",
    avatarText: "text-blue-400",
  },
  Work: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    // border: "border-violet-500/20",
    avatarBg: "bg-violet-500/15",
    avatarText: "text-violet-400",
  },
  Banking: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    avatarBg: "bg-emerald-500/15",
    avatarText: "text-emerald-400",
  },
  Shopping: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/20",
    avatarBg: "bg-orange-500/15",
    avatarText: "text-orange-400",
  },
  Gaming: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
    avatarBg: "bg-red-500/15",
    avatarText: "text-red-400",
  },
  Other: {
    bg: "bg-zinc-800",
    text: "text-zinc-400",
    border: "border-zinc-700",
    avatarBg: "bg-zinc-800",
    avatarText: "text-zinc-400",
  },
};

function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Other;
}

interface RawVaultEntry {
  id: string;
  title: string;
  username: string;
  encryptedPassword: string;
  iv: string;
  category: string;
  createdAt: string;
}

interface VaultEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  category: string;
  createdAt: string;
}

const addSchema = z.object({
  title: z.string().min(1, "Title is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  category: z.enum([
    "Social",
    "Work",
    "Banking",
    "Shopping",
    "Gaming",
    "Other",
  ]),
});
type AddFormData = z.infer<typeof addSchema>;

export default function DashboardClient({
  userId: _userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"toggle" | "copy" | null>(
    null,
  );
  const [pendingCopyPassword, setPendingCopyPassword] = useState<string | null>(
    null,
  );
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(
    new Set(),
  );
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const { data: vault = [], isLoading } = useQuery<VaultEntry[]>({
    queryKey: ["vault"],
    queryFn: async () => {
      const res = await fetch("/api/vault");
      if (!res.ok) throw new Error("Failed to fetch vault");
      const raw: RawVaultEntry[] = await res.json();

      const key = await getSessionKey();
      if (!key) {
        clearSessionKey();
        window.location.href = "/login";
        return [];
      }

      return Promise.all(
        raw.map(async (entry) => {
          let password: string;
          try {
            password = await decryptText(
              entry.encryptedPassword,
              entry.iv,
              key,
            );
          } catch {
            password = "⚠ legacy entry — please delete and re-add";
          }
          return {
            id: entry.id,
            title: entry.title,
            username: entry.username,
            password,
            category: entry.category || "Other",
            createdAt: entry.createdAt,
          };
        }),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/vault/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Failed to delete");
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vault"] }),
  });

  const filtered = vault.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.username.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === "All" || v.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Count per category for tab badges
  const categoryCounts = CATEGORIES.reduce<Record<string, number>>(
    (acc, cat) => {
      acc[cat] =
        cat === "All"
          ? vault.length
          : vault.filter((v) => v.category === cat).length;
      return acc;
    },
    {},
  );

  function togglePassword(id: string) {
    if (!pinVerified && !visiblePasswords.has(id)) {
      setPendingToggleId(id);
      setPendingAction("toggle");
      setShowPinModal(true);
      return;
    }
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function copyPassword(password: string, id: string) {
    if (!pinVerified) {
      setPendingToggleId(id);
      setPendingCopyPassword(password);
      setPendingAction("copy");
      setShowPinModal(true);
      return;
    }
    await navigator.clipboard.writeText(password);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handlePinSuccess() {
    setPinVerified(true);
    setShowPinModal(false);
    if (pendingAction === "toggle" && pendingToggleId) {
      setVisiblePasswords((prev) => new Set(prev).add(pendingToggleId));
    } else if (
      pendingAction === "copy" &&
      pendingCopyPassword &&
      pendingToggleId
    ) {
      await navigator.clipboard.writeText(pendingCopyPassword);
      setCopiedId(pendingToggleId);
      setTimeout(() => setCopiedId(null), 2000);
    }
    setPendingToggleId(null);
    setPendingAction(null);
    setPendingCopyPassword(null);
  }

  function lockVault() {
    setPinVerified(false);
    setVisiblePasswords(new Set());
  }

  async function handleLogout() {
    clearSessionKey();
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <MatrixRain />
      <div className="relative z-10">
        {/* Nav */}
        <nav className="fixed top-0 inset-x-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <LockIcon className="text-emerald-400 w-5 h-5" />
              <span className="text-lg font-semibold tracking-tight text-zinc-50">
                wePass
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-500 hidden sm:block">
                {email}
              </span>
              {pinVerified && (
                <button
                  onClick={lockVault}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 rounded-full hover:bg-emerald-500/20 transition-colors"
                  title="Lock vault"
                >
                  <UnlockIcon />
                  Unlocked
                </button>
              )}
              <button
                onClick={handleLogout}
                className="text-sm text-zinc-400 hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        {/* Main */}
        <main className="pt-24 pb-16 px-6 mx-auto max-w-5xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-zinc-50">Your Vault</h1>
              <p className="text-sm text-zinc-500 mt-1">
                {isLoading
                  ? "Loading..."
                  : `${vault.length} saved credential${vault.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <PlusIcon />
              Add Password
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vault..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] ?? 0;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-500 text-zinc-950"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  {cat}
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-zinc-950/20 text-zinc-900"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Vault grid */}
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl h-40 animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <LockIcon className="w-6 h-6 text-zinc-600" />
              </div>
              <div>
                <p className="text-zinc-400 font-medium">
                  {search || activeCategory !== "All"
                    ? "No results found"
                    : "Your vault is empty"}
                </p>
                <p className="text-zinc-600 text-sm mt-1">
                  {search || activeCategory !== "All"
                    ? "Try a different search or category"
                    : "Add your first password to get started"}
                </p>
              </div>
              {!search && activeCategory === "All" && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  + Add your first password
                </button>
              )}
            </div>
          ) : (
            <motion.div
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
            >
              {filtered.map((entry) => {
                const style = getCategoryStyle(entry.category);
                const isVisible = visiblePasswords.has(entry.id);
                return (
                  <motion.div
                    key={entry.id}
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.35, ease },
                      },
                    }}
                    className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors duration-200 flex flex-col"
                  >
                    {/* Category accent bar */}
                    <div className={`h-0.5 w-full ${style.avatarBg}`} />

                    <div className="p-5 flex flex-col gap-4 flex-1">
                      {/* Header row */}
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        {/* <div
                          className={`w-10 h-10 rounded-xl ${style.avatarBg} border ${style.border} flex items-center justify-center shrink-0 text-sm font-bold ${style.avatarText}`}
                        >
                          {entry.title.charAt(0).toUpperCase()}
                        </div> */}

                        {/* Title + badge */}
                        <div className="flex gap-x-5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-zinc-100 text-sm truncate">
                              {entry.title}
                            </p>
                          </div>
                          <span
                            className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border}`}
                          >
                            {entry.category}
                          </span>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => setConfirmDeleteId(entry.id)}
                          disabled={deleteMutation.isPending}
                          className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30 shrink-0 mt-1.5"
                          title="Delete"
                        >
                          <TrashIcon />
                        </button>
                      </div>

                      {/* Username row */}
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <UserIcon />
                        <span className="truncate">{entry.username}</span>
                      </div>

                      {/* Password row */}
                      <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 mt-auto">
                        <span className="flex-1 text-xs text-zinc-400 font-mono truncate">
                          {isVisible ? entry.password : "••••••••••"}
                        </span>
                        <button
                          onClick={() => togglePassword(entry.id)}
                          className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
                          title={isVisible ? "Hide" : "Show"}
                        >
                          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                        <button
                          onClick={() => copyPassword(entry.password, entry.id)}
                          className="text-zinc-600 hover:text-emerald-400 transition-colors shrink-0"
                          title="Copy password"
                        >
                          {copiedId === entry.id ? (
                            <CheckIcon className="text-emerald-400" />
                          ) : (
                            <CopyIcon />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddModal
            key="add-modal"
            onClose={() => setShowAdd(false)}
            onSuccess={() => {
              setShowAdd(false);
              queryClient.invalidateQueries({ queryKey: ["vault"] });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDeleteId && (
          <ConfirmDeleteModal
            key="confirm-delete-modal"
            onClose={() => setConfirmDeleteId(null)}
            onConfirm={() => {
              deleteMutation.mutate(confirmDeleteId);
              setConfirmDeleteId(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPinModal && (
          <PinModal
            key="pin-modal"
            onClose={() => {
              setShowPinModal(false);
              setPendingToggleId(null);
            }}
            onSuccess={handlePinSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Add Modal ──────────────────────────────────────────────────────────────────

function AddModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [serverError, setServerError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddFormData>({
    resolver: zodResolver(addSchema),
    defaultValues: { category: "Other" },
  });

  async function onSubmit(data: AddFormData) {
    setServerError("");
    try {
      const key = await getSessionKey();
      if (!key) {
        setServerError("Session expired. Please log in again.");
        return;
      }

      const { ciphertext, iv } = await encryptText(data.password, key);

      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          username: data.username,
          encryptedPassword: ciphertext,
          iv,
          category: data.category,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || "Something went wrong");
        return;
      }
      onSuccess();
    } catch {
      setServerError("Network error. Please try again.");
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl"
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.22, ease }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-zinc-50">Add Password</h2>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">
              {serverError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400">Site / App Name</label>
            <input
              {...register("title")}
              type="text"
              placeholder="e.g. GitHub"
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {errors.title && (
              <span className="text-xs text-red-400">
                {errors.title.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400">Username / Email</label>
            <input
              {...register("username")}
              type="text"
              placeholder="you@example.com"
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {errors.username && (
              <span className="text-xs text-red-400">
                {errors.username.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400">Password</label>
            <div className="relative">
              <input
                {...register("password")}
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && (
              <span className="text-xs text-red-400">
                {errors.password.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400">Category</label>
            <select
              {...register("category")}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
            >
              <option value="Social">Social</option>
              <option value="Work">Work</option>
              <option value="Banking">Banking</option>
              <option value="Shopping">Shopping</option>
              <option value="Gaming">Gaming</option>
              <option value="Other">Other</option>
            </select>
            {errors.category && (
              <span className="text-xs text-red-400">
                {errors.category.message}
              </span>
            )}
          </div>

          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-100 py-2.5 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Confirm Delete Modal ───────────────────────────────────────────────────────

function ConfirmDeleteModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl"
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.22, ease }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <TrashIcon />
          </div>
          <h2 className="font-bold text-zinc-50">Delete entry?</h2>
        </div>
        <p className="text-sm text-zinc-500 mb-5">
          This will permanently remove the credential from your vault. This
          cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-100 py-2.5 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Pin Modal ─────────────────────────────────────────────────────────────────

function PinModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) {
      setError("Enter exactly 4 digits");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/vault/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const json = await res.json();
      if (json.valid) {
        onSuccess();
      } else {
        setError("Incorrect PIN. Try again.");
        setPin("");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl"
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.22, ease }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <LockIcon className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-zinc-50 text-sm">Vault Locked</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <XIcon />
          </button>
        </div>
        <p className="text-xs text-zinc-500 mb-5">
          Enter your 4-digit vault PIN to unlock passwords.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            maxLength={4}
            placeholder="_ _ _ _"
            autoFocus
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 tracking-[0.4em] text-center font-mono focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-zinc-700 hover:border-zinc-500 text-zinc-400 py-2 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || pin.length === 0}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              {loading ? "Verifying..." : "Unlock"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function LockIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg
      className="w-3 h-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      className="w-3 h-3 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
