import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { ComplaintDetail } from "@/lib/types";
import type { RowDataPacket } from "mysql2";

type TokenComplaintRow = RowDataPacket & {
  complaint_id: number;
  alias_id: string;
  institution_id: number | null;
  institution_slug: string | null;
  category: string;
  department: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  content_hash: string;
  submitted_at: Date | string;
  updated_at: Date | string;
};

type HistoryRow = RowDataPacket & {
  status_code: ComplaintDetail["status"];
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const secretToken = String(body.secret_token ?? "").trim();

    if (!secretToken) {
      return NextResponse.json(
        { error: "SECRET_TOKEN_REQUIRED" },
        { status: 400 },
      );
    }

    const [rows] = await pool.execute<TokenComplaintRow[]>(
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
       FROM students s
       JOIN complaints c ON c.alias_id = s.alias_id
       LEFT JOIN institutions i ON i.id = c.institution_id
       JOIN complaint_categories cc ON cc.id = c.category_id
       JOIN departments d ON d.id = c.department_id
       JOIN complaint_statuses cs ON cs.id = c.status_id
       JOIN complaint_priorities cp ON cp.id = c.priority_id
       WHERE s.session_token = ?
       LIMIT 1`,
      [secretToken],
    );

    if (!rows.length) {
      return NextResponse.json(
        { error: "INVALID_SECRET_TOKEN" },
        { status: 404 },
      );
    }

    const complaint = rows[0];
    const [historyRows] = await pool.execute<HistoryRow[]>(
      `SELECT cs.code AS status_code, h.changed_at, h.changed_by_user_id
       FROM complaint_status_history h
       JOIN complaint_statuses cs ON cs.id = h.new_status_id
       WHERE h.complaint_id = ?
       ORDER BY h.changed_at DESC, h.id DESC`,
      [complaint.complaint_id],
    );

    const [evidenceRows] = await pool.execute<EvidenceRow[]>(
      `SELECT id, evidence_url, evidence_note, uploaded_by_role, created_at
       FROM complaint_evidences
       WHERE complaint_id = ?
       ORDER BY created_at DESC, id DESC`,
      [complaint.complaint_id],
    );

    const [messageRows] = await pool.execute<MessageRow[]>(
      `SELECT id, sender_role, manager_user_id, message_text, created_at
       FROM complaint_messages
       WHERE complaint_id = ?
       ORDER BY created_at ASC, id ASC`,
      [complaint.complaint_id],
    );

    const payload: ComplaintDetail = {
      complaintId: complaint.complaint_id,
      aliasId: complaint.alias_id,
      institutionId: complaint.institution_id,
      institutionSlug: complaint.institution_slug,
      category: complaint.category as ComplaintDetail["category"],
      department: complaint.department as ComplaintDetail["department"],
      status: complaint.status as ComplaintDetail["status"],
      priority: complaint.priority as ComplaintDetail["priority"],
      title: complaint.title,
      description: complaint.description,
      contentHash: complaint.content_hash,
      submittedAt: new Date(complaint.submitted_at).toISOString(),
      updatedAt: new Date(complaint.updated_at).toISOString(),
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

    return NextResponse.json({ complaint: payload });
  } catch (error) {
    console.error("Track complaint error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
