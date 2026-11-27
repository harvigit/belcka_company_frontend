// Surveys (web): shared types and helpers.

export type SurveyStatus = "draft" | "assigned" | "in_progress" | "submitted" | "qs_review" | "completed" | "frozen";

export type SurveyRow = {
  id: number;
  reference: string;
  title: string;
  project: { id: number; name: string } | null;
  address: { id: number; name: string } | null;
  surveyor: { id: number; name: string; image: string | null } | null;
  survey_date: string | null;
  template_name: string | null;
  status: SurveyStatus;
  status_label: string;
  editable: boolean;
  has_property_detail: boolean;
  pd_shared: boolean;
  created_at: string;
};

export type PdSection = { section: string; items: { label: string; value: string }[] };
export type PdAiStatus = "none" | "done" | "failed" | "no_key";

export type PropertyDetail = {
  file_name: string | null;
  file_size: number | null;
  url: string | null;
  details: PdSection[] | null;
  ai_status: PdAiStatus;
  shared: boolean;
  uploaded_by?: string | null;
  uploaded_at?: string | null;
};

export type SurveyDetail = {
  id: number;
  reference: string;
  title: string;
  project: { id: number; name: string; code: string | null; uplift_percent: number } | null;
  address: { id: number; name: string } | null;
  template_id: number | null;
  template_name: string | null;
  surveyor: { id: number; name: string; image: string | null } | null;
  assigned_by: string | null;
  assigned_at: string | null;
  survey_date: string | null;
  notes: string | null;
  rework_notes: string | null;
  started_at: string | null;
  submitted_at: string | null;
  qs_started_at?: string | null;
  qs_completed_at?: string | null;
  status: SurveyStatus;
  status_label: string;
  editable: boolean;
  rooms: string[];
  counts: { rooms: number; groups: number; elements: number };
  property_detail: PropertyDetail | null;
  created_by: string | null;
  created_at: string;
  history: { id: number; action: string; message: string; user: string | null; source: string; created_at: string }[];
};

export type SurveyOptions = {
  projects: { id: number; name: string; code: string | null; uplift_percent: number }[];
  templates: { id: number; name: string; rooms: string[]; elements: number }[];
  surveyors: { id: number; name: string; image: string | null; open_surveys: number }[];
  next_reference: string;
  ai_enabled: boolean;
};

// Upload made by "surveys/property-detail/read": saved with the survey through its upload_id.
export type PdUpload = {
  upload_id: number;
  file_name: string;
  file_size: number;
  url: string | null;
  ai_status: PdAiStatus;
  details: PdSection[] | null;
};

type ChipColor = "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info";
export const STATUS_META: Record<SurveyStatus, { label: string; color: ChipColor; hint: string }> = {
  draft: { label: "Draft", color: "default", hint: "Created, no surveyor yet" },
  assigned: { label: "Assigned", color: "primary", hint: "Surveyor assigned, not started" },
  in_progress: { label: "In Progress", color: "warning", hint: "Surveyor is on site" },
  submitted: { label: "Submitted", color: "secondary", hint: "Sent to the QS" },
  qs_review: { label: "QS Review", color: "secondary", hint: "QS is pricing" },
  completed: { label: "Completed", color: "success", hint: "Approved and finished" },
  frozen: { label: "Frozen", color: "default", hint: "Locked" },
};

export const fileSize = (b?: number | null) =>
  !b ? "" : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

export const longDate = (d?: string | null) =>
  d
    ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "–";

export const dateTime = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "–";

export const countItems = (d?: PdSection[] | null) => (d ?? []).reduce((n, s) => n + s.items.length, 0);

// ---------- survey page: what the surveyor recorded in the app ----------
export type ItemResult = "pending" | "work" | "none" | "na";
export type SurveyPhoto = { id: number; kind: "work" | "element"; url: string | null; file_name: string | null; created_at: string };
export type InsItem = {
  id: number;
  node_id: number;
  name: string;
  code: string | null;
  uom: string | null;
  description: string | null;
  added_on_site: boolean;
  ai_suggested: boolean;
  result: ItemResult;
  result_label: string;
  na_reason: string | null;
  note: string | null;
  work: {
    name: string | null;
    qty: number | null;
    unit: string | null;
    qty_status: "est" | "ver" | null;
    vo: "Main" | "VO" | null;
    note: string | null;
    also_rooms: string[];
  } | null;
  photos: SurveyPhoto[];
  inspected_at: string | null;
};
export type InsNode = {
  id: number;
  kind: "room" | "group";
  name: string;
  added_on_site: boolean;
  inspected: number;
  total: number;
  elements: InsItem[];
  groups: InsNode[];
};
export type InsWork = {
  item_id: number;
  room: string;
  path: string[];
  element: string;
  code: string | null;
  in_nhf: boolean | null;
  work_name: string | null;
  qty: number | null;
  unit: string | null;
  qty_status: "est" | "ver" | null;
  vo: "Main" | "VO" | null;
  note: string | null;
  also_rooms: string[];
  added_on_site: boolean;
  ai_suggested: boolean;
  photos: SurveyPhoto[];
};
export type InspectionData = {
  progress: { inspected: number; total: number };
  summary: { work: number; none: number; na: number; pending: number; added_on_site: number; ai_suggested: number };
  photos: number;
  verified: number;
  estimated: number;
  rooms: { id: number; name: string; added_on_site: boolean; inspected: number; total: number }[];
  tree: InsNode[];
  works: InsWork[];
  not_accessible: { item_id: number; room: string; path: string[]; element: string; reason: string | null; note: string | null; photos: SurveyPhoto[] }[];
};

export const RESULT_META: Record<ItemResult, { label: string; color: "default" | "primary" | "success" | "warning" | "error" | "info" | "secondary" }> = {
  pending: { label: "Not inspected", color: "default" },
  work: { label: "Work needed", color: "primary" },
  none: { label: "No works", color: "success" },
  na: { label: "Not accessible", color: "warning" },
};
