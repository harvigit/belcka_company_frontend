import dayjs from "dayjs";

export type VehicleType = "company" | "management" | "private";
export type FuelType = "diesel" | "petrol" | "electric" | "hybrid";
export type VehicleStatus = "active" | "inactive" | "in_service" | "archived";
export type DueState = "ok" | "soon" | "overdue" | "missing";

export interface Vehicle {
  id: number;
  registration: string;
  make_model: string;
  type: VehicleType;
  fuel_type: FuelType;
  mileage: number;
  status: VehicleStatus;
  driver_id: number | null;
  driver_name: string | null;
  driver_image?: string | null;
  mot_due: string;
  insurance_due: string;
  tax_due: string;
  // Worked out from the last service event and the fleet_settings service rule, not typed in.
  service_due: string;
  // Worked out from the last tyre check or change and the fleet_settings tyre rule.
  tyre_check_due?: string;
  gps_tracker: string;
  notes: string;
  created_at: string;
  archived_at?: string | null;
  // V5C logbook details
  vin?: string;
  first_registered?: string;
  v5c_reference?: string;
  registered_keeper?: string;
  engine?: string;
  parking_place?: string;
  // litres per week, 0 = unlimited
  weekly_fuel_limit?: number;
  // normal fuel use in L/100 km; outside it the vehicle is flagged (empty = not set)
  fuel_use_min?: number | null;
  fuel_use_max?: number | null;
}

// fleet_settings: the same rules apply to every company vehicle (static until Settings is built).
// Defaults; the Settings page changes them (useVehicles copies the saved values in here so every
// screen reads the same rules).
export const DEFAULT_FLEET_RULES = {
  serviceMonths: 12,
  serviceMiles: 12000,
  tyreCheckMonths: 6,
  tyreCheckMiles: 10000,
  treadLimitMm: 3,
  photoCheckMonths: 3,
  // a date this many days away or closer shows as "Due soon"
  dueSoonDays: 30,
  // default pence per mile for private-car mileage claims
  mileageRatePence: 45,
  odometerEveryFill: true,
  motValidMonths: 12,
};

export type FleetRules = typeof DEFAULT_FLEET_RULES;

export const FLEET_RULES: FleetRules = { ...DEFAULT_FLEET_RULES };

// fleet_driver_licences
export interface DriverLicence {
  driver_id: number;
  driver_name: string;
  categories: string;
  checked_on: string;
  valid_until: string;
  checked_by: string;
  // DVLA check code or other reference; the licence image is not stored
  reference: string;
}

export type LicenceState = "valid" | "soon" | "expired" | "missing";

export const LICENCE_STATE: Record<LicenceState, { label: string; color: "success" | "warning" | "error" | "default" }> = {
  valid: { label: "Valid", color: "success" },
  soon: { label: "Expires soon", color: "warning" },
  expired: { label: "Expired", color: "error" },
  missing: { label: "Not recorded", color: "default" },
};

export const licenceState = (l?: DriverLicence | null): LicenceState => {
  if (!l?.valid_until) return "missing";
  const s = dueState(l.valid_until);
  return s === "overdue" ? "expired" : s === "soon" ? "soon" : "valid";
};

// fleet_driver_reimbursements: how a driver of a private car is paid back
export interface Reimbursement {
  driver_id: number;
  method: "per_mile" | "fixed";
  rate_pence: number;
  fixed_amount: number;
}

// fleet_vehicle_events
export type EventKind =
  | "service"
  | "mot"
  | "tyre_check"
  | "tyre_change"
  | "fuel"
  | "mileage"
  | "repair"
  | "accident"
  // invoice-only costs (Invoices tab)
  | "insurance"
  | "road_tax"
  | "parking"
  | "road_charge"
  | "fine"
  | "other_cost"
  // sent by the driver from the app
  | "cleaning"
  | "vehicle_supplies"
  | "mileage_claim";

