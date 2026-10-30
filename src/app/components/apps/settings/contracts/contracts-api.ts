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

export const FORM_FIELD_TYPES = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Tick box" },
  { value: "select", label: "Choice (pick one)" },
] as const;

export type ContractFormFieldType = (typeof FORM_FIELD_TYPES)[number]["value"];

/** An input the user fills in on the sign screen: {{form:key|type|Label|Option 1;Option 2|required}}. */
export interface ContractFormField {
  key: string;
  type: ContractFormFieldType;
  label: string;
  options: string[];
  required: boolean;
}

const FORM_RE = /\{\{\s*form:([^{}]*?)\s*\}\}/g;
const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

/** Same rules as the server (contract-html.util.ts), so the editor can flag mistakes as you type. */
export const extractFormFields = (html: string): { fields: ContractFormField[]; errors: string[] } => {
  const types = FORM_FIELD_TYPES.map((t) => t.value) as string[];
  const fields = new Map<string, ContractFormField>();
  const errors = new Set<string>();
  for (const match of String(html ?? "").matchAll(FORM_RE)) {
    const parts = decodeEntities(match[1].replace(/<[^>]*>/g, "")).split("|").map((p) => p.trim());
    const key = parts[0] ?? "";
    const type = (parts[1] || "text").toLowerCase();
    if (!/^[a-z][a-z0-9_]{0,59}$/.test(key)) {
      errors.add(`Form field "${key}" needs a key of lowercase letters, numbers and _ (e.g. principal_trade).`);
      continue;
    }
    if (!types.includes(type)) {
      errors.add(`Form field "${key}" has an unknown type "${parts[1]}".`);
      continue;
    }
    const rest = parts.slice(3);
    const optionsPart = rest.find((p) => p && !["required", "optional"].includes(p.toLowerCase()));
    const options =
      type === "select" && optionsPart
        ? [...new Set(optionsPart.split(";").map((o) => o.trim()).filter(Boolean))]
        : [];
    if (type === "select" && options.length < 2) {
      errors.add(`Form field "${key}" is a choice, so it needs at least two options separated by ";".`);
      continue;
    }
    const field: ContractFormField = {
      key,
      type: type as ContractFormFieldType,
      label: (parts[2] || key.replace(/_/g, " ")).slice(0, 190),
      options,
      required: rest.some((p) => p.toLowerCase() === "required"),
    };
    const seen = fields.get(key);
    if (!seen) fields.set(key, field);
    else if (JSON.stringify(seen) !== JSON.stringify(field)) {
      errors.add(`Form field "${key}" is used twice with different settings. Use a different key.`);
    }
  }
  return { fields: [...fields.values()], errors: [...errors] };
};

/** The text inserted into the wording for a form field. */
export const buildFormToken = (field: ContractFormField) => {
  const clean = (v: string) => v.replace(/[|{}]/g, " ").replace(/\s+/g, " ").trim();
  const parts = [field.key, field.type, clean(field.label)];
  if (field.type === "select") parts.push(field.options.map((o) => clean(o).replace(/;/g, ",")).filter(Boolean).join(";"));
  if (field.required) parts.push("required");
  return `{{form:${parts.join("|")}}}`;
};

/** label → key: "CSCS card expiry" → "cscs_card_expiry". */
export const toFormKey = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^[^a-z]+|_+$/g, "")
    .slice(0, 60);

export interface ContractGroup {
  id: number;
  name: string;
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
  form_field_count: number;
  /** User groups whose members are asked to sign. */
  groups: ContractGroup[];
  latest_version: {
    version_no: number;
    change_type: "MAJOR" | "MINOR";
    /** The "What changed?" note from publishing it. */
    change_note: string | null;
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
  form_fields: ContractFormField[];
  form_errors: string[];
  has_unpublished_changes: boolean;
  company_id: number;
  audience: ContractAudience;
  /** User groups whose members are asked to sign. */
  groups: ContractGroup[];
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

/** A user holding a signed copy of a template. */
export interface ContractSigner {
  user_id: number;
  name: string | null;
  contract_id: number;
  version_no: number | null;
  signed_at: string | null;
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

export type ContractReviewStatus = "AWAITING" | "APPROVED" | "REJECTED";

export interface ContractSummary {
  id: number;
  company_id: number;
  company_name: string | null;
  template_title: string | null;
  version_no: number | null;
  /** The "What changed?" note from publishing this version. */
  change_note: string | null;
  status: "PENDING" | "SIGNED" | "SUPERSEDED" | "VOID" | "REJECTED";
  day_rate: number | null;
  signed_at: string | null;
  expires_at: string | null;
  requested_at: string | null;
  reminded_at: string | null;
  reminder_count: number;
  has_pdf: boolean;
  /** Review by a user with the Contract Approvals permission; null before signing. */
  review_status: ContractReviewStatus | null;
  reviewed_at: string | null;
  /** Approval note, or why it was rejected. */
  review_note: string | null;
  /** The user's answers to the contract's form fields. */
  form_answers: { key: string; label: string; type: string; value: string; display: string }[];
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
  /** The "What changed?" note of the version waiting to be signed. */
  change_note: string | null;
  missing_company_fields: string[];
  template_title: string | null;
  current_version_no: number | null;
  signed: ContractSummary | null;
  pending: ContractSummary | null;
}

/** dd/MM/yyyy → yyyy-MM-dd for <input type="date">. */
export const toInputDate = (value?: string | null) => {
  if (!value) return "";
  const [d, m, y] = value.split("/");
  return d && m && y ? `${y}-${m}-${d}` : "";
};

/** Opens an authenticated PDF download (PDFs are not on public links). */
export const downloadContractPdf = async (contractId: number, title?: string | null) => {
  // Callers show the toast; a blob error body hides the server message from the global interceptor.
  const res = await api
    .get(`contracts/${contractId}/pdf`, { responseType: "blob", skipToast: true } as any)
    .catch(async (error) => {
      const body = error?.response?.data;
      if (body instanceof Blob) {
        try {
          error.response.data = JSON.parse(await body.text());
        } catch {
          error.response.data = {};
        }
      }
      throw error;
    });
  const disposition: string = res.headers?.["content-disposition"] ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const url = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  const fallback = (title ?? "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "contract";
  link.download = match?.[1] ?? `${fallback}-${contractId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export type ApprovalTab = "awaiting" | "approved" | "rejected";

/** A signed contract as the reviewer sees it. */
export interface ContractApproval extends ContractSummary {
  user_id: number;
  user_name: string | null;
  user_image: string | null;
  user_thumb_image: string | null;
  reviewed_by_name: string | null;
  can_review: boolean;
}

export interface ContractApprovalsResponse {
  counts: Record<ApprovalTab, number>;
  total: number;
  page: number;
  limit: number;
  templates: { id: number; title: string }[];
  items: ContractApproval[];
}
