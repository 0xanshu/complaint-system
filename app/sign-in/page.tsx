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
      <main className="mx-auto max-w-lg px-6 pt-8 pb-16 md:px-12">
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
            onClick={() => {
              setMode("login");
              setError("");
            }}
            data-sel={mode === "login"}
            className="flex-1  cursor-pointer  border-y border-l border-r border-[#333] py-3 font-mono-data text-xs uppercase tracking-widest transition-all
              data-[sel=true]:border-[#ff3333] data-[sel=true]:bg-[#ff3333]/10 data-[sel=true]:text-[#ff3333]
              data-[sel=false]:text-[#666]"
          >
            LOGIN
          </button>
          <button
            onClick={() => {
              setMode("register");
              setError("");
            }}
            data-sel={mode === "register"}
            className="flex-1 cursor-pointer  border-y border-r border-[#333] py-3 font-mono-data text-xs uppercase tracking-widest transition-all
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
            className="group cursor-pointer relative w-full overflow-hidden border-2 border-[#ff3333] bg-[#ff3333] px-8 py-4 font-display text-sm uppercase transition-all hover:bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
