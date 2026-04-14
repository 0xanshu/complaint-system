"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ComplaintDetail, ComplaintStatusCode } from "@/lib/types";

interface Complaint {
  complaint_id: number;
  alias_id: string;
  category: string;
  department: string;
  institution_slug: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  content_hash: string;
  submitted_at: string;
  updated_at: string;
}

interface InstitutionInfo {
  role: string;
  institution_name: string | null;
  institution_slug: string | null;
}

const STATUS_OPTIONS: ComplaintStatusCode[] = [
  "pending",
  "under_review",
  "investigating",
  "resolved",
  "dismissed",
];

const STATUS_TRANSITIONS: Record<ComplaintStatusCode, ComplaintStatusCode[]> = {
  pending: ["under_review", "dismissed"],
  under_review: ["investigating", "resolved", "dismissed"],
  investigating: ["resolved", "dismissed"],
  resolved: [],
  dismissed: [],
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-[#ffcc00] border-[#ffcc00]/30 bg-[#ffcc00]/5",
  under_review: "text-[#ff8800] border-[#ff8800]/30 bg-[#ff8800]/5",
  investigating: "text-[#00aaff] border-[#00aaff]/30 bg-[#00aaff]/5",
  resolved: "text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/5",
  dismissed: "text-[#666] border-[#666]/30 bg-[#666]/5",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-[#666]",
  medium: "text-[#ffcc00]",
  high: "text-[#ff8800]",
  critical: "text-[#ff3333]",
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [institution, setInstitution] = useState<InstitutionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Institution setup form
  const [showSetup, setShowSetup] = useState(false);
  const [instName, setInstName] = useState("");
  const [instSlug, setInstSlug] = useState("");
  const [setupError, setSetupError] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  // Expanded complaint
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [complaintDetails, setComplaintDetails] = useState<
    Record<number, ComplaintDetail>
  >({});
  const [statusDrafts, setStatusDrafts] = useState<
    Record<number, ComplaintStatusCode>
  >({});
  const [messageDrafts, setMessageDrafts] = useState<Record<number, string>>(
    {},
  );
  const [evidenceUrlDrafts, setEvidenceUrlDrafts] = useState<
    Record<number, string>
  >({});
  const [evidenceNoteDrafts, setEvidenceNoteDrafts] = useState<
    Record<number, string>
  >({});
  const [savingStatusId, setSavingStatusId] = useState<number | null>(null);
  const [sendingMessageId, setSendingMessageId] = useState<number | null>(null);
  const [addingEvidenceId, setAddingEvidenceId] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchInstitution();
    }
  }, [status]);

  useEffect(() => {
    if (!expandedId || complaintDetails[expandedId]) {
      return;
    }

    void fetchComplaintDetail(expandedId);
  }, [expandedId, complaintDetails]);

  const fetchInstitution = async () => {
    try {
      const res = await fetch("/api/institution");
      const data = await res.json();
      if (res.ok) {
        setInstitution(data);
        if (data.institution_slug) {
          fetchComplaints();
        } else {
          setLoading(false);
        }
      } else {
        setError(data.error);
        setLoading(false);
      }
    } catch {
      setError("FAILED_TO_LOAD");
      setLoading(false);
    }
  };

  const fetchComplaints = async () => {
    try {
      const res = await fetch("/api/complaints");
      const data = await res.json();
      if (res.ok) {
        setComplaints(data.complaints);
      } else {
        setError(data.error);
      }
    } catch {
      setError("FAILED_TO_LOAD_COMPLAINTS");
    } finally {
      setLoading(false);
    }
  };

  const fetchComplaintDetail = async (complaintId: number) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}`);
      const data = await res.json();
      if (!res.ok) {
        return;
      }

      setComplaintDetails((prev) => ({
        ...prev,
        [complaintId]: data.complaint,
      }));
      setStatusDrafts((prev) => ({
        ...prev,
        [complaintId]: data.complaint.status,
      }));
    } catch {
      // handled in UI by absence of timeline
    }
  };

  const updateComplaintStatus = async (complaintId: number) => {
    const detail = complaintDetails[complaintId];
    const nextStatus = statusDrafts[complaintId];
    if (!nextStatus) return;

    if (
      detail &&
      !STATUS_TRANSITIONS[detail.status].includes(nextStatus) &&
      detail.status !== nextStatus
    ) {
      setError("INVALID_STATUS_TRANSITION");
      return;
    }

    setSavingStatusId(complaintId);
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_code: nextStatus }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "STATUS_UPDATE_FAILED");
        return;
      }

      setComplaintDetails((prev) => ({
        ...prev,
        [complaintId]: data.complaint,
      }));
      setStatusDrafts((prev) => ({
        ...prev,
        [complaintId]: data.complaint.status,
      }));
      await fetchComplaints();
    } catch {
      setError("STATUS_UPDATE_FAILED");
    } finally {
      setSavingStatusId(null);
    }
  };

  const sendManagerMessage = async (complaintId: number) => {
    const message = (messageDrafts[complaintId] ?? "").trim();
    if (!message) return;

    setSendingMessageId(complaintId);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_text: message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "MESSAGE_SEND_FAILED");
        return;
      }

      setMessageDrafts((prev) => ({ ...prev, [complaintId]: "" }));
      await fetchComplaintDetail(complaintId);
    } catch {
      setError("MESSAGE_SEND_FAILED");
    } finally {
      setSendingMessageId(null);
    }
  };

  const addManagerEvidence = async (complaintId: number) => {
    const evidenceUrl = (evidenceUrlDrafts[complaintId] ?? "").trim();
    const evidenceNote = (evidenceNoteDrafts[complaintId] ?? "").trim();
    if (!evidenceUrl) return;

    setAddingEvidenceId(complaintId);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/evidences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidence_url: evidenceUrl,
          evidence_note: evidenceNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "EVIDENCE_ADD_FAILED");
        return;
      }

      setEvidenceUrlDrafts((prev) => ({ ...prev, [complaintId]: "" }));
      setEvidenceNoteDrafts((prev) => ({ ...prev, [complaintId]: "" }));
      await fetchComplaintDetail(complaintId);
    } catch {
      setError("EVIDENCE_ADD_FAILED");
    } finally {
      setAddingEvidenceId(null);
    }
  };

  const handleSetupInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError("");
    setSetupLoading(true);

    try {
      const res = await fetch("/api/institution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution_name: instName,
          institution_slug: instSlug,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSetupError(data.error);
        setSetupLoading(false);
        return;
      }

      setInstitution({
        role: "manager",
        institution_name: instName,
        institution_slug: instSlug,
      });
      setShowSetup(false);
      setSetupLoading(false);
      fetchComplaints();
    } catch {
      setSetupError("NETWORK_ERROR");
      setSetupLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="font-mono-data text-sm text-[#ffcc00] animate-pulse">
          LOADING_DASHBOARD...
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const fieldClass =
    "w-full bg-[#0d0d0d] border border-[#333] font-mono-data text-sm text-[#e0e0e0] px-4 py-3 outline-none transition-colors placeholder:text-[#333] focus:border-[#666]";
  const labelClass =
    "block font-mono-data text-xs text-[#999] mb-2 tracking-widest";

  return (
    <div className="min-h-screen bg-[#0a0a0a] noise">
      {/* Banner */}
      <div className="border-b border-[#333] bg-[#0a0a0a]">
        <div className="flex overflow-hidden py-2">
          <div className="marquee flex whitespace-nowrap font-mono-data text-xs text-[#ff3333]">
            <span className="mx-4">⚠ MANAGER_DASHBOARD</span>
            <span className="mx-4">// COMPLAINT MANAGEMENT SYSTEM</span>
            <span className="mx-4">⚠ AUTHORIZED ACCESS ONLY</span>
            <span className="mx-4">
              //{" "}
              {institution?.institution_name?.toUpperCase() || "WHISTLE_SYSTEM"}
            </span>
            <span className="mx-4">⚠ MANAGER_DASHBOARD</span>
            <span className="mx-4">// COMPLAINT MANAGEMENT SYSTEM</span>
            <span className="mx-4">⚠ AUTHORIZED ACCESS ONLY</span>
            <span className="mx-4">
              //{" "}
              {institution?.institution_name?.toUpperCase() || "WHISTLE_SYSTEM"}
            </span>
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
              v2.4.1 // DASHBOARD
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono-data text-xs text-[#999]">
              {session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="border border-[#333] bg-[#111] px-4 py-2 font-mono-data text-xs uppercase transition-colors hover:border-[#ff3333] hover:text-[#ff3333]"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 md:px-12">
        {/* Page title */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#333]" />
            <span className="font-mono-data text-xs text-[#999]">
              MANAGER_PANEL // COMPLAINT_OVERVIEW
            </span>
            <div className="h-px flex-1 bg-[#333]" />
          </div>
          <h2 className="font-display text-4xl leading-[0.9] md:text-5xl">
            DASHBOARD
          </h2>
        </div>

        {/* Error */}
        {error && (
          <div className="border border-[#ff3333]/30 bg-[#ff3333]/5 p-4 mb-6">
            <div className="font-mono-data text-xs text-[#ff3333]">
              ⚠ ERR: {error}
            </div>
          </div>
        )}

        {/* Institution Setup / Info */}
        {institution && !institution.institution_slug ? (
          // No institution configured yet
          <div className="mb-10">
            {!showSetup ? (
              <div className="border border-[#ffcc00]/30 bg-[#ffcc00]/5 p-6">
                <div className="font-display text-lg text-[#ffcc00] mb-2">
                  SETUP_REQUIRED
                </div>
                <div className="font-mono-data text-xs text-[#999] mb-4">
                  Configure your institution to generate a public complaint link
                  and start receiving reports.
                </div>
                <button
                  onClick={() => setShowSetup(true)}
                  className="group relative overflow-hidden border-2 border-[#ff3333] bg-[#ff3333] px-6 py-3 font-display text-sm uppercase transition-all hover:bg-transparent"
                >
                  <span className="relative z-10 group-hover:text-[#ff3333]">
                    Configure Institution
                  </span>
                </button>
              </div>
            ) : (
              <div className="border border-[#333] bg-[#0d0d0d] p-6">
                <div className="font-mono-data text-xs text-[#666] mb-6">
                  // INSTITUTION_SETUP
                </div>

                {setupError && (
                  <div className="border border-[#ff3333]/30 bg-[#ff3333]/5 p-4 mb-4">
                    <div className="font-mono-data text-xs text-[#ff3333]">
                      ⚠ ERR: {setupError}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSetupInstitution} className="space-y-4">
                  <div>
                    <label className={labelClass}>// INSTITUTION_NAME</label>
                    <input
                      type="text"
                      value={instName}
                      onChange={(e) => {
                        setInstName(e.target.value);
                        setInstSlug(generateSlug(e.target.value));
                      }}
                      placeholder="e.g. Delhi Technological University"
                      required
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>// URL_SLUG</label>
                    <input
                      type="text"
                      value={instSlug}
                      onChange={(e) =>
                        setInstSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        )
                      }
                      placeholder="e.g. delhi-tech-university"
                      required
                      className={fieldClass}
                    />
                    <div className="font-mono-data text-[10px] text-[#666] mt-1">
                      PUBLIC_URL:{" "}
                      {typeof window !== "undefined"
                        ? window.location.origin
                        : ""}
                      /report/{instSlug || "your-slug"}
                    </div>
                  </div>
                  <div className="flex gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={setupLoading}
                      className="group relative overflow-hidden border-2 border-[#ff3333] bg-[#ff3333] px-6 py-3 font-display text-sm uppercase transition-all hover:bg-transparent disabled:opacity-50"
                    >
                      <span className="relative z-10 group-hover:text-[#ff3333]">
                        {setupLoading ? "SAVING..." : "Create Link"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSetup(false)}
                      className="border border-[#333] px-6 py-3 font-display text-sm uppercase text-[#888] transition-all hover:border-[#666] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : institution?.institution_slug ? (
          // Institution configured — show info bar
          <div className="mb-10 border border-[#333] bg-[#0d0d0d] p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="font-mono-data text-[10px] text-[#666] mb-1 tracking-widest">
                  INSTITUTION
                </div>
                <div className="font-display text-lg">
                  {institution.institution_name}
                </div>
              </div>
              <div>
                <div className="font-mono-data text-[10px] text-[#666] mb-1 tracking-widest">
                  PUBLIC_COMPLAINT_LINK
                </div>
                <div className="flex items-center gap-2">
                  <code className="font-mono-data text-xs text-[#ffcc00]">
                    {typeof window !== "undefined"
                      ? window.location.origin
                      : ""}
                    /report/{institution.institution_slug}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/report/${institution.institution_slug}`,
                      );
                    }}
                    className="font-mono-data text-[10px] border border-[#333] px-2 py-1 text-[#666] hover:border-[#ffcc00] hover:text-[#ffcc00] transition-colors"
                  >
                    COPY
                  </button>
                </div>
              </div>
              <div>
                <div className="font-mono-data text-[10px] text-[#666] mb-1 tracking-widest">
                  TOTAL_COMPLAINTS
                </div>
                <div className="font-display text-2xl text-[#ff3333]">
                  {complaints.length}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Complaints List */}
        {institution?.institution_slug && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                "pending",
                "under_review",
                "investigating",
                "resolved",
                "dismissed",
              ].map((s) => (
                <div key={s} className="border border-[#222] p-4">
                  <div className="font-mono-data text-[10px] text-[#666] tracking-widest mb-1">
                    {s.toUpperCase()}
                  </div>
                  <div
                    className={`font-display text-2xl ${STATUS_COLORS[s]?.split(" ")[0] || "text-white"}`}
                  >
                    {complaints.filter((c) => c.status === s).length}
                  </div>
                </div>
              ))}
            </div>

            {/* Complaints table */}
            {complaints.length === 0 ? (
              <div className="border border-[#222] bg-[#0d0d0d] p-12 text-center">
                <div className="font-display text-xl text-[#666] mb-2">
                  NO_COMPLAINTS
                </div>
                <div className="font-mono-data text-xs text-[#999]">
                  No complaints have been filed yet. Share your public link to
                  start receiving reports.
                </div>
              </div>
            ) : (
              <div className="border border-[#333]">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_120px_100px_100px_140px] gap-4 border-b border-[#333] bg-[#111] px-6 py-3">
                  <span className="font-mono-data text-[10px] text-[#666] tracking-widest">
                    TITLE
                  </span>
                  <span className="font-mono-data text-[10px] text-[#666] tracking-widest">
                    CATEGORY
                  </span>
                  <span className="font-mono-data text-[10px] text-[#666] tracking-widest">
                    PRIORITY
                  </span>
                  <span className="font-mono-data text-[10px] text-[#666] tracking-widest">
                    STATUS
                  </span>
                  <span className="font-mono-data text-[10px] text-[#666] tracking-widest">
                    DATE
                  </span>
                </div>

                {/* Rows */}
                {complaints.map((c) => {
                  const detail = complaintDetails[c.complaint_id];
                  const currentStatus = (detail?.status ??
                    c.status) as ComplaintStatusCode;
                  const allowedNextStatuses = STATUS_TRANSITIONS[currentStatus];
                  const statusOptions = [
                    currentStatus,
                    ...allowedNextStatuses,
                  ].filter(
                    (value, index, array) => array.indexOf(value) === index,
                  );

                  return (
                    <div key={c.complaint_id}>
                      <button
                        onClick={() =>
                          setExpandedId(
                            expandedId === c.complaint_id
                              ? null
                              : c.complaint_id,
                          )
                        }
                        className="w-full grid grid-cols-[1fr_120px_100px_100px_140px] gap-4 border-b border-[#1a1a1a] px-6 py-4 text-left hover:bg-[#111] transition-colors"
                      >
                        <span className="font-mono-data text-xs text-[#e0e0e0] truncate">
                          {c.title}
                        </span>
                        <span className="font-mono-data text-[10px] text-[#999]">
                          {c.category}
                        </span>
                        <span
                          className={`font-mono-data text-[10px] uppercase ${PRIORITY_COLORS[c.priority] || "text-[#999]"}`}
                        >
                          {c.priority}
                        </span>
                        <span
                          className={`font-mono-data text-[10px] px-2 py-0.5 border inline-block ${STATUS_COLORS[currentStatus] || "text-[#999]"}`}
                        >
                          {currentStatus}
                        </span>
                        <span className="font-mono-data text-[10px] text-[#666]">
                          {new Date(c.submitted_at).toLocaleDateString()}
                        </span>
                      </button>

                      {expandedId === c.complaint_id && (
                        <div className="border-b border-[#1a1a1a] bg-[#0d0d0d] px-6 py-6">
                          <div className="mb-6 grid grid-cols-[120px_1fr] gap-4 text-xs">
                            <span className="font-mono-data text-[#666]">
                              ALIAS_ID
                            </span>
                            <span className="font-mono-data text-[#999] break-all">
                              {c.alias_id}
                            </span>

                            <span className="font-mono-data text-[#666]">
                              DEPARTMENT
                            </span>
                            <span className="font-mono-data text-[#e0e0e0]">
                              {c.department}
                            </span>

                            <span className="font-mono-data text-[#666]">
                              DESCRIPTION
                            </span>
                            <span className="font-mono-data text-[#e0e0e0] leading-relaxed whitespace-pre-wrap">
                              {c.description}
                            </span>

                            <span className="font-mono-data text-[#666]">
                              CONTENT_HASH
                            </span>
                            <span className="font-mono-data text-[#999] break-all text-[10px]">
                              {c.content_hash}
                            </span>

                            <span className="font-mono-data text-[#666]">
                              SUBMITTED
                            </span>
                            <span className="font-mono-data text-[#999]">
                              {new Date(c.submitted_at).toLocaleString()}
                            </span>

                            <span className="font-mono-data text-[#666]">
                              UPDATED
                            </span>
                            <span className="font-mono-data text-[#999]">
                              {new Date(c.updated_at).toLocaleString()}
                            </span>
                          </div>

                          <div className="mb-6 border border-[#222] bg-[#111] p-4">
                            <div className="mb-3 font-mono-data text-[10px] text-[#666] tracking-widest">
                              STATUS_CONTROL
                            </div>
                            <div className="flex flex-col gap-3 md:flex-row md:items-end">
                              <div className="flex-1">
                                <label className="mb-2 block font-mono-data text-xs text-[#999]">
                                  // CHANGE_STATUS
                                </label>
                                <select
                                  value={
                                    statusDrafts[c.complaint_id] ??
                                    currentStatus
                                  }
                                  onChange={(event) =>
                                    setStatusDrafts((prev) => ({
                                      ...prev,
                                      [c.complaint_id]: event.target
                                        .value as ComplaintStatusCode,
                                    }))
                                  }
                                  disabled={allowedNextStatuses.length === 0}
                                  className="w-full border border-[#333] bg-[#0a0a0a] px-4 py-3 font-mono-data text-sm text-[#e0e0e0] outline-none focus:border-[#666]"
                                >
                                  {statusOptions.map((statusOption) => (
                                    <option
                                      key={statusOption}
                                      value={statusOption}
                                    >
                                      {statusOption.toUpperCase()}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                onClick={() =>
                                  updateComplaintStatus(c.complaint_id)
                                }
                                disabled={
                                  savingStatusId === c.complaint_id ||
                                  allowedNextStatuses.length === 0
                                }
                                className="border-2 border-[#ff3333] bg-[#ff3333] px-5 py-3 font-display text-xs uppercase transition-colors hover:bg-transparent hover:text-[#ff3333] disabled:opacity-50"
                              >
                                {allowedNextStatuses.length === 0
                                  ? "STATUS LOCKED"
                                  : savingStatusId === c.complaint_id
                                    ? "UPDATING..."
                                    : "Save Status"}
                              </button>
                            </div>
                            {allowedNextStatuses.length === 0 && (
                              <div className="mt-3 font-mono-data text-[10px] text-[#ffcc00]">
                                This complaint is in a terminal state. Create a
                                new complaint to test workflow changes, or use a
                                fresh record that is not resolved/dismissed yet.
                              </div>
                            )}
                          </div>

                          <div className="border border-[#222] bg-[#111] p-4">
                            <div className="mb-3 font-mono-data text-[10px] text-[#666] tracking-widest">
                              STATUS_HISTORY
                            </div>
                            {detail?.history?.length ? (
                              <div className="space-y-3">
                                {detail.history.map((entry, index) => (
                                  <div
                                    key={`${entry.statusCode}-${entry.changedAt}-${index}`}
                                    className="border-l border-[#333] pl-4"
                                  >
                                    <div className="font-mono-data text-xs text-[#e0e0e0]">
                                      {entry.statusCode.toUpperCase()}
                                    </div>
                                    <div className="font-mono-data text-[10px] text-[#666]">
                                      {new Date(
                                        entry.changedAt,
                                      ).toLocaleString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="font-mono-data text-xs text-[#666]">
                                No status history yet. This complaint has not
                                been updated.
                              </div>
                            )}
                          </div>

                          <div className="mt-6 border border-[#222] bg-[#111] p-4">
                            <div className="mb-3 font-mono-data text-[10px] text-[#666] tracking-widest">
                              EVIDENCE_ATTACHMENTS
                            </div>
                            {detail?.evidences?.length ? (
                              <div className="mb-4 space-y-2">
                                {detail.evidences.map((evidence) => (
                                  <div
                                    key={evidence.id}
                                    className="border border-[#222] p-3"
                                  >
                                    <a
                                      href={evidence.evidenceUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-mono-data text-xs text-[#ffcc00] hover:underline break-all"
                                    >
                                      {evidence.evidenceUrl}
                                    </a>
                                    {evidence.evidenceNote && (
                                      <div className="mt-1 font-mono-data text-[10px] text-[#999]">
                                        NOTE: {evidence.evidenceNote}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mb-4 font-mono-data text-xs text-[#666]">
                                No evidence links attached yet.
                              </div>
                            )}

                            <div className="space-y-3 border border-[#222] bg-[#0a0a0a] p-4">
                              <div className="font-mono-data text-[10px] text-[#666] tracking-widest">
                                ADD_EVIDENCE
                              </div>
                              <input
                                value={evidenceUrlDrafts[c.complaint_id] ?? ""}
                                onChange={(event) =>
                                  setEvidenceUrlDrafts((prev) => ({
                                    ...prev,
                                    [c.complaint_id]: event.target.value,
                                  }))
                                }
                                placeholder="Evidence URL"
                                className="w-full border border-[#333] bg-[#111] px-4 py-3 font-mono-data text-xs text-[#e0e0e0] outline-none focus:border-[#666]"
                              />
                              <input
                                value={evidenceNoteDrafts[c.complaint_id] ?? ""}
                                onChange={(event) =>
                                  setEvidenceNoteDrafts((prev) => ({
                                    ...prev,
                                    [c.complaint_id]: event.target.value,
                                  }))
                                }
                                placeholder="Optional note"
                                className="w-full border border-[#333] bg-[#111] px-4 py-3 font-mono-data text-xs text-[#e0e0e0] outline-none focus:border-[#666]"
                              />
                              <button
                                onClick={() =>
                                  addManagerEvidence(c.complaint_id)
                                }
                                disabled={addingEvidenceId === c.complaint_id}
                                className="border border-[#ff3333] bg-[#ff3333] px-4 py-2 font-mono-data text-[10px] uppercase transition-colors hover:bg-transparent hover:text-[#ff3333] disabled:opacity-50"
                              >
                                {addingEvidenceId === c.complaint_id
                                  ? "ADDING..."
                                  : "Attach Evidence"}
                              </button>
                            </div>
                          </div>

                          <div className="mt-6 border border-[#222] bg-[#111] p-4">
                            <div className="mb-3 font-mono-data text-[10px] text-[#666] tracking-widest">
                              ANONYMOUS_THREAD
                            </div>
                            {detail?.messages?.length ? (
                              <div className="mb-4 space-y-3">
                                {detail.messages.map((message) => (
                                  <div
                                    key={message.id}
                                    className={`border p-3 ${
                                      message.senderRole === "manager"
                                        ? "border-[#ff3333]/40 bg-[#ff3333]/5"
                                        : "border-[#222] bg-[#0a0a0a]"
                                    }`}
                                  >
                                    <div className="mb-1 font-mono-data text-[10px] text-[#666]">
                                      {message.senderRole.toUpperCase()} //{" "}
                                      {new Date(
                                        message.createdAt,
                                      ).toLocaleString()}
                                    </div>
                                    <div className="font-mono-data text-xs text-[#e0e0e0] whitespace-pre-wrap">
                                      {message.messageText}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mb-4 font-mono-data text-xs text-[#666]">
                                No messages yet.
                              </div>
                            )}

                            <div className="space-y-3 border border-[#222] bg-[#0a0a0a] p-4">
                              <div className="font-mono-data text-[10px] text-[#666] tracking-widest">
                                SEND_REPLY_TO_COMPLAINANT
                              </div>
                              <textarea
                                value={messageDrafts[c.complaint_id] ?? ""}
                                onChange={(event) =>
                                  setMessageDrafts((prev) => ({
                                    ...prev,
                                    [c.complaint_id]: event.target.value,
                                  }))
                                }
                                rows={4}
                                placeholder="Ask follow-up questions or share status updates"
                                className="w-full resize-none border border-[#333] bg-[#111] px-4 py-3 font-mono-data text-xs text-[#e0e0e0] outline-none focus:border-[#666]"
                              />
                              <button
                                onClick={() =>
                                  sendManagerMessage(c.complaint_id)
                                }
                                disabled={sendingMessageId === c.complaint_id}
                                className="border border-[#ff3333] bg-[#ff3333] px-4 py-2 font-mono-data text-[10px] uppercase transition-colors hover:bg-transparent hover:text-[#ff3333] disabled:opacity-50"
                              >
                                {sendingMessageId === c.complaint_id
                                  ? "SENDING..."
                                  : "Send Message"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#333] bg-[#0a0a0a] px-6 py-8 md:px-12">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="font-mono-data text-xs text-[#999]">
            WHISTLE_SYSTEM // MANAGER_DASHBOARD
          </div>
          <div className="font-mono-data text-[10px] text-[#999]">
            ANONYMOUS_COMPLAINT_SYSTEM
          </div>
        </div>
      </footer>
    </div>
  );
}