export interface VehicleEvent {
  id: number;
  vehicle_id: number;
  kind: EventKind;
  date: string;
  mileage: number | null;
  cost: number | null;
  supplier: string;
  invoice_no: string;
  note: string;
  litres?: number | null;
  // tyre checks: tread per wheel in mm
  tread?: Partial<Record<"FL" | "FR" | "RL" | "RR", number>>;
  // MOT result
  passed?: boolean;
  // invoice or receipt (fleet_event_photos)
  file_name?: string;
  // Expenses and mileage claims sent from the driver app wait for approval.
  // Records added on the web have no status and count straight away.
  status?: ExpenseStatus;
  submitted_by?: string;
  project?: string;
  // mileage claims: business miles and pence per mile
  claim_miles?: number;
  claim_rate?: number;
  decided_by?: string;
  decided_at?: string;
  reject_reason?: string;
  // set on rows that came from a file import (so the import can be undone)
  import_id?: string;
  // fuel card used (last 6 digits)
  card?: string;
  // fuel: the station picked from Google (supplier keeps its name); empty when typed by hand
  station?: StationPlace | null;
  created_by: string;
  created_at: string;
}

// A fuel station found on Google (search or near the user's location)
export interface StationPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  place_id: string;
}

// fleet_fuel_cards: a card belongs to a person; fuel goes to the vehicle they drive that day
export interface FuelCard {
  id: number;
  number: string; // last 6 digits only
  holder: string; // name printed on the card
  driver_id: number | null;
  driver_name: string | null;
  group: string;
  expires: string; // YYYY-MM
  blocked: boolean;
}

export const CARD_GROUPS = ["Drivers", "Managers", "Pool"] as const;

export const cardState = (c: FuelCard): { label: string; color: "success" | "warning" | "error" | "default" } => {
  if (c.blocked) return { label: "Blocked", color: "default" };
  const end = dayjs(`${c.expires}-01`).endOf("month").format("YYYY-MM-DD");
  const s = dueState(end);
  return s === "overdue"
    ? { label: "Expired", color: "error" }
    : s === "soon"
      ? { label: "Expires soon", color: "warning" }
      : { label: "Active", color: "success" };
};

// fleet_connections: outside services the fleet takes data from
export type ConnectionKind = "file" | "live" | "server";

export interface Connection {
  id: string;
  name: string;
  brings: string;
  kind: ConnectionKind;
  // what an import from it creates
  target: "fuel" | "charges" | "none";
  charge_kind?: EventKind;
  connected: boolean;
  account: string;
  connected_by: string;
  connected_at: string;
}

export const CONNECTION_KIND: Record<ConnectionKind, string> = {
  file: "File import",
  live: "Live data",
  server: "Needs a server",
};

// fleet_fuel_reports + fleet_charge_imports: one row per imported file
export interface ImportBatch {
  id: string; // "fuel-1", "charge-2"
  connection_id: string;
  source: string;
  file_name: string;
  period_from: string;
  period_to: string;
  rows: number;
  litres: number;
  total: number;
  imported_by: string;
  imported_at: string;
  undone_by?: string;
  undone_at?: string;
}

// Driver locations for the Map. NOT in the 24 planned tables yet (client to confirm); the app saves
// a point each time the driver records something (checklist, fuel, expense, defect...).
export interface DriverLocation {
  id: number;
  driver_id: number;
  driver_name: string;
  vehicle_id: number | null;
  at: string; // ISO date and time
  lat: number;
  lng: number;
  place: string;
  // what the driver recorded in the app at this place
  kind: LocationKind;
  // shown under the kind, e.g. "Defect found", "Parking"
  action: string;
  // daily check with a defect: the marker turns red
  alert?: boolean;
  // the record it came from, so the map can open it
  checklist_id?: number;
  defect_id?: number;
}

export type LocationKind =
  | "daily_check"
  | "fuel"
  | "mileage"
  | "tyre_check"
  | "photo_check"
  | "accident"
  | "expense"
  | "mileage_claim";

