"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

type Mode = "login" | "register";

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "REGISTRATION_FAILED");
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("INVALID_CREDENTIALS");
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("SYSTEM_ERROR");
      setLoading(false);
    }
  };

  const handleOAuth = (provider: "github" | "google") => {
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  const fieldClass =
    "w-full bg-[#0d0d0d] border border-[#333] font-mono-data text-sm text-[#e0e0e0] px-4 py-3 outline-none transition-colors placeholder:text-[#333] focus:border-[#666]";
  const labelClass =
    "block font-mono-data text-xs text-[#999] mb-2 tracking-widest";

  return (
    <div className="min-h-screen bg-[#0a0a0a] noise">
      {/* Warning Banner */}
      <div className="border-b border-[#333] bg-[#0a0a0a]">
        <div className="flex overflow-hidden py-2">
          <div className="marquee flex whitespace-nowrap font-mono-data text-xs text-[#ff3333]">
            <span className="mx-4">⚠ SECURE CONNECTION ESTABLISHED</span>
            <span className="mx-4">// AUTHENTICATION PORTAL</span>
            <span className="mx-4">⚠ SESSION ENCRYPTED</span>
            <span className="mx-4">// JWT TOKEN STRATEGY</span>
            <span className="mx-4">⚠ SECURE CONNECTION ESTABLISHED</span>
            <span className="mx-4">// AUTHENTICATION PORTAL</span>
            <span className="mx-4">⚠ SESSION ENCRYPTED</span>
            <span className="mx-4">// JWT TOKEN STRATEGY</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-[#333] px-6 py-6 md:px-12">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <Link
              href="/"
              className="font-display text-2xl tracking-tighter hover:text-[#ff3333] transition-colors md:text-3xl"
            >
              WHISTLE<span className="text-[#ff3333] blink">_</span>
            </Link>
            <span className="hidden font-mono-data text-xs text-[#666] md:inline">
              v2.4.1 // AUTH_PORTAL
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="font-mono-data text-xs text-[#ffcc00]">
              ● ENCRYPTED
            </span>
            <Link
              href="/"
              className="border border-[#333] bg-[#111] px-4 py-2 font-mono-data text-xs uppercase transition-colors hover:border-[#666] hover:text-[#fff]"
            >
              ← Back
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-lg px-6 py-16 md:px-12">
        {/* Page title */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#333]" />
            <span className="font-mono-data text-xs text-[#999]">
              ACCESS_CONTROL // IDENTITY_GATE
            </span>
            <div className="h-px flex-1 bg-[#333]" />
          </div>
          <h2 className="font-display text-4xl leading-[0.9] md:text-5xl text-center">
            {mode === "login" ? "ACCESS_PORTAL" : "CREATE_ACCOUNT"}
          </h2>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-0 mb-8">
          <button
            onClick={() => { setMode("login"); setError(""); }}
            data-sel={mode === "login"}
            className="flex-1 border-y border-l border-r border-[#333] py-3 font-mono-data text-xs uppercase tracking-widest transition-all
              data-[sel=true]:border-[#ff3333] data-[sel=true]:bg-[#ff3333]/10 data-[sel=true]:text-[#ff3333]
              data-[sel=false]:text-[#666]"
          >
            LOGIN
          </button>
          <button
            onClick={() => { setMode("register"); setError(""); }}
            data-sel={mode === "register"}
            className="flex-1 border-y border-r border-[#333] py-3 font-mono-data text-xs uppercase tracking-widest transition-all
              data-[sel=true]:border-[#ff3333] data-[sel=true]:bg-[#ff3333]/10 data-[sel=true]:text-[#ff3333]
              data-[sel=false]:text-[#666]"
          >
            REGISTER
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="border border-[#ff3333]/30 bg-[#ff3333]/5 p-4 mb-6">
            <div className="font-mono-data text-xs text-[#ff3333]">
              ⚠ ERR: {error}
            </div>
          </div>
        )}

        {/* OAuth Providers */}
        <div className="space-y-3 mb-8">
          <button
            onClick={() => handleOAuth("github")}
            className="w-full border border-[#333] bg-[#0d0d0d] px-6 py-4 font-mono-data text-sm text-[#e0e0e0] transition-all hover:border-[#fff] hover:text-white flex items-center justify-center gap-3"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            AUTHENTICATE_VIA_GITHUB
          </button>

          <button
            onClick={() => handleOAuth("google")}
            className="w-full border border-[#333] bg-[#0d0d0d] px-6 py-4 font-mono-data text-sm text-[#e0e0e0] transition-all hover:border-[#fff] hover:text-white flex items-center justify-center gap-3"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            AUTHENTICATE_VIA_GOOGLE
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[#333]" />
          <span className="font-mono-data text-xs text-[#999]">
            // OR_USE_CREDENTIALS
          </span>
          <div className="h-px flex-1 bg-[#333]" />
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleCredentials} className="space-y-6">
          {mode === "register" && (
            <div>
              <label className={labelClass}>// DISPLAY_NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                required
                className={fieldClass}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>// EMAIL_ADDRESS</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@institution.edu"
              required
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>// PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters..."
              required
              minLength={8}
              className={fieldClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full overflow-hidden border-2 border-[#ff3333] bg-[#ff3333] px-8 py-4 font-display text-sm uppercase transition-all hover:bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 group-hover:text-[#ff3333]">
              {loading
                ? "AUTHENTICATING..."
                : mode === "login"
                  ? "ACCESS_SYSTEM"
                  : "CREATE_ACCOUNT"}
            </span>
          </button>
        </form>

        {/* Security notice */}
        <div className="mt-8 border border-[#222] bg-[#0d0d0d] p-4">
          <div className="flex items-start gap-3">
            <span className="font-mono-data text-xs text-[#ffcc00] mt-0.5">
              ⚠
            </span>
            <div className="font-mono-data text-xs leading-relaxed text-[#999]">
              Authentication is used for the{" "}
              <span className="text-[#fff]">admin portal</span> and{" "}
              <span className="text-[#fff]">complaint tracking</span> only.
              Filing a complaint does{" "}
              <span className="text-[#ffcc00]">NOT</span> require an account.
              Your complaint identity remains fully anonymous and unlinked.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#333] bg-[#0a0a0a] px-6 py-8 md:px-12">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="font-mono-data text-xs text-[#999]">
            WHISTLE_SYSTEM // AUTH_PORTAL // JWT_SESSION_STRATEGY
          </div>
          <div className="font-mono-data text-[10px] text-[#999]">
            BCRYPT // OAUTH_2.0 // NEXT_AUTH_V5
          </div>
        </div>
      </footer>
    </div>
  );
}
