# wePass | Secure Password Manager

> A zero-knowledge, client-side encrypted password manager. Your passwords are encrypted in your browser before they ever leave your device — the server stores only ciphertext and physically cannot read your data.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## Table of Contents

- [Overview](#overview)
- [Security Architecture](#security-architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Security Details](#security-details)
- [Roadmap](#roadmap)

---

## Overview

wePass is a personal password manager built on a **zero-knowledge architecture** — meaning your master password is never sent to the server. Instead, it is used entirely in your browser to derive a 256-bit AES encryption key via PBKDF2 (600,000 iterations). Every credential is encrypted with AES-256-GCM before upload, so the server never sees plaintext.

A separate **4-digit vault PIN** is required to reveal or copy any password during a session, adding a second layer of access control independent of your account password.

---

## Security Architecture

```
User password
     │
     ▼
PBKDF2-SHA256 (600,000 iterations + 256-bit salt)
     │
     ▼
AES-256 key  ──► stored only in sessionStorage (cleared on tab close)
     │
     ▼
AES-256-GCM encrypt (unique 96-bit IV per entry)
     │
     ▼
ciphertext + IV  ──► sent to server / stored in DB
```

The server receives and stores **only ciphertext**. Decryption always happens client-side using the in-memory key. There is no server-side decryption path.

---

## Features

| Feature | Detail |
|---|---|
| **Zero-knowledge encryption** | AES-256-GCM, unique IV per entry, encrypted before upload |
| **PBKDF2 key derivation** | SHA-256, 600,000 iterations, 256-bit per-user salt |
| **Vault PIN** | 4-digit PIN stored as bcrypt hash (cost 12), gates every reveal & copy |
| **Timing-safe login** | Dummy bcrypt compare runs when email doesn't exist — prevents enumeration |
| **Rate limiting** | Login: 10/15 min · PIN: 5/15 min · Signup: 5/hr · Salt: 20/15 min |
| **Auth middleware** | Logged-in users auto-redirect away from login/signup |
| **Security headers** | HSTS (2yr), X-Frame-Options: DENY, Referrer-Policy, Permissions-Policy |
| **Session key wipe** | Encryption key cleared from sessionStorage on logout or tab close |
| **Categories** | Organize credentials: Social, Work, Banking, Shopping, Gaming, Other |
| **Search & filter** | Live search + category tab filtering with per-category counts |
| **Delete confirmation** | Animated confirmation modal before permanent deletion |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS v4 |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |
| Data fetching | TanStack Query v5 |
| Database | PostgreSQL (Neon) via Prisma 6 |
| Auth | JWT (jsonwebtoken) in httpOnly cookies |
| Edge auth | jose (JWT verification in middleware) |
| Encryption | Web Crypto API (PBKDF2 + AES-256-GCM) |
| Password hashing | bcryptjs (cost 12) |
| Font | Noto Sans Mono (Google Fonts) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (e.g. [Neon](https://neon.tech) free tier)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/justtayyabkhxn/wepass.git
cd wepass

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your values (see Environment Variables below)

# 4. Run database migrations
npx prisma migrate deploy

# 5. Generate Prisma client
npx prisma generate

# 6. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL connection string (e.g. from Neon)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# Secret for signing JWT tokens — use a long random string
JWT_SECRET="your-random-secret-here"

# 128-char hex string (64 bytes) — used by the legacy server-side vault module
# Generate with: openssl rand -hex 64
ENCRYPTION_KEY="your-128-hex-char-string"
```

> **Never commit `.env` to version control.** It is already listed in `.gitignore`.

---

## Project Structure

```
wepass/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login page (derives & stores session key)
│   │   └── signup/page.tsx         # Signup page (generates salt, derives key)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts      # Timing-safe login, sets httpOnly cookie
│   │   │   ├── logout/route.ts     # Clears token cookie
│   │   │   ├── salt/route.ts       # Returns KDF salt for email (no enumeration)
│   │   │   └── signup/route.ts     # Creates user, stores bcrypt hashes
│   │   └── vault/
│   │       ├── route.ts            # GET (list) / POST (create) — zero-knowledge
│   │       ├── [id]/route.ts       # DELETE with ownership check
│   │       └── verify-pin/route.ts # bcrypt PIN verification with rate limiting
│   ├── components/
│   │   └── MatrixRain.tsx          # Canvas-based Matrix rain background
│   ├── dashboard/
│   │   ├── page.tsx                # Server component — JWT verification
│   │   └── DashboardClient.tsx     # Client component — decrypt, PIN gate, UI
│   ├── globals.css                 # Tailwind v4 theme, Noto Sans Mono
│   ├── layout.tsx                  # Root layout with font and metadata
│   └── page.tsx                    # Landing page with security showcase
├── lib/
│   ├── auth.ts                     # JWT sign / verify utilities
│   ├── client-crypto.ts            # Web Crypto: PBKDF2 + AES-256-GCM
│   ├── prisma.ts                   # Prisma client singleton
│   ├── rateLimit.ts                # In-memory rate limiter
│   └── vault.ts                    # Legacy server-side AES-CBC (unused for new entries)
├── middleware.ts                   # Redirects logged-in users from login/signup
├── prisma/
│   └── schema.prisma               # User + Vault models
└── next.config.ts                  # Security headers
```

---

## Security Details

### Why zero-knowledge?

Traditional password managers encrypt data server-side with a single global key. If the server is compromised, all user passwords are exposed. wePass derives a **unique encryption key per user** from their master password — so compromising the server reveals nothing usable.

### Key derivation

```
PBKDF2(password, salt, iterations=600_000, keyLength=256, hash="SHA-256")
```

- Salt is 32 random bytes generated client-side at signup and stored in the DB (non-secret)
- 600,000 iterations matches the [OWASP 2023 recommendation](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- The derived key is exported to `sessionStorage` as base64 and never sent to the server

### Vault PIN

The PIN is a second factor for read access within a session. It is:
- Chosen by the user at signup (4 digits)
- Stored as a bcrypt hash (cost 12) — independent of the master password
- Required to reveal or copy any password, even after login
- Rate-limited to 5 attempts per 15 minutes before lockout

### Session key lifecycle

```
Login / Signup
  └─ key derived in browser
  └─ stored in sessionStorage

Tab closed / Logout
  └─ sessionStorage cleared
  └─ key gone from memory

Next visit
  └─ user must log in again to re-derive the key
```

### Security headers (applied to all routes)

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-XSS-Protection: 1; mode=block
```

---

## Roadmap

- [ ] Password strength meter on add
- [ ] Built-in password generator
- [ ] Edit existing vault entries
- [ ] URL field per entry with quick-visit button
- [ ] Auto-lock on idle timeout
- [ ] Import from CSV (Bitwarden / LastPass format)
- [ ] Encrypted export / backup
- [ ] Change master password (re-encrypts all entries)
- [ ] Password health report (weak / reused / old)

---

## Engineered by

**Tayyab Khan** — [justtayyabkhan.vercel.app](https://justtayyabkhan.vercel.app/)
#   w e P a s s  
 