export const LOCATION_KIND: Record<LocationKind, { label: string; color: string }> = {
  daily_check: { label: "Daily check", color: "#2e7d32" },
  fuel: { label: "Fuel", color: "#ef6c00" },
  mileage: { label: "Mileage", color: "#1565c0" },
  tyre_check: { label: "Tyre check", color: "#6a1b9a" },
  photo_check: { label: "Photo check", color: "#00838f" },
  accident: { label: "Accident", color: "#c62828" },
  expense: { label: "Expense", color: "#5d4037" },
  mileage_claim: { label: "Mileage claim", color: "#3949ab" },
};

// fleet_activities: who changed what, for the whole Vehicles module
export type ActivityArea =
  | "vehicle"
  | "driver"
  | "record"
  | "document"
  | "permit"
  | "onboarding"
  | "defect"
  | "expense"
  | "card"
  | "import"
  | "settings";

export const ACTIVITY_AREA: Record<ActivityArea, string> = {
  vehicle: "Vehicles",
  driver: "Drivers and licences",
  record: "MOT, service, fuel and costs",
  document: "Documents",
  permit: "Parking permits",
  onboarding: "Start lists",
  defect: "Defects and accidents",
  expense: "Expense approvals",
  card: "Fuel cards",
  import: "Imports and conflicts",
  settings: "Settings and connections",
};

export interface Activity {
  id: number;
  at: string; // ISO date and time
  by: string;
  area: ActivityArea;
  vehicle_id: number | null;
  action: string;
  detail: string;
}

// fleet_import_conflicts
export type ConflictType = "unknown_registration" | "card_not_linked" | "over_fuel_limit" | "duplicate";

export const CONFLICT_TYPE: Record<ConflictType, string> = {
  unknown_registration: "Registration not in the fleet",
  card_not_linked: "Card not linked to a person",
  over_fuel_limit: "Weekly fuel limit exceeded",
  duplicate: "Already imported",
};

export interface ImportConflict {
  id: number;
  import_id: string | null;
  source: string;
  type: ConflictType;
  detail: string;
  vehicle_id: number | null;
  date: string;
  amount: number | null;
  resolved: boolean;
  note: string;
  resolved_by: string;
  resolved_at: string;
}

export type ExpenseStatus = "pending" | "approved" | "rejected";

export const EXPENSE_STATUS: Record<ExpenseStatus, { label: string; color: "warning" | "success" | "error" }> = {
  pending: { label: "Waiting for approval", color: "warning" },
  approved: { label: "Approved", color: "success" },
  rejected: { label: "Rejected", color: "error" },
};

// Only approved costs count towards a vehicle's totals.
export const countsAsCost = (e: VehicleEvent) => (e.cost ?? 0) > 0 && (!e.status || e.status === "approved");

/* ---------- Fuel use ---------- */
const LITRES_PER_GALLON = 4.54609;
const KM_PER_MILE = 1.609344;
export const l100ToMpg = (l100: number) => (100 * LITRES_PER_GALLON) / (l100 * KM_PER_MILE);

export interface FuelUse {
  // fuel bought in the period
  fills: number;
  litres: number;
  cost: number;
  // fill to fill: miles between fills and the litres put in at the later fill
  measured_miles: number;
  measured_litres: number;
  measured_cost: number;
  l100: number | null;
  mpg: number | null;
}

/**
 * Fuel bought from `from` (YYYY-MM-DD, "" = all time), and how much the vehicle uses.
 * Use is measured fill to fill, so only fills with an odometer reading count: each one
 * counts with the miles since the fill before it (that one may be before the period).
 * Fills waiting for approval or rejected are left out.
 */
