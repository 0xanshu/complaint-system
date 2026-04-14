import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const secretToken = String(body.secret_token ?? "").trim();
    const messageText = String(body.message_text ?? "").trim();

    if (!secretToken) {
      return NextResponse.json(
        { error: "SECRET_TOKEN_REQUIRED" },
        { status: 400 },
      );
    }
    if (!messageText) {
      return NextResponse.json({ error: "MESSAGE_REQUIRED" }, { status: 400 });
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
      `INSERT INTO complaint_messages (complaint_id, sender_role, manager_user_id, message_text)
       VALUES (?, 'complainant', NULL, ?)`,
      [rows[0].complaint_id, messageText],
    );

    return NextResponse.json({ message: "MESSAGE_SENT" }, { status: 201 });
  } catch (error) {
    console.error("Complainant message error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
