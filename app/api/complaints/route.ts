import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { auth } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

// POST — submit a new complaint (no auth required, anonymous)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, department, title, description, priority, institution_slug } = body;

    // Validate required fields
    if (!category || !department || !title || !description || !priority) {
      return NextResponse.json(
        { error: "ALL_FIELDS_REQUIRED" },
        { status: 400 },
      );
    }

    if (title.trim().length < 8) {
      return NextResponse.json(
        { error: "TITLE_MIN_8_CHARS" },
        { status: 400 },
      );
    }

    if (description.trim().length < 30) {
      return NextResponse.json(
        { error: "DESCRIPTION_MIN_30_CHARS" },
        { status: 400 },
      );
    }

    // If institution_slug provided, verify it exists
    if (institution_slug) {
      const [inst] = await pool.execute<RowDataPacket[]>(
        "SELECT id FROM users WHERE institution_slug = ? AND role = 'manager'",
        [institution_slug],
      );
      if (!inst.length) {
        return NextResponse.json(
          { error: "INVALID_INSTITUTION" },
          { status: 404 },
        );
      }
    }

    // Generate alias_id for the complaint
    const alias_id = crypto.randomUUID();

    // Compute content hash (SHA-256 of alias + title + description + timestamp)
    const submitted_at = new Date().toISOString();
    const hashInput = alias_id + title + description + submitted_at;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(hashInput));
    const content_hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Generate secret token for tracking
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const secret_token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Insert into students table FIRST (alias vault) — FK constraint requires this before complaints
    await pool.execute(
      "INSERT INTO students (alias_id, roll_hash, session_token) VALUES (?, ?, ?)",
      [alias_id, content_hash, secret_token],
    );

    // Insert complaint
    const [result] = await pool.execute(
      `INSERT INTO complaints (alias_id, category, department, institution_slug, title, description, priority, content_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        alias_id,
        category,
        department,
        institution_slug ?? null,
        title,
        description,
        priority.toLowerCase(),
        content_hash,
      ] as any[],
    );

    const complaint_id = (result as any).insertId;

    // Insert into complaint_hash_log (blockchain-lite chain)
    // Get previous hash for chain
    const [prevRows] = await pool.execute<RowDataPacket[]>(
      "SELECT sha256_hash, block_index FROM complaint_hash_log ORDER BY block_index DESC LIMIT 1",
    );
    const previous_hash = prevRows.length ? prevRows[0].sha256_hash : "0".repeat(64);
    const block_index = prevRows.length ? prevRows[0].block_index + 1 : 1;

    // Block hash = SHA-256(previous_hash + content_hash + block_index)
    const blockInput = previous_hash + content_hash + String(block_index);
    const blockBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(blockInput));
    const block_hash = Array.from(new Uint8Array(blockBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    await pool.execute(
      `INSERT INTO complaint_hash_log (complaint_id, sha256_hash, previous_hash, block_index)
       VALUES (?, ?, ?, ?)`,
      [complaint_id, block_hash, previous_hash, block_index],
    );

    return NextResponse.json(
      {
        message: "COMPLAINT_FILED",
        alias_id,
        secret_token,
        content_hash,
        block_index,
        submitted_at,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Complaint submission error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

// GET — fetch complaints (manager only, scoped to their institution)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Get user role and institution
    const [userRows] = await pool.execute<RowDataPacket[]>(
      "SELECT role, institution_slug FROM users WHERE id = ?",
      [session.user.id],
    );

    if (!userRows.length) {
      return NextResponse.json(
        { error: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    const user = userRows[0];

    if (user.role !== "manager" && user.role !== "admin") {
      return NextResponse.json(
        { error: "FORBIDDEN_MANAGER_ONLY" },
        { status: 403 },
      );
    }

    // Admin sees all, manager sees only their institution
    let query: string;
    let params: any[];

    if (user.role === "admin") {
      query = `SELECT complaint_id, alias_id, category, department, institution_slug, 
               title, description, status, priority, content_hash, submitted_at, updated_at
               FROM complaints ORDER BY submitted_at DESC`;
      params = [];
    } else {
      if (!user.institution_slug) {
        return NextResponse.json(
          { error: "NO_INSTITUTION_CONFIGURED" },
          { status: 400 },
        );
      }
      query = `SELECT complaint_id, alias_id, category, department, institution_slug,
               title, description, status, priority, content_hash, submitted_at, updated_at
               FROM complaints WHERE institution_slug = ? ORDER BY submitted_at DESC`;
      params = [user.institution_slug];
    }

    const [complaints] = await pool.execute<RowDataPacket[]>(query, params);

    return NextResponse.json({ complaints });
  } catch (error) {
    console.error("Fetch complaints error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
