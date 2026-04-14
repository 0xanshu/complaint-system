import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { auth } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

// POST — manager sets up their institution (creates the public link)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { institution_name, institution_slug } = await req.json();

    if (!institution_name || !institution_slug) {
      return NextResponse.json(
        { error: "NAME_AND_SLUG_REQUIRED" },
        { status: 400 },
      );
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slugRegex = /^[a-z0-9][a-z0-9-]{2,48}[a-z0-9]$/;
    if (!slugRegex.test(institution_slug)) {
      return NextResponse.json(
        { error: "INVALID_SLUG_FORMAT" },
        { status: 400 },
      );
    }

    // Check user and current institution link
    const [userRows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id, u.institution_id, i.institution_slug
       FROM users u
       LEFT JOIN institutions i ON i.id = u.institution_id
       WHERE u.id = ?`,
      [session.user.id],
    );

    if (!userRows.length) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    let institutionId: number;
    const current = userRows[0];

    if (
      current.institution_slug === institution_slug &&
      current.institution_id
    ) {
      institutionId = current.institution_id;
      await pool.execute(
        "UPDATE institutions SET institution_name = ? WHERE id = ?",
        [institution_name, institutionId],
      );
    } else {
      const [existing] = await pool.execute<RowDataPacket[]>(
        "SELECT id FROM institutions WHERE institution_slug = ?",
        [institution_slug],
      );

      if (existing.length) {
        return NextResponse.json(
          { error: "SLUG_ALREADY_TAKEN" },
          { status: 409 },
        );
      }

      const [inserted] = await pool.execute<ResultSetHeader>(
        "INSERT INTO institutions (institution_name, institution_slug) VALUES (?, ?)",
        [institution_name, institution_slug],
      );
      institutionId = inserted.insertId;
    }

    await pool.execute(
      "UPDATE users SET role = 'manager', institution_id = ? WHERE id = ?",
      [institutionId, session.user.id],
    );

    return NextResponse.json({
      message: "INSTITUTION_CONFIGURED",
      institution_name,
      institution_slug,
      public_url: `/report/${institution_slug}`,
    });
  } catch (error) {
    console.error("Institution setup error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

// GET — get current user's institution info
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.role, i.institution_name, i.institution_slug
       FROM users u
       LEFT JOIN institutions i ON i.id = u.institution_id
       WHERE u.id = ?`,
      [session.user.id],
    );

    if (!rows.length) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      role: rows[0].role,
      institution_name: rows[0].institution_name,
      institution_slug: rows[0].institution_slug,
    });
  } catch (error) {
    console.error("Institution fetch error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
