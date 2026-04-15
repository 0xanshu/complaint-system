import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { auth } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

// POST — submit a new complaint (no auth required, anonymous)
export async function POST(req: NextRequest) {
  let connection: Awaited<ReturnType<typeof pool.getConnection>> | null = null;

  try {
    const body = await req.json();
    const {
      category,
      department,
      title,
      description,
      priority,
      institution_slug,
      evidence_urls,
    } = body;

    // Validate required fields
    if (!category || !department || !title || !description || !priority) {
      return NextResponse.json(
        { error: "ALL_FIELDS_REQUIRED" },
        { status: 400 },
      );
    }

    if (title.trim().length < 8) {
      return NextResponse.json({ error: "TITLE_MIN_8_CHARS" }, { status: 400 });
    }

    if (description.trim().length < 30) {
      return NextResponse.json(
        { error: "DESCRIPTION_MIN_30_CHARS" },
        { status: 400 },
      );
    }

    const categoryCode = String(category).trim().toUpperCase();
    const departmentCode = String(department).trim().toUpperCase();
    const priorityCode = String(priority).trim().toLowerCase();
    const evidenceUrls = Array.isArray(evidence_urls)
      ? evidence_urls
          .map((value) => String(value).trim())
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];

    // If institution_slug provided, verify it exists
    let institutionId: number | null = null;
    if (institution_slug) {
      const [inst] = await pool.execute<RowDataPacket[]>(
        "SELECT id FROM institutions WHERE institution_slug = ?",
        [institution_slug],
      );
      if (!inst.length) {
        return NextResponse.json(
          { error: "INVALID_INSTITUTION" },
          { status: 404 },
        );
      }
      institutionId = inst[0].id;
    }

    const [categoryRows] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM complaint_categories WHERE code = ?",
      [categoryCode],
    );
    if (!categoryRows.length) {
      return NextResponse.json({ error: "INVALID_CATEGORY" }, { status: 400 });
    }

    const [departmentRows] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM departments WHERE code = ?",
      [departmentCode],
    );
    if (!departmentRows.length) {
      return NextResponse.json(
        { error: "INVALID_DEPARTMENT" },
        { status: 400 },
      );
    }

    const [priorityRows] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM complaint_priorities WHERE code = ?",
      [priorityCode],
    );
    if (!priorityRows.length) {
      return NextResponse.json({ error: "INVALID_PRIORITY" }, { status: 400 });
    }

    const [statusRows] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM complaint_statuses WHERE code = 'pending'",
    );
    if (!statusRows.length) {
      return NextResponse.json(
        { error: "STATUS_LOOKUP_MISSING" },
        { status: 500 },
      );
    }

    const categoryId = categoryRows[0].id;
    const departmentId = departmentRows[0].id;
    const priorityId = priorityRows[0].id;
    const statusId = statusRows[0].id;

    // Generate alias_id for the complaint
    const alias_id = crypto.randomUUID();

    // Compute content hash (SHA-256 of alias + title + description + timestamp)
    const submitted_at = new Date().toISOString();
    const hashInput = alias_id + title + description + submitted_at;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(hashInput),
    );
    const content_hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Generate secret token for tracking
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const secret_token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Insert into students table FIRST (alias vault) — FK constraint requires this before complaints
    await connection.execute(
      "INSERT INTO students (alias_id, roll_hash, session_token) VALUES (?, ?, ?)",
      [alias_id, content_hash, secret_token],
    );

    // Insert complaint
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO complaints (
         alias_id,
         institution_id,
         category_id,
         department_id,
         status_id,
         priority_id,
         title,
         description,
         content_hash
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        alias_id,
        institutionId,
        categoryId,
        departmentId,
        statusId,
        priorityId,
        title,
        description,
        content_hash,
      ],
    );

    const complaint_id = result.insertId;

    if (evidenceUrls.length > 0) {
      for (const url of evidenceUrls) {
        await connection.execute(
          `INSERT INTO complaint_evidences (complaint_id, evidence_url, uploaded_by_role)
           VALUES (?, ?, 'complainant')`,
          [complaint_id, url],
        );
      }
    }

    await connection.commit();
    connection.release();
    connection = null;

    return NextResponse.json(
      {
        message: "COMPLAINT_FILED",
        alias_id,
        secret_token,
        submitted_at,
      },
      { status: 201 },
    );
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
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
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // Get user role and institution
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

    // Admin sees all, manager sees only their institution
    let query = `SELECT complaint_id, alias_id, category, department, institution_slug,
                 title, description, status, priority, content_hash, submitted_at, updated_at
                 FROM vw_complaint_dashboard`;
    const params: any[] = [];

    if (user.role === "admin") {
    } else {
      if (!user.institution_id) {
        return NextResponse.json(
          { error: "NO_INSTITUTION_CONFIGURED" },
          { status: 400 },
        );
      }
      query += " WHERE institution_id = ?";
      params.push(user.institution_id);
    }

    query += " ORDER BY submitted_at DESC";

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
