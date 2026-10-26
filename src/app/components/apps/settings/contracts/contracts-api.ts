import api from "@/utils/axios";

export type ContractAudience = "ALL_EXCEPT" | "ONLY_SELECTED";

export interface ContractField {
  key: string;
  label: string;
  source: string;
  side: "user" | "company" | "system";
  fillable?: boolean;
  placeholder?: string;
}

/** A contract's own rules. */
export interface ContractRules {
  /** On: users must sign before they can start work. Off: asked to sign, not blocked. */
  is_required: boolean;
  expiry_months: number | null;
  required_from: string | null; // dd/MM/yyyy
}

export interface ContractTemplateRow extends ContractRules {
  id: number;
  title: string;
  is_active: boolean;
  status: "PUBLISHED" | "DRAFT";
  has_unpublished_changes: boolean;
  field_count: number;
  companies: { id: number; name: string | null }[];
  latest_version: {
    version_no: number;
    change_type: "MAJOR" | "MINOR";
    published_at: string | null;
    published_by_name: string;
  } | null;
  signed_count: number;
  pending_count: number;
}

export interface ContractTemplateDetail extends ContractRules {
  id: number;
  title: string;
  is_active: boolean;
  body_html: string;
  has_unpublished_changes: boolean;
  companies: { id: number; name: string }[];
  fields: ContractField[];
  versions: {
    id: number;
    version_no: number;
    change_type: "MAJOR" | "MINOR";
    change_note: string | null;
    published_at: string | null;
    published_by_name: string;
    is_current: boolean;
  }[];
}

export interface ContractRequirementRow {
  id: number;
  user_id: number;
  name: string | null;
  type: "EXEMPT" | "INCLUDE";
  reason: string | null;
  valid_until: string | null;
  created_by_name: string | null;
  created_at: string | null;
}

export interface ContractUserRow {
  user_id: number;
  name: string;
  trade: string | null;
  team: string | null;
  must_sign: boolean;
  contract_status: "SIGNED" | "PENDING" | "NOT_SIGNED" | "NOT_REQUIRED";
  requirement: { id: number; type: string; reason: string | null; valid_until: string | null } | null;
}

export interface ContractSummary {
  id: number;
  company_id: number;
  company_name: string | null;
  template_title: string | null;
  version_no: number | null;
  status: "PENDING" | "SIGNED" | "SUPERSEDED" | "VOID";
  reason: string;
  reason_detail: string | null;
  day_rate: number | null;
  signed_at: string | null;
  expires_at: string | null;
  requested_at: string | null;
  reminded_at: string | null;
  reminder_count: number;
  has_pdf: boolean;
  signing_record: {
    signed_at: string | null;
    ip: string | null;
    device: string | null;
    document_sha256: string | null;
  } | null;
}

export type CompanyContractStatus =
  | "SIGNED"
  | "WAITING"
  | "DETAILS_MISSING"
  | "NOT_REQUIRED"
  | "NO_TEMPLATE"
  | "NOT_ENABLED";

/** One card per company template (or one NO_TEMPLATE card for a company without any). */
export interface UserCompanyContract {
  company_id: number;
  company_name: string;
  template_id: number | null;
  status: CompanyContractStatus;
  blocks_start_work: boolean;
  must_sign: boolean;
  requirement: { id: number; type: string; reason: string | null; valid_until: string | null } | null;
  reason: string | null;
  reason_detail: string | null;
  missing_company_fields: string[];
  template_title: string | null;
  current_version_no: number | null;
  signed: ContractSummary | null;
  pending: ContractSummary | null;
}

export const REASON_LABELS: Record<string, string> = {
  NEW: "First contract",
  COMPANY_JOIN: "Joined company",
  RATE_CHANGE: "Day rate changed",
  TERMS_CHANGE: "Terms changed",
  EXPIRY: "Contract expired",
  MANUAL: "Requested by manager",
};

/** dd/MM/yyyy → yyyy-MM-dd for <input type="date">. */
export const toInputDate = (value?: string | null) => {
  if (!value) return "";
  const [d, m, y] = value.split("/");
  return d && m && y ? `${y}-${m}-${d}` : "";
};

/** Opens an authenticated PDF download (PDFs are not on public links). */
export const downloadContractPdf = async (contractId: number) => {
  const res = await api.get(`contracts/${contractId}/pdf`, { responseType: "blob" });
  const disposition: string = res.headers?.["content-disposition"] ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const url = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = match?.[1] ?? `contract-${contractId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
