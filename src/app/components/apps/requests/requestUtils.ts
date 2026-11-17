import api from "@/utils/axios";
import { format, parse } from "date-fns";
import { getUserDetailsHref } from "@/utils/userDetailsRoute";

// Shared by the header Requests drawer and the Requests page.

export const REQUEST_MESSAGE_TRANSLATION_KEYS = [
  "Requested to add leave on",
  "Requested to change timesheet hours from",
  "hours to",
  "hours on",
  "Rate change has been requested",
  "User requested to create billing info",
  "Requested to update billing information",
];

export const STATUS_COLOR: Record<string, string> = {
  pending: "#FF7F00",
  approved: "#4CBC6D",
  rejected: "#FF484B",
};

export const TYPE_COLOR: Record<string, string> = {
  Shift: "#FF7F00",
  "Billing Info": "#4CBC6D",
  Company: "#f5c21bf8",
  Rate: "#f5c21bf8",
  Trade: "#f5c21bf8",
  Leave: "#949090ff",
  "Work log": "#FF7F00",
  Worklog: "#FF7F00",
  Timesheet: "#FFFF7F00",
  "User Account": "#FF3F51B5",
  Penalty: "#ff3737ff",
  Adjustment: "#0066ffff",
  "Team Cap Increase": "#2276FF",
  Team: "#2276FF",
  "Project Capacity": "#2276FF",
};

export const getStatusKey = (work: any) =>
  String(work?.status_text || "").toLowerCase();

export const getStatusColor = (work: any) =>
  STATUS_COLOR[getStatusKey(work)] || "#757575";

export const getTypeColor = (work: any) =>
  TYPE_COLOR[work?.type_name] || "#757575";

export const isPendingRequest = (work: any) => {
  if (getStatusKey(work) === "pending") return true;
  return Number(work?.status) === 3;
};

const getRequestTypeKey = (work: any) =>
  String(work?.type_name || "")
    .trim()
    .toLowerCase();

const getRequestTableName = (work: any) =>
  String(work?.table_name || "")
    .trim()
    .toLowerCase();

const isPenaltyAppealRequest = (work: any) => {
  const type = getRequestTypeKey(work);
  const message =
    `${work?.message || ""} ${work?.short_message || ""}`.toLowerCase();
  return type === "penalty appeal" || message.includes("appeal");
};

// Billing info requests cannot be rejected without a rejection note.
export const isBillingInfoRequest = (work: any) =>
  getRequestTableName(work) === "billing_infos" ||
  getRequestTypeKey(work) === "billing info";

export const isProjectCapacityRequest = (work: any) =>
  getRequestTypeKey(work) === "project capacity" ||
  Number(work?.request_type) === 149;

export const needsRejectReason = (work: any) =>
  isBillingInfoRequest(work) || isProjectCapacityRequest(work);

const postGenericRequestAction = (
  work: any,
  action: "approve" | "reject",
  reason?: string,
) => {
  const endpoint =
    action === "approve"
      ? "/requests/approve-request"
      : "/requests/reject-request";
  const payload: { log_id: number; user_id: number; reason?: string } = {
    log_id: Number(work?.id),
    user_id: Number(work?.user_id),
  };
  if (action === "reject" && reason) {
    payload.reason = reason;
  }
  return api.post(endpoint, payload);
};

const postTimesheetRequestAction = (
  work: any,
  action: "approve" | "reject",
) => {
  const endpoint =
    action === "approve"
      ? "/timesheet/web-request-approve"
      : "/timesheet/web-request-reject";
  const payload: {
    ids: string;
    userId: number;
    reason?: string;
  } = {
    ids: String(work?.id),
    userId: Number(work?.user_id),
  };
  if (action === "reject") {
    payload.reason = "";
  }
  return api.post(endpoint, payload);
};

const postLeaveRequestAction = (work: any, action: "approve" | "reject") => {
  const leaveId = Number(work?.leave_id ?? work?.record_id);
  const endpoint =
    action === "approve" ? "/user-leaves/approve" : "/user-leaves/reject";
  return api.post(`${endpoint}?user_leave_id=${leaveId}`);
};

const postPenaltyAppealAction = async (
  work: any,
  action: "approve" | "reject",
) => {
  const penaltyId = Number(work?.penalty_id ?? work?.record_id);
  const details = await api.get(
    `/time-clock/penalty-details?penalty_id=${penaltyId}`,
  );
  const appealId = Number(details.data?.info?.appeal_id);
  if (!appealId) {
    throw new Error("Appeal ID not found");
  }
  return api.post("/time-clock/appeal-action", {
    appeal_id: appealId,
    status: action === "approve" ? 5 : 12,
    admin_note: null,
  });
};