export function fuelUse(events: VehicleEvent[], from = ""): FuelUse {
  const fills = events.filter((e) => e.kind === "fuel" && (!e.status || e.status === "approved"));
  const inPeriod = fills.filter((e) => e.date >= from);
  const withOdo = fills
    .filter((e) => e.mileage && e.litres)
    .sort((a, b) => (a.mileage ?? 0) - (b.mileage ?? 0));
  let miles = 0;
  let litres = 0;
  let cost = 0;
  for (let i = 1; i < withOdo.length; i++) {
    if (withOdo[i].date < from) continue;
    miles += (withOdo[i].mileage ?? 0) - (withOdo[i - 1].mileage ?? 0);
    litres += withOdo[i].litres ?? 0;
    cost += withOdo[i].cost ?? 0;
  }
  const l100 = miles > 0 && litres > 0 ? (litres / (miles * KM_PER_MILE)) * 100 : null;
  return {
    fills: inPeriod.length,
    litres: inPeriod.reduce((s, e) => s + (e.litres ?? 0), 0),
    cost: inPeriod.reduce((s, e) => s + (e.cost ?? 0), 0),
    measured_miles: miles,
    measured_litres: litres,
    measured_cost: cost,
    l100,
    mpg: l100 ? l100ToMpg(l100) : null,
  };
}

export type FuelRangeState = "not_set" | "unknown" | "within" | "above" | "below";
export const FUEL_RANGE_STATE: Record<FuelRangeState, { label: string; color: "success" | "error" | "warning" | "default" }> = {
  not_set: { label: "Not set", color: "default" },
  unknown: { label: "Not enough fills", color: "default" },
  within: { label: "Within the normal range", color: "success" },
  above: { label: "Above the normal range", color: "error" },
  below: { label: "Below the normal range", color: "warning" },
};

export const fuelRangeState = (vehicle: Vehicle, l100: number | null): FuelRangeState => {
  const min = vehicle.fuel_use_min || 0;
  const max = vehicle.fuel_use_max || 0;
  if (!min && !max) return "not_set";
  if (l100 === null) return "unknown";
  if (max && l100 > max) return "above";
  if (min && l100 < min) return "below";
  return "within";
};

export const fuelRangeText = (vehicle: Vehicle) => {
  const min = vehicle.fuel_use_min || 0;
  const max = vehicle.fuel_use_max || 0;
  if (!min && !max) return "Not set";
  if (min && max) return `${min} – ${max} L/100 km`;
  return min ? `At least ${min} L/100 km` : `Up to ${max} L/100 km`;
};

// Days the Action Centre looks back when checking fuel use against the normal range
export const FUEL_CHECK_DAYS = 30;

// fleet_defects: defects from the daily checklist and accidents the driver records in the app
export type DefectSeverity = "minor" | "major" | "critical";
export type DefectStatus = "open" | "in_progress" | "resolved" | "closed";

export const DAILY_CHECK_ITEMS = [
  "Lights and indicators",
  "Tyres and wheels",
  "Mirrors and windows",
  "Fluids and leaks",
  "Brakes and steering",
  "Seat belts and horn",
  "Body damage",
  "Load and equipment",
] as const;

export const SEVERITY: Record<DefectSeverity, { label: string; color: "default" | "warning" | "error" }> = {
  minor: { label: "Minor", color: "default" },
  major: { label: "Major", color: "warning" },
  critical: { label: "Critical", color: "error" },
};

export const DEFECT_STATUS: Record<DefectStatus, { label: string; color: "error" | "warning" | "success" | "default" }> = {
  open: { label: "Open", color: "error" },
  in_progress: { label: "In progress", color: "warning" },
  resolved: { label: "Resolved", color: "success" },
  closed: { label: "Closed", color: "default" },
};

export interface Defect {
  id: number;
  vehicle_id: number;
  // "defect": a daily checklist item marked as a defect. "accident": recorded by the driver in the app.
  type: "defect" | "accident";
  // defects: the checklist item, and how serious the office thinks it is
  category: string;
  severity: DefectSeverity;
  // accidents: when it happened and the optional photos the driver added
  incident_date?: string;
  photos?: string[];
  // defect: the driver's note; accident: "What happened?"
  description: string;
  reported_by: string;
  reported_at: string;
  // Defects only come from a daily checklist: the item marked as a defect, with the driver's photos.
  // Accidents have no checklist.
  checklist_id?: number | null;
  status: DefectStatus;
  owner: string;
  resolution: string;
  updated_by: string;
  updated_at: string;
}

