import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { auth } from "@/lib/auth";
import type { ComplaintStatusCode, ComplaintDetail } from "@/lib/types";
import type { RowDataPacket } from "mysql2";

const STATUS_TRANSITIONS: Record<ComplaintStatusCode, ComplaintStatusCode[]> = {
  pending: ["under_review", "dismissed"],
  under_review: ["investigating", "resolved", "dismissed"],
  investigating: ["resolved", "dismissed"],
  resolved: [],
  dismissed: [],
};

type ComplaintRow = RowDataPacket & {
  complaint_id: number;
  alias_id: string;
  institution_id: number | null;
  institution_slug: string | null;
  category: ComplaintStatusCode | string;
  department: string;
  status: ComplaintStatusCode;
  priority: string;
  title: string;
  description: string;
  content_hash: string;
  submitted_at: Date | string;
  updated_at: Date | string;
};

type HistoryRow = RowDataPacket & {
  status_code: ComplaintStatusCode;
  changed_at: Date | string;
  changed_by_user_id: string | null;
};

type EvidenceRow = RowDataPacket & {
  id: number;
  evidence_url: string;
  evidence_note: string | null;
  uploaded_by_role: "complainant" | "manager";
  created_at: Date | string;
};

type MessageRow = RowDataPacket & {
  id: number;
  sender_role: "complainant" | "manager";
  manager_user_id: string | null;
  message_text: string;
  created_at: Date | string;
};