export const postRequestAction = async (
  work: any,
  action: "approve" | "reject",
  reason?: string,
) => {
  const type = getRequestTypeKey(work);
  const table = getRequestTableName(work);

  if (table === "user_leaves" || type === "leave") {
    return postLeaveRequestAction(work, action);
  }

  if (
    table === "penalty_appeals" ||
    type === "penalty appeal" ||
    isPenaltyAppealRequest(work)
  ) {
    return postPenaltyAppealAction(work, action);
  }

  if (table === "penalty_details" || type === "penalty") {
    return postTimesheetRequestAction(work, action);
  }

  if (table === "user_worklogs" || type === "work log" || type === "worklog") {
    return postTimesheetRequestAction(work, action);
  }

  // Billing info, rate, trade, company, timesheet, and any other
  // pending request types use the generic request approve/reject APIs.
  return postGenericRequestAction(work, action, reason);
};

// Leave date of a leave request as yyyy-MM-dd.
const getLeaveDate = (work: any): string | undefined => {
  // Try dedicated leave date fields first
  for (const value of [work.start_date, work.leave_date]) {
    if (!value) continue;
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        return format(parse(value, "dd/MM/yyyy", new Date()), "yyyy-MM-dd");
      }
    } catch {}
  }

  // Fallback: parse from date_added (creation date - less accurate)
  if (work.date_added) {
    try {
      const parsed = parse(work.date_added, "d MMMM yyyy HH:mm", new Date());
      return format(parsed, "yyyy-MM-dd");
    } catch {}
  }

  return undefined;
};

const timeClockHref = (
  type: string,
  recordId?: number,
  startDate?: string,
  endDate?: string,
) => {
  const params: any[] = [];
  if (recordId) params.push(`user_id=${recordId}`);
  if (startDate) params.push(`start_date=${startDate}`);
  if (endDate) params.push(`end_date=${endDate}`);
  params.push(`type=${type}`);
  params.push(`open=true`);
  return `/apps/time-clock/list?${params.join("&")}`;
};

const REQUEST_ROUTE_MAP: Record<
  string,
  (recordId?: number, startDate?: string, endDate?: string) => string
> = {
  Shift: (recordId, startDate, endDate) =>
    timeClockHref("shift", recordId, startDate, endDate),
  "Billing Info": (id) => getUserDetailsHref(id, { tab: "billing" }),
  Company: (id) => getUserDetailsHref(id, { tab: "rate" }),
  Rate: (id) => getUserDetailsHref(id, { tab: "rate" }),
  Trade: (id) => getUserDetailsHref(id, { tab: "rate" }),
  Comapny: (id) => getUserDetailsHref(id, { tab: "billing" }),
  Project: (id) => `/apps/projects/index?id=${id}`,
  "Project Capacity": (id) => `/apps/project/list/${id}`,
  Team: (id) => `/apps/teams/team?team_id=${id}`,
  "Team Cap Increase": (id) => `/apps/teams/team?team_id=${id}`,
  Penalty: (recordId, startDate, endDate) =>
    timeClockHref("penalty", recordId, startDate, endDate),
  "Work log": (recordId, startDate, endDate) =>
    timeClockHref("worklog", recordId, startDate, endDate),
  Worklog: (recordId, startDate, endDate) =>
    timeClockHref("worklog", recordId, startDate, endDate),
  // Pass leave dates directly in URL params - no localStorage needed
  Leave: (recordId, startDate, endDate) =>
    getUserDetailsHref(recordId, {
      tab: "leave",
      leave_start: startDate,
      leave_end: endDate,
    }),
};

// Where a request opens in its own module ("" when the type has no page).
export const getRequestHref = (work: any): string => {
  const routeFn = REQUEST_ROUTE_MAP[work?.type_name];
  if (!routeFn) return "";
  if (["Shift", "Penalty", "Work log", "Worklog"].includes(work.type_name)) {
    let formattedDate: string | undefined;
    try {
      formattedDate = work.date_added
        ? format(
            parse(work.date_added, "d MMMM yyyy HH:mm", new Date()),
            "yyyy-MM-dd",
          )
        : undefined;
    } catch {}
    return routeFn(work.user_id, formattedDate, formattedDate);
  }
  if (work.type_name === "Leave") {
    const leaveDate = getLeaveDate(work);
    return routeFn(work.user_id ?? work.record_id, leaveDate, leaveDate);
  }
  if (work.type_name === "Team" || work.type_name === "Team Cap Increase") {
    return routeFn(work.team_id ?? work.record_id);
  }
  if (work.type_name === "Project" || work.type_name === "Project Capacity") {
    return routeFn(work?.project_id ?? work?.record_id);
  }
  return routeFn(work.user_id);
};

const STORAGE_KEY = "request-date-range";

// Date range shared by the drawer and the page.
export const loadDateRangeFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      };
    }
  } catch (error) {
    console.error("Error loading date range from localStorage:", error);
  }
  return null;
};

export const saveDateRangeToStorage = (
  startDate: Date | null,
  endDate: Date | null,
) => {
  try {
    const dateRange = {
      startDate: startDate ? startDate.toDateString() : null,
      endDate: endDate ? endDate.toDateString() : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dateRange));
  } catch (error) {
    console.error("Error saving date range to localStorage:", error);
  }
};