// fleet_daily_checklists + fleet_daily_checklist_items
export interface DailyChecklist {
  id: number;
  vehicle_id: number;
  driver_name: string;
  date: string;
  mileage: number;
  // A defect item has the driver's note and at least one camera photo (fleet_daily_checklist_items).
  items: { item: string; ok: boolean; note: string; photos: string[] }[];
}

// The checklist item a defect came from, with its photos.
export const defectItem = (d: Defect, checklists: DailyChecklist[]) =>
  checklists.find((c) => c.id === d.checklist_id)?.items.find((i) => i.item === d.category);

export const checklistSafe = (c: DailyChecklist) => c.items.every((i) => i.ok);

export const EVENT_KINDS: Record<EventKind, { label: string; color: "primary" | "success" | "warning" | "error" | "info" | "secondary" }> = {
  service: { label: "Service", color: "primary" },
  mot: { label: "MOT", color: "success" },
  tyre_check: { label: "Tyre check", color: "info" },
  tyre_change: { label: "Tyre change", color: "info" },
  fuel: { label: "Fuel", color: "warning" },
  mileage: { label: "Mileage reading", color: "secondary" },
  repair: { label: "Repair", color: "primary" },
  accident: { label: "Accident", color: "error" },
  insurance: { label: "Insurance", color: "secondary" },
  road_tax: { label: "Road tax", color: "secondary" },
  parking: { label: "Parking", color: "secondary" },
  road_charge: { label: "Road charge", color: "secondary" },
  fine: { label: "Fine", color: "error" },
  other_cost: { label: "Other cost", color: "secondary" },
  cleaning: { label: "Cleaning", color: "secondary" },
  vehicle_supplies: { label: "Vehicle supplies", color: "secondary" },
  mileage_claim: { label: "Mileage claim", color: "info" },
};

// Costs added straight from the Invoices tab. Fuel, MOT, service and tyres have their own tabs
// because they also move the mileage and due dates.
export const INVOICE_KINDS: EventKind[] = [
  "repair",
  "insurance",
  "road_tax",
  "parking",
  "road_charge",
  "fine",
  "other_cost",
];

// fleet_parking_permits
export type PermitStatus = "pending" | "approved" | "rejected";

export interface ParkingPermit {
  id: number;
  vehicle_id: number;
  zone: string;
  issuer: string;
  reference: string;
  valid_from: string;
  valid_until: string;
  status: PermitStatus;
  requested_by: string;
  decided_by: string;
  decided_at: string;
  reject_reason: string;
}

export type PermitState = "pending" | "rejected" | "active" | "expiring" | "expired" | "upcoming";

export const PERMIT_STATE: Record<PermitState, { label: string; color: "success" | "warning" | "error" | "default" | "info" }> = {
  pending: { label: "Waiting for approval", color: "warning" },
  rejected: { label: "Rejected", color: "error" },
  active: { label: "Active", color: "success" },
  expiring: { label: "Expires soon", color: "warning" },
  expired: { label: "Expired", color: "default" },
  upcoming: { label: "Starts later", color: "info" },
};

export const permitState = (p: ParkingPermit): PermitState => {
  if (p.status === "pending") return "pending";
  if (p.status === "rejected") return "rejected";
  const today = dayjs().format("YYYY-MM-DD");
  if (p.valid_from > today) return "upcoming";
  if (p.valid_until < today) return "expired";
  return dueState(p.valid_until) === "soon" ? "expiring" : "active";
};

// fleet_onboarding_templates + _template_steps (static until Settings is built)
export interface OnboardingTemplate {
  id: number;
  name: string;
  steps: { id: number; title: string }[];
}

