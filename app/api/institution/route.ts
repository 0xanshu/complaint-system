import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { auth } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

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

    // Check slug uniqueness
    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE institution_slug = ? AND id != ?",
      [institution_slug, session.user.id],
    );
    if (existing.length) {
      return NextResponse.json(
        { error: "SLUG_ALREADY_TAKEN" },
        { status: 409 },
      );
    }

    // Update user: set role to manager + institution info
    await pool.execute(
      `UPDATE users SET role = 'manager', institution_name = ?, institution_slug = ? WHERE id = ?`,
      [institution_name, institution_slug, session.user.id],
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
      "SELECT role, institution_name, institution_slug FROM users WHERE id = ?",
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
