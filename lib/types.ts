export type ComplaintCategoryCode =
  | "ACADEMIC_MISCONDUCT"
  | "FACULTY_BEHAVIOR"
  | "INFRASTRUCTURE"
  | "ADMINISTRATION"
  | "HARASSMENT"
  | "EXAMINATION"
  | "FINANCIAL"
  | "OTHER";

export type ComplaintDepartmentCode =
  | "COMPUTER_SCIENCE"
  | "ELECTRONICS"
  | "MECHANICAL"
  | "CIVIL"
  | "CHEMICAL"
  | "MATHEMATICS"
  | "PHYSICS"
  | "MANAGEMENT"
  | "LIBRARY"
  | "EXAMINATION_CELL"
  | "ACCOUNTS"
  | "ADMINISTRATION";

export type ComplaintPriorityCode = "low" | "medium" | "high" | "critical";

export type ComplaintStatusCode =
  | "pending"
  | "under_review"
  | "investigating"
  | "resolved"
  | "dismissed";

export interface ComplaintHistoryEntry {
  statusCode: ComplaintStatusCode;
  changedAt: string;
  changedByUserId: string | null;
}

export interface ComplaintEvidence {
  id: number;
  evidenceUrl: string;
  evidenceNote: string | null;
  uploadedByRole: "complainant" | "manager";
  uploadedAt: string;
}

export interface ComplaintMessage {
  id: number;
  senderRole: "complainant" | "manager";
  managerUserId: string | null;
  messageText: string;
  createdAt: string;
}

export interface ComplaintDetail {
  complaintId: number;
  aliasId: string;
  institutionId: number | null;
  institutionSlug: string | null;
  category: ComplaintCategoryCode;
  department: ComplaintDepartmentCode;
  status: ComplaintStatusCode;
  priority: ComplaintPriorityCode;
  title: string;
  description: string;
  contentHash: string;
  submittedAt: string;
  updatedAt: string;
  history: ComplaintHistoryEntry[];
  evidences: ComplaintEvidence[];
  messages: ComplaintMessage[];
}

export interface TrackingResult {
  complaint: ComplaintDetail;
}