export const ONBOARDING_TEMPLATES: OnboardingTemplate[] = [
  {
    id: 1,
    name: "Driver",
    steps: [
      { id: 1, title: "Driving licence checked" },
      { id: 2, title: "Fuel card issued to the person" },
      { id: 3, title: "Added to the RingGo parking account" },
      { id: 4, title: "Vehicle added to TfL Auto Pay (Congestion Charge, ULEZ)" },
      { id: 5, title: "Handover photo check done" },
      { id: 6, title: "Rules read and accepted" },
    ],
  },
  {
    id: 2,
    name: "Manager",
    steps: [
      { id: 11, title: "Driving licence checked" },
      { id: 12, title: "Fuel card issued to the person" },
      { id: 13, title: "Added to the RingGo parking account" },
      { id: 14, title: "Vehicle added to TfL Auto Pay (Congestion Charge, ULEZ)" },
      { id: 15, title: "Private use agreement signed" },
      { id: 16, title: "Handover photo check done" },
    ],
  },
];

// Management cars start the Manager list; other company vehicles the Driver list.
// Copy of the starting types, used when nothing is saved yet. The Settings page edits
// ONBOARDING_TEMPLATES in place (through useVehicles) so every screen sees the same list.
export const DEFAULT_ONBOARDING_TEMPLATES: OnboardingTemplate[] = ONBOARDING_TEMPLATES.map((t) => ({
  ...t,
  steps: t.steps.map((s) => ({ ...s })),
}));

export const defaultTemplateFor = (type: VehicleType): OnboardingTemplate | undefined =>
  ONBOARDING_TEMPLATES.find((t) => t.name.toLowerCase() === (type === "management" ? "manager" : "driver")) ??
  ONBOARDING_TEMPLATES[0];

// fleet_vehicle_onboardings + _onboarding_steps
export interface VehicleOnboarding {
  id: number;
  vehicle_id: number;
  driver_id: number;
  driver_name: string;
  template_id: number;
  template_name: string;
  started_at: string;
  steps: { id: number; title: string; done_at: string | null; done_by: string | null }[];
}

// fleet_vehicle_documents
export const DOCUMENT_KINDS = [
  "V5C registration certificate (logbook)",
  "Insurance certificate",
  "MOT certificate",
  "Lease or finance agreement",
  "Other",
] as const;

export interface VehicleDocument {
  id: number;
  vehicle_id: number;
  kind: string;
  number: string;
  date: string;
  expires_on: string;
  note: string;
  file_name: string;
  uploaded_by: string;
  uploaded_at: string;
}

// fleet_vehicle_drivers: who had the vehicle and when
export interface DriverLog {
  id: number;
  vehicle_id: number;
  driver_id: number;
  driver_name: string;
  from: string;
  to: string | null;
}

export const lowestTread = (e: VehicleEvent) => {
  const values = Object.values(e.tread ?? {}).filter((n): n is number => typeof n === "number");
  return values.length ? Math.min(...values) : null;
};

export const money = (value?: number | null) =>
  value === null || value === undefined ? "-" : `£${Number(value).toFixed(2)}`;

export interface VehicleForm {
  id?: number;
  registration: string;
  make_model: string;
  type: VehicleType;
  fuel_type: FuelType;
  mileage: string;
  status: Exclude<VehicleStatus, "archived">;
  driver_id: number | null;
  mot_due: string;
  insurance_due: string;
  tax_due: string;
  service_due: string;
  gps_tracker: string;
  notes: string;
}

export const emptyVehicle: VehicleForm = {
  registration: "",
  make_model: "",
  type: "company",
  fuel_type: "diesel",
  mileage: "",
  status: "active",
  driver_id: null,
  mot_due: "",
  insurance_due: "",
  tax_due: "",
  service_due: "",
  gps_tracker: "",
  notes: "",
};

