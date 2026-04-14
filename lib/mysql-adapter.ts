import type {
  Adapter,
  AdapterUser,
  AdapterAccount,
  AdapterSession,
} from "next-auth/adapters";
import pool from "./db";
import type { RowDataPacket } from "mysql2";

export function MySQLAdapter(): Adapter {
  return {
    async createUser(user) {
      const id = crypto.randomUUID();
      await pool.execute(
        "INSERT INTO users (id, name, email, emailVerified, image) VALUES (?, ?, ?, ?, ?)",
        [
          id,
          user.name ?? null,
          user.email,
          user.emailVerified ?? null,
          user.image ?? null,
        ],
      );
      return { ...user, id } as AdapterUser;
    },

    async getUser(id) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        "SELECT * FROM users WHERE id = ?",
        [id],
      );
      if (!rows.length) return null;
      return mapUser(rows[0]);
    },

    async getUserByEmail(email) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        "SELECT * FROM users WHERE email = ?",
        [email],
      );
      if (!rows.length) return null;
      return mapUser(rows[0]);
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT u.* FROM users u
         JOIN accounts a ON u.id = a.userId
         WHERE a.provider = ? AND a.providerAccountId = ?`,
        [provider, providerAccountId],
      );
      if (!rows.length) return null;
      return mapUser(rows[0]);
    },

    async updateUser(user) {
      const fields: string[] = [];
      const values: unknown[] = [];
      if (user.name !== undefined) {
        fields.push("name = ?");
        values.push(user.name);
      }
      if (user.email !== undefined) {
        fields.push("email = ?");
        values.push(user.email);
      }
      if (user.emailVerified !== undefined) {
        fields.push("emailVerified = ?");
        values.push(user.emailVerified);
      }
      if (user.image !== undefined) {
        fields.push("image = ?");
        values.push(user.image);
      }
      if (fields.length) {
        values.push(user.id);
        await pool.execute(
          `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
          values as any[],
        );
      }
      const [rows] = await pool.execute<RowDataPacket[]>(
        "SELECT * FROM users WHERE id = ?",
        [user.id],
      );
      return mapUser(rows[0]);
    },

    async deleteUser(userId) {
      await pool.execute("DELETE FROM users WHERE id = ?", [userId]);
    },

    async linkAccount(account) {
      const id = crypto.randomUUID();
      await pool.execute(
        `INSERT INTO accounts (id, userId, type, provider, providerAccountId,
         refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refresh_token ?? null,
          account.access_token ?? null,
          account.expires_at ?? null,
          account.token_type ?? null,
          account.scope ?? null,
          account.id_token ?? null,
          account.session_state ?? null,
        ] as any[],
      );
      return account as AdapterAccount;
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await pool.execute(
        "DELETE FROM accounts WHERE provider = ? AND providerAccountId = ?",
        [provider, providerAccountId],
      );
    },

    async createSession(session) {
      const id = crypto.randomUUID();
      await pool.execute(
        "INSERT INTO sessions (id, sessionToken, userId, expires) VALUES (?, ?, ?, ?)",
        [id, session.sessionToken, session.userId, session.expires],
      );
      return session as AdapterSession;
    },

    async getSessionAndUser(sessionToken) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT s.*, u.id as u_id, u.name as u_name, u.email as u_email,
         u.emailVerified as u_emailVerified, u.image as u_image, u.role as u_role
         FROM sessions s JOIN users u ON s.userId = u.id
         WHERE s.sessionToken = ?`,
        [sessionToken],
      );
      if (!rows.length) return null;
      const row = rows[0];
      return {
        session: {
          sessionToken: row.sessionToken,
          userId: row.userId,
          expires: new Date(row.expires),
        },
        user: {
          id: row.u_id,
          name: row.u_name,
          email: row.u_email,
          emailVerified: row.u_emailVerified
            ? new Date(row.u_emailVerified)
            : null,
          image: row.u_image,
          role: row.u_role,
        } as AdapterUser,
      };
    },

    async updateSession(session) {
      if (session.expires) {
        await pool.execute(
          "UPDATE sessions SET expires = ? WHERE sessionToken = ?",
          [session.expires, session.sessionToken],
        );
      }
      return session as AdapterSession;
    },

    async deleteSession(sessionToken) {
      await pool.execute("DELETE FROM sessions WHERE sessionToken = ?", [
        sessionToken,
      ]);
    },

    async createVerificationToken(token) {
      await pool.execute(
        "INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)",
        [token.identifier, token.token, token.expires],
      );
      return token;
    },

    async useVerificationToken({ identifier, token }) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        "SELECT * FROM verification_tokens WHERE identifier = ? AND token = ?",
        [identifier, token],
      );
      if (!rows.length) return null;
      await pool.execute(
        "DELETE FROM verification_tokens WHERE identifier = ? AND token = ?",
        [identifier, token],
      );
      return {
        identifier: rows[0].identifier,
        token: rows[0].token,
        expires: new Date(rows[0].expires),
      };
    },
  };
}

function mapUser(row: RowDataPacket): AdapterUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified ? new Date(row.emailVerified) : null,
    image: row.image,
  } as AdapterUser;
}
