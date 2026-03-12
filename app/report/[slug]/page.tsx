import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { notFound } from "next/navigation";
import ComplaintForm from "@/components/complaint-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function InstitutionReportPage({ params }: Props) {
  const { slug } = await params;

  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT institution_name, institution_slug FROM users WHERE institution_slug = ? AND role = 'manager' LIMIT 1",
    [slug],
  );

  if (!rows.length) {
    notFound();
  }

  const institution = rows[0];

  return (
    <ComplaintForm
      institutionName={institution.institution_name}
      institutionSlug={institution.institution_slug}
    />
  );
}