export const VEHICLE_TYPES: {
  value: VehicleType;
  label: string;
  short: string;
  hint: string;
}[] = [
  {
    value: "company",
    label: "Company",
    short: "Company",
    hint: "Company van or car used for work.",
  },
  {
    value: "management",
    label: "Company · management",
    short: "Management",
    hint: "Company car a manager may also use privately.",
  },
  {
    value: "private",
    label: "Private · expenses allowed",
    short: "Private car",
    hint: "Employee's own car. Only MOT and insurance are tracked; the driver claims business mileage.",
  },
];

export const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: "diesel", label: "Diesel" },
  { value: "petrol", label: "Petrol" },
  { value: "electric", label: "Electric" },
  { value: "hybrid", label: "Hybrid" },
];

export const VEHICLE_STATUSES: {
  value: VehicleStatus;
  label: string;
  hint: string;
  color: "success" | "default" | "warning" | "secondary";
}[] = [
  { value: "active", label: "Active", hint: "On the road and in use.", color: "success" },
  { value: "in_service", label: "In service", hint: "At the garage for repair or a service.", color: "warning" },
  { value: "inactive", label: "Inactive", hint: "Not in use for now, e.g. no driver.", color: "default" },
  { value: "archived", label: "Archived", hint: "Sold or removed. History is kept.", color: "secondary" },
];

export type VehicleFormErrors = Partial<
  Record<"registration" | "make_model" | "mileage" | "driver_id" | "mot_due" | "insurance_due" | "tax_due", string>
>;

export const DUE_CHIP: Record<
  DueState,
  { label: string; color: "success" | "warning" | "error" | "default" }
> = {
  ok: { label: "OK", color: "success" },
  soon: { label: "Due soon", color: "warning" },
  overdue: { label: "Overdue", color: "error" },
  missing: { label: "Not set", color: "default" },
};


export const typeLabel = (type: VehicleType) =>
  VEHICLE_TYPES.find((t) => t.value === type)?.label ?? type;
export const fuelLabel = (fuel: FuelType) =>
  FUEL_TYPES.find((f) => f.value === fuel)?.label ?? fuel;
export const statusInfo = (status: VehicleStatus) =>
  VEHICLE_STATUSES.find((s) => s.value === status) ?? VEHICLE_STATUSES[0];

export const dueState = (date?: string | null): DueState => {
  if (!date) return "missing";
  const days = dayjs(date).startOf("day").diff(dayjs().startOf("day"), "day");
  if (days < 0) return "overdue";
  if (days <= FLEET_RULES.dueSoonDays) return "soon";
  return "ok";
};

export interface DueItem {
  label: string;
  date: string;
  state: DueState;
}

// Dates that apply to the vehicle: private cars only need MOT and insurance.
export const dueItems = (v: Vehicle): DueItem[] => {
  const items: { label: string; date: string }[] = [
    { label: "MOT", date: v.mot_due },
    { label: "Insurance", date: v.insurance_due },
  ];
  if (v.type !== "private") {
    items.push(
      { label: "Road tax", date: v.tax_due },
      { label: "Service", date: v.service_due },
      { label: "Tyre check", date: v.tyre_check_due ?? "" },
    );
  }
  return items.map((i) => ({ ...i, state: dueState(i.date) }));
};

const DUE_ORDER: Record<DueState, number> = { overdue: 0, soon: 1, missing: 2, ok: 3 };

// The item that needs attention first: overdue, then due soon, then the earliest date.
export const nextDue = (v: Vehicle): DueItem | null => {
  const items = dueItems(v);
  if (!items.length) return null;
  return [...items].sort((a, b) => {
    const byState = DUE_ORDER[a.state] - DUE_ORDER[b.state];
    if (byState !== 0) return byState;
    return (a.date || "9999").localeCompare(b.date || "9999");
  })[0];
};

export const formatDate = (date?: string | null) =>
  date ? dayjs(date).format("DD/MM/YYYY") : "-";

export const formatMiles = (miles?: number | null) =>
  miles === null || miles === undefined
    ? "-"
    : `${Number(miles).toLocaleString("en-GB")} mi`;

// UK registrations are stored in capitals with a single space, e.g. "BD23 MNG".
export const normaliseRegistration = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trimStart();
