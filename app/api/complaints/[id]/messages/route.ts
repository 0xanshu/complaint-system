import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { auth } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
    const messageText = String(body.message_text ?? "").trim();
    if (!messageText) {
      return NextResponse.json({ error: "MESSAGE_REQUIRED" }, { status: 400 });
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

    const [complaintRows] = await pool.execute<RowDataPacket[]>(
      "SELECT institution_id FROM complaints WHERE complaint_id = ?",
      [complaintId],
    );

    if (!complaintRows.length) {
      return NextResponse.json(
        { error: "COMPLAINT_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (
      user.role !== "admin" &&
      complaintRows[0].institution_id !== user.institution_id
    ) {
      return NextResponse.json(
        { error: "FORBIDDEN_MANAGER_ONLY" },
        { status: 403 },
      );
    }

    await pool.execute(
      `INSERT INTO complaint_messages (complaint_id, sender_role, manager_user_id, message_text)
       VALUES (?, 'manager', ?, ?)`,
      [complaintId, session.user.id, messageText],
    );

    return NextResponse.json({ message: "MESSAGE_SENT" }, { status: 201 });
  } catch (error) {
    console.error("Manager message error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
