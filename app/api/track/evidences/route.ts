import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const secretToken = String(body.secret_token ?? "").trim();
    const evidenceUrl = String(body.evidence_url ?? "").trim();
    const evidenceNote = String(body.evidence_note ?? "").trim();

    if (!secretToken) {
      return NextResponse.json(
        { error: "SECRET_TOKEN_REQUIRED" },
        { status: 400 },
      );
    }
    if (!evidenceUrl) {
      return NextResponse.json(
        { error: "EVIDENCE_URL_REQUIRED" },
        { status: 400 },
      );
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT c.complaint_id FROM students s JOIN complaints c ON c.alias_id = s.alias_id WHERE s.session_token = ? LIMIT 1",
      [secretToken],
    );

    if (!rows.length) {
      return NextResponse.json(
        { error: "INVALID_SECRET_TOKEN" },
        { status: 404 },
      );
    }

    await pool.execute(
      `INSERT INTO complaint_evidences (complaint_id, evidence_url, evidence_note, uploaded_by_role)
       VALUES (?, ?, ?, 'complainant')`,
      [rows[0].complaint_id, evidenceUrl, evidenceNote || null],
    );

    return NextResponse.json({ message: "EVIDENCE_ADDED" }, { status: 201 });
  } catch (error) {
    console.error("Complainant evidence error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
