import {
  CAN_DRIVE,
  CONFLICT_TYPE,
  Defect,
  DriverLicence,
  ImportConflict,
  dueItems,
  licenceState,
  money,
  ParkingPermit,
  permitState,
  SEVERITY,
  Vehicle,
  VehicleEvent,
  VehicleOnboarding,
} from "./types";

export type Priority = "critical" | "high" | "normal";
export type ActionCategory = "defect" | "request" | "due" | "permit" | "expense" | "onboarding" | "licence" | "conflict";

export const PRIORITY: Record<Priority, { label: string; color: "error" | "warning" | "default"; order: number }> = {
  critical: { label: "Critical", color: "error", order: 0 },
  high: { label: "High", color: "warning", order: 1 },
  normal: { label: "Normal", color: "default", order: 2 },
};

export const ACTION_CATEGORY: Record<ActionCategory, string> = {
  defect: "Defects",
  request: "Driver requests",
  due: "Due dates",
  permit: "Permits",
  expense: "Approvals",
  onboarding: "Start lists",
  licence: "Driving licences",
  conflict: "Import conflicts",
};

export interface ActionRow {
  id: string;
  priority: Priority;
  category: ActionCategory;
  title: string;
  detail: string;
  vehicle: Vehicle | null;
  date: string;
  status: string;
  // where "Open" goes
  target:
    | { kind: "vehicle"; vehicleId: number; tab: string }
    | { kind: "defect"; defectId: number }
    | { kind: "expenses" }
    | { kind: "drivers" }
    | { kind: "conflicts" };
}

interface Input {
  vehicles: Vehicle[];
  events: VehicleEvent[];
  defects: Defect[];
  permits: ParkingPermit[];
  onboardings: VehicleOnboarding[];
  licences?: DriverLicence[];
  conflicts?: ImportConflict[];
}

const DUE_TAB: Record<string, string> = {
  MOT: "maintenance",
  Service: "maintenance",
  "Road tax": "overview",
  Insurance: "overview",
  "Tyre check": "tyres",
};