async function loadComplaintDetail(
  complaintId: number,
): Promise<ComplaintDetail | null> {
  const [complaintRows] = await pool.execute<ComplaintRow[]>(
    `SELECT
       c.complaint_id,
       c.alias_id,
       c.institution_id,
       i.institution_slug,
       cc.code AS category,
       d.code AS department,
       cs.code AS status,
       cp.code AS priority,
       c.title,
       c.description,
       c.content_hash,
       c.submitted_at,
       c.updated_at
     FROM complaints c
     LEFT JOIN institutions i ON i.id = c.institution_id
     JOIN complaint_categories cc ON cc.id = c.category_id
     JOIN departments d ON d.id = c.department_id
     JOIN complaint_statuses cs ON cs.id = c.status_id
     JOIN complaint_priorities cp ON cp.id = c.priority_id
     WHERE c.complaint_id = ?
     LIMIT 1`,
    [complaintId],
  );

  if (!complaintRows.length) return null;

  const [historyRows] = await pool.execute<HistoryRow[]>(
    `SELECT cs.code AS status_code, h.changed_at, h.changed_by_user_id
     FROM complaint_status_history h
     JOIN complaint_statuses cs ON cs.id = h.new_status_id
     WHERE h.complaint_id = ?
     ORDER BY h.changed_at DESC, h.id DESC`,
    [complaintId],
  );

  const [evidenceRows] = await pool.execute<EvidenceRow[]>(
    `SELECT id, evidence_url, evidence_note, uploaded_by_role, created_at
     FROM complaint_evidences
     WHERE complaint_id = ?
     ORDER BY created_at DESC, id DESC`,
    [complaintId],
  );

  const [messageRows] = await pool.execute<MessageRow[]>(
    `SELECT id, sender_role, manager_user_id, message_text, created_at
     FROM complaint_messages
     WHERE complaint_id = ?
     ORDER BY created_at ASC, id ASC`,
    [complaintId],
  );

  const row = complaintRows[0];

  return {
    complaintId: row.complaint_id,
    aliasId: row.alias_id,
    institutionId: row.institution_id,
    institutionSlug: row.institution_slug,
    category: row.category as ComplaintDetail["category"],
    department: row.department as ComplaintDetail["department"],
    status: row.status,
    priority: row.priority as ComplaintDetail["priority"],
    title: row.title,
    description: row.description,
    contentHash: row.content_hash,
    submittedAt: new Date(row.submitted_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    history: historyRows.map((history) => ({
      statusCode: history.status_code,
      changedAt: new Date(history.changed_at).toISOString(),
      changedByUserId: history.changed_by_user_id,
    })),
    evidences: evidenceRows.map((evidence) => ({
      id: evidence.id,
      evidenceUrl: evidence.evidence_url,
      evidenceNote: evidence.evidence_note,
      uploadedByRole: evidence.uploaded_by_role,
      uploadedAt: new Date(evidence.created_at).toISOString(),
    })),
    messages: messageRows.map((message) => ({
      id: message.id,
      senderRole: message.sender_role,
      managerUserId: message.manager_user_id,
      messageText: message.message_text,
      createdAt: new Date(message.created_at).toISOString(),
    })),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const complaintId = Number(id);
  if (!Number.isInteger(complaintId)) {
    return NextResponse.json(
      { error: "INVALID_COMPLAINT_ID" },
      { status: 400 },
    );
  }

  const [userRows] = await pool.execute<RowDataPacket[]>(
    "SELECT role, institution_id FROM users WHERE id = ?",
    [session.user.id],
  );

  if (!userRows.length) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  const user = userRows[0];
  if (user.role !== "manager" && user.role !== "admin") {
    return NextResponse.json(
      { error: "FORBIDDEN_MANAGER_ONLY" },
      { status: 403 },
    );
  }

  const detail = await loadComplaintDetail(complaintId);
  if (!detail) {
    return NextResponse.json({ error: "COMPLAINT_NOT_FOUND" }, { status: 404 });
  }

  if (user.role !== "admin" && user.institution_id !== detail.institutionId) {
    return NextResponse.json(
      { error: "FORBIDDEN_MANAGER_ONLY" },
      { status: 403 },
    );
  }

  return NextResponse.json({ complaint: detail });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const complaintId = Number(id);
  if (!Number.isInteger(complaintId)) {
    return NextResponse.json(
      { error: "INVALID_COMPLAINT_ID" },
      { status: 400 },
    );
  }

  const body = await req.json();
  const nextStatus = String(body.status_code ?? "")
    .trim()
    .toLowerCase() as ComplaintStatusCode;
  if (!(nextStatus in STATUS_TRANSITIONS)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  const [userRows] = await pool.execute<RowDataPacket[]>(
    "SELECT role, institution_id FROM users WHERE id = ?",
    [session.user.id],
  );

  if (!userRows.length) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  const user = userRows[0];
  if (user.role !== "manager" && user.role !== "admin") {
    return NextResponse.json(
      { error: "FORBIDDEN_MANAGER_ONLY" },
      { status: 403 },
    );
  }

  const detail = await loadComplaintDetail(complaintId);
  if (!detail) {
    return NextResponse.json({ error: "COMPLAINT_NOT_FOUND" }, { status: 404 });
  }

  if (user.role !== "admin" && user.institution_id !== detail.institutionId) {
    return NextResponse.json(
      { error: "FORBIDDEN_MANAGER_ONLY" },
      { status: 403 },
    );
  }

  if (detail.status === nextStatus) {
    return NextResponse.json({ error: "STATUS_UNCHANGED" }, { status: 400 });
  }

  if (!STATUS_TRANSITIONS[detail.status].includes(nextStatus)) {
    return NextResponse.json(
      { error: "INVALID_STATUS_TRANSITION" },
      { status: 409 },
    );
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [statusRows] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM complaint_statuses WHERE code = ?",
      [nextStatus],
    );
    if (!statusRows.length) {
      await connection.rollback();
      return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
    }

    await connection.execute("SET @app_changed_by_user_id = ?", [
      session.user.id,
    ]);
    await connection.execute(
      "UPDATE complaints SET status_id = ? WHERE complaint_id = ?",
      [statusRows[0].id, complaintId],
    );
    await connection.execute("SET @app_changed_by_user_id = NULL");

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error("Update complaint status error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }

  const updated = await loadComplaintDetail(complaintId);
  return NextResponse.json({ complaint: updated });
}
