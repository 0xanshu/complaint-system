"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ComplaintDetail } from "@/lib/types";

const STATUS_LABELS: Record<ComplaintDetail["status"], string> = {
  pending: "Pending",
  under_review: "Under Review",
  investigating: "Investigating",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function TrackPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [messageText, setMessageText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const history = useMemo(() => complaint?.history ?? [], [complaint]);

  const reloadComplaint = async (activeToken: string) => {
    const response = await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret_token: activeToken }),
    });
    const data = await response.json();
    if (response.ok) {
      setComplaint(data.complaint);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setComplaint(null);

    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret_token: token }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "TRACKING_FAILED");
        return;
      }

      setComplaint(data.complaint);
    } catch {
      setError("NETWORK_ERROR");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageText.trim() || !token.trim()) return;

    setActionLoading(true);
    setError("");
    try {
      const response = await fetch("/api/track/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret_token: token,
          message_text: messageText,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "MESSAGE_FAILED");
        return;
      }

      setMessageText("");
      await reloadComplaint(token);
    } catch {
      setError("NETWORK_ERROR");
    } finally {
      setActionLoading(false);
    }
  };

  const addEvidence = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!evidenceUrl.trim() || !token.trim()) return;

    setActionLoading(true);
    setError("");
    try {
      const response = await fetch("/api/track/evidences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret_token: token,
          evidence_url: evidenceUrl,
          evidence_note: evidenceNote,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "EVIDENCE_FAILED");
        return;
      }

      setEvidenceUrl("");
      setEvidenceNote("");
      await reloadComplaint(token);
    } catch {
      setError("NETWORK_ERROR");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] noise text-white">
      <header className="border-b border-[#333] px-6 py-6 md:px-12">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-2xl tracking-tighter md:text-3xl"
          >
            WHISTLE<span className="text-[#ff3333]">_</span>
          </Link>
          <Link
            href="/sign-in"
            className="border border-[#333] bg-[#111] px-4 py-2 font-mono-data text-xs uppercase text-[#999] transition-colors hover:border-[#ff3333] hover:text-white"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 md:px-12">
        <div className="mb-8">
          <div className="font-mono-data text-xs text-[#999]">
            ANONYMOUS_TRACKING // SECRET_TOKEN_LOOKUP
          </div>
          <h1 className="mt-3 font-display text-4xl md:text-6xl">
            TRACK COMPLAINT
          </h1>
          <p className="mt-4 max-w-2xl font-mono-data text-sm text-[#888]">
            Enter the secret token shown once after submission to view the
            latest complaint status and timeline.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mb-8 space-y-4 border border-[#222] bg-[#0d0d0d] p-6"
        >
          <div>
            <label className="mb-2 block font-mono-data text-xs text-[#999]">
              // SECRET_TOKEN
            </label>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value.trim())}
              className="w-full border border-[#333] bg-[#111] px-4 py-3 font-mono-data text-sm text-[#e0e0e0] outline-none focus:border-[#666]"
              placeholder="Paste the 64-char token here"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="border-2 border-[#ff3333] bg-[#ff3333] px-6 py-3 font-display text-sm uppercase transition-colors hover:bg-transparent hover:text-[#ff3333] disabled:opacity-50"
          >
            {loading ? "LOOKING UP..." : "Track Status"}
          </button>
        </form>

        {error && (
          <div className="mb-6 border border-[#ff3333]/30 bg-[#ff3333]/5 p-4 font-mono-data text-xs text-[#ff3333]">
            ERR: {error}
          </div>
        )}

        {complaint && (
          <div className="space-y-6">
            <section className="border border-[#333] bg-[#0d0d0d] p-6">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono-data text-xs text-[#999]">
                    COMPLAINT_ID {complaint.complaintId}
                  </div>
                  <h2 className="mt-2 font-display text-3xl">
                    {complaint.title}
                  </h2>
                </div>
                <div className="border border-[#333] px-3 py-2 font-mono-data text-xs text-[#ffcc00]">
                  {STATUS_LABELS[complaint.status]}
                </div>
              </div>
              <p className="font-mono-data text-sm leading-relaxed text-[#888] whitespace-pre-wrap">
                {complaint.description}
              </p>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="border border-[#222] p-4">
                <div className="font-mono-data text-[10px] text-[#666]">
                  CATEGORY
                </div>
                <div className="mt-2 font-mono-data text-sm text-[#e0e0e0]">
                  {complaint.category}
                </div>
              </div>
              <div className="border border-[#222] p-4">
                <div className="font-mono-data text-[10px] text-[#666]">
                  DEPARTMENT
                </div>
                <div className="mt-2 font-mono-data text-sm text-[#e0e0e0]">
                  {complaint.department}
                </div>
              </div>
              <div className="border border-[#222] p-4">
                <div className="font-mono-data text-[10px] text-[#666]">
                  PRIORITY
                </div>
                <div className="mt-2 font-mono-data text-sm text-[#e0e0e0]">
                  {complaint.priority}
                </div>
              </div>
              <div className="border border-[#222] p-4">
                <div className="font-mono-data text-[10px] text-[#666]">
                  INSTITUTION
                </div>
                <div className="mt-2 font-mono-data text-sm text-[#e0e0e0]">
                  {complaint.institutionSlug || "ANONYMOUS_CHANNEL"}
                </div>
              </div>
            </section>

            <section className="border border-[#333] bg-[#0d0d0d] p-6">
              <div className="mb-4 font-mono-data text-xs text-[#999]">
                STATUS_TIMELINE
              </div>
              {history.length === 0 ? (
                <div className="font-mono-data text-sm text-[#666]">
                  No status changes yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((entry, index) => (
                    <div
                      key={`${entry.statusCode}-${entry.changedAt}-${index}`}
                      className="border-l border-[#333] pl-4"
                    >
                      <div className="font-mono-data text-sm text-[#e0e0e0]">
                        {STATUS_LABELS[entry.statusCode]}
                      </div>
                      <div className="font-mono-data text-[10px] text-[#666]">
                        {formatDate(entry.changedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="border border-[#333] bg-[#0d0d0d] p-6">
              <div className="mb-4 font-mono-data text-xs text-[#999]">
                EVIDENCE_ATTACHMENTS
              </div>

              {complaint.evidences.length === 0 ? (
                <div className="mb-4 font-mono-data text-sm text-[#666]">
                  No evidence links attached yet.
                </div>
              ) : (
                <div className="mb-4 space-y-3">
                  {complaint.evidences.map((evidence) => (
                    <div key={evidence.id} className="border border-[#222] p-3">
                      <a
                        href={evidence.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono-data text-xs text-[#ffcc00] hover:underline break-all"
                      >
                        {evidence.evidenceUrl}
                      </a>
                      {evidence.evidenceNote && (
                        <div className="mt-2 font-mono-data text-[11px] text-[#999]">
                          NOTE: {evidence.evidenceNote}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={addEvidence}
                className="space-y-3 border border-[#222] bg-[#111] p-4"
              >
                <div className="font-mono-data text-[10px] text-[#666] tracking-widest">
                  ADD_MORE_EVIDENCE
                </div>
                <input
                  value={evidenceUrl}
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  placeholder="Evidence URL"
                  className="w-full border border-[#333] bg-[#0a0a0a] px-4 py-3 font-mono-data text-sm text-[#e0e0e0] outline-none focus:border-[#666]"
                />
                <input
                  value={evidenceNote}
                  onChange={(event) => setEvidenceNote(event.target.value)}
                  placeholder="Optional note"
                  className="w-full border border-[#333] bg-[#0a0a0a] px-4 py-3 font-mono-data text-sm text-[#e0e0e0] outline-none focus:border-[#666]"
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="border border-[#ff3333] bg-[#ff3333] px-4 py-2 font-mono-data text-xs uppercase transition-colors hover:bg-transparent hover:text-[#ff3333] disabled:opacity-50"
                >
                  {actionLoading ? "ADDING..." : "Add Evidence"}
                </button>
              </form>
            </section>

            <section className="border border-[#333] bg-[#0d0d0d] p-6">
              <div className="mb-4 font-mono-data text-xs text-[#999]">
                ANONYMOUS_THREAD
              </div>

              {complaint.messages.length === 0 ? (
                <div className="mb-4 font-mono-data text-sm text-[#666]">
                  No messages yet.
                </div>
              ) : (
                <div className="mb-4 space-y-3">
                  {complaint.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`border p-3 ${
                        message.senderRole === "manager"
                          ? "border-[#ff3333]/40 bg-[#ff3333]/5"
                          : "border-[#222] bg-[#111]"
                      }`}
                    >
                      <div className="mb-2 font-mono-data text-[10px] text-[#666]">
                        {message.senderRole.toUpperCase()} //{" "}
                        {formatDate(message.createdAt)}
                      </div>
                      <div className="font-mono-data text-xs text-[#e0e0e0] whitespace-pre-wrap">
                        {message.messageText}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={sendMessage}
                className="space-y-3 border border-[#222] bg-[#111] p-4"
              >
                <div className="font-mono-data text-[10px] text-[#666] tracking-widest">
                  SEND_ANONYMOUS_REPLY
                </div>
                <textarea
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  rows={4}
                  placeholder="Write a follow-up update or answer manager questions"
                  className="w-full resize-none border border-[#333] bg-[#0a0a0a] px-4 py-3 font-mono-data text-sm text-[#e0e0e0] outline-none focus:border-[#666]"
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="border border-[#ff3333] bg-[#ff3333] px-4 py-2 font-mono-data text-xs uppercase transition-colors hover:bg-transparent hover:text-[#ff3333] disabled:opacity-50"
                >
                  {actionLoading ? "SENDING..." : "Send Message"}
                </button>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