// One queue for everything that needs the office: defects, driver requests, due dates,
// permit approvals and renewals, expenses waiting for approval and unfinished start lists.
export function buildActions({ vehicles, events, defects, permits, onboardings, licences = [], conflicts = [] }: Input): ActionRow[] {
  const byId = new Map(vehicles.map((v) => [v.id, v]));
  const inUse = vehicles.filter((v) => v.status === "active" || v.status === "in_service");
  const rows: ActionRow[] = [];

  for (const d of defects.filter((x) => x.status === "open" || x.status === "in_progress")) {
    const vehicle = byId.get(d.vehicle_id) ?? null;
    if (vehicle?.status === "archived") continue;
    const status = d.status === "open" ? "Open" : `In progress${d.owner ? ` · ${d.owner}` : ""}`;
    if (d.type === "request") {
      const can = d.can_drive ?? "yes";
      rows.push({
        id: `def${d.id}`,
        priority: can === "no" ? "critical" : can === "garage_only" ? "high" : "normal",
        category: "request",
        title: d.request_kind ?? "Driver request",
        detail: `${CAN_DRIVE[can]} · ${d.description}`,
        vehicle,
        date: d.reported_at,
        status,
        target: { kind: "defect", defectId: d.id },
      });
    } else {
      rows.push({
        id: `def${d.id}`,
        priority: d.severity === "critical" ? "critical" : d.severity === "major" ? "high" : "normal",
        category: "defect",
        title: `${SEVERITY[d.severity].label} defect · ${d.category}`,
        detail: d.description,
        vehicle,
        date: d.reported_at,
        status,
        target: { kind: "defect", defectId: d.id },
      });
    }
  }

  for (const v of inUse) {
    for (const item of dueItems(v).filter((i) => i.state === "overdue" || i.state === "soon")) {
      rows.push({
        id: `due${v.id}${item.label}`,
        priority: item.state === "overdue" ? "high" : "normal",
        category: "due",
        title: `${item.label} ${item.state === "overdue" ? "overdue" : "due soon"}`,
        detail: item.state === "overdue" ? "Book it and record it on the vehicle." : "Plan it before the date.",
        vehicle: v,
        date: item.date,
        status: item.state === "overdue" ? "Overdue" : "Planned",
        target: { kind: "vehicle", vehicleId: v.id, tab: DUE_TAB[item.label] ?? "overview" },
      });
    }
  }

  for (const p of permits) {
    const vehicle = byId.get(p.vehicle_id) ?? null;
    if (!vehicle || vehicle.status === "archived") continue;
    const state = permitState(p);
    if (state === "pending" || state === "expiring") {
      rows.push({
        id: `per${p.id}`,
        priority: state === "pending" ? "high" : "normal",
        category: "permit",
        title: state === "pending" ? `Permit approval · ${p.zone}` : `Permit renewal · ${p.zone}`,
        detail: state === "pending" ? `Requested by ${p.requested_by}` : `${p.issuer} · ends soon`,
        vehicle,
        date: state === "pending" ? p.valid_from : p.valid_until,
        status: state === "pending" ? "Waiting for approval" : "Expires soon",
        target: { kind: "vehicle", vehicleId: vehicle.id, tab: "permits" },
      });
    }
  }

  const pending = events.filter((e) => e.status === "pending");
  if (pending.length) {
    const total = pending.reduce((s, e) => s + (e.cost ?? 0), 0);
    const oldest = pending.map((e) => e.date).sort()[0];
    rows.push({
      id: "expenses",
      priority: "normal",
      category: "expense",
      title: `${pending.length} expense${pending.length > 1 ? "s" : ""} waiting for approval`,
      detail: `${money(total)} from the driver app, including mileage claims`,
      vehicle: null,
      date: oldest,
      status: "Waiting for approval",
      target: { kind: "expenses" },
    });
  }

  for (const v of inUse.filter((x) => x.driver_id && x.type !== "private")) {
    const o = onboardings
      .filter((x) => x.vehicle_id === v.id && x.driver_id === v.driver_id)
      .sort((a, b) => b.id - a.id)[0];
    if (!o) continue;
    const done = o.steps.filter((s) => s.done_at).length;
    if (done < o.steps.length) {
      rows.push({
        id: `onb${o.id}`,
        priority: "normal",
        category: "onboarding",
        title: `Start list ${done}/${o.steps.length} done`,
        detail: `${o.driver_name} · ${o.steps.find((s) => !s.done_at)?.title ?? ""}`,
        vehicle: v,
        date: o.started_at,
        status: "To do",
        target: { kind: "vehicle", vehicleId: v.id, tab: "onboarding" },
      });
    }
  }

  // Only people driving a vehicle now need a valid licence on file.
  const current = new Map<number, Vehicle>();
  inUse.forEach((v) => v.driver_id && current.set(v.driver_id, v));
  for (const [driverId, v] of current) {
    const licence = licences.find((l) => l.driver_id === driverId);
    const state = licenceState(licence);
    if (state === "valid") continue;
    rows.push({
      id: `lic${driverId}`,
      priority: state === "soon" ? "normal" : "high",
      category: "licence",
      title:
        state === "expired"
          ? "Driving licence expired"
          : state === "soon"
            ? "Driving licence expires soon"
            : "Driving licence not checked",
      detail: `${v.driver_name} · drives ${v.registration}`,
      vehicle: v,
      date: licence?.valid_until || v.created_at,
      status: state === "missing" ? "Not recorded" : state === "soon" ? "Check the new licence" : "Expired",
      target: { kind: "drivers" },
    });
  }

  for (const c of conflicts.filter((x) => !x.resolved)) {
    const vehicle = c.vehicle_id ? byId.get(c.vehicle_id) ?? null : null;
    rows.push({
      id: `con${c.id}`,
      priority: c.type === "over_fuel_limit" ? "normal" : "high",
      category: "conflict",
      title: CONFLICT_TYPE[c.type],
      detail: `${c.source} · ${c.detail}${c.amount ? ` · ${money(c.amount)}` : ""}`,
      vehicle,
      date: c.date,
      status: "Open",
      target: { kind: "conflicts" },
    });
  }

  return rows.sort(
    (a, b) => PRIORITY[a.priority].order - PRIORITY[b.priority].order || a.date.localeCompare(b.date),
  );
}
