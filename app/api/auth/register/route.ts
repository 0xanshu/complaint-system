import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "EMAIL_AND_PASSWORD_REQUIRED" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "PASSWORD_MIN_8_CHARS" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "EMAIL_ALREADY_REGISTERED" },
        { status: 409 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const id = crypto.randomUUID();
    await pool.execute(
      "INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
      [id, name ?? null, email, hashedPassword, "student"],
    );

    return NextResponse.json(
      { message: "ACCOUNT_CREATED", userId: id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  } 
}
