"use client";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  DailyChecklist,
  DAILY_CHECK_ITEMS,
  DEFAULT_FLEET_RULES,
  DEFAULT_ONBOARDING_TEMPLATES,
  defaultTemplateFor,
  Defect,
  DriverLicence,
  DriverLog,
  FLEET_RULES,
  FleetRules,
  ONBOARDING_TEMPLATES,
  OnboardingTemplate,
  ParkingPermit,
  Reimbursement,
  Activity,
  ActivityArea,
  Connection,
  EVENT_KINDS,
  EventKind,
  money,
  FuelCard,
  ImportBatch,
  ImportConflict,
  DriverLocation,
  Vehicle,
  VehicleDocument,
  VehicleEvent,
  VehicleForm,
  VehicleOnboarding,
} from "./types";

// TEMPORARY static UI: the Vehicles API is not built yet, so sample data is kept in this browser.
// Each list mirrors a planned table (fleet_vehicles, fleet_vehicle_events, fleet_vehicle_documents,
// fleet_vehicle_drivers). Replace the bodies below with api calls once the backend is ready; the
// hook's shape stays the same.

export interface DriverOption {
  id: number;
  name: string;
  image?: string | null;
}

interface FleetData {
  vehicles: Vehicle[];
  events: VehicleEvent[];
  documents: VehicleDocument[];
  driver_logs: DriverLog[];
  permits: ParkingPermit[];
  onboardings: VehicleOnboarding[];
  defects: Defect[];
  checklists: DailyChecklist[];
  settings: FleetRules;
  templates: OnboardingTemplate[];
  licences: DriverLicence[];
  reimbursements: Reimbursement[];
  cards: FuelCard[];
  connections: Connection[];
  imports: ImportBatch[];
  conflicts: ImportConflict[];
  activities: Activity[];
  locations: DriverLocation[];
}

const storageKey = (companyId?: number | null) => `vehicles_ui_mock_v11_${companyId ?? "0"}`;

// Saved settings and onboarding types are copied into the shared FLEET_RULES / ONBOARDING_TEMPLATES
// so every screen and helper uses them (static UI; the API will return them later).
const applySettings = (d: FleetData) => {
  Object.assign(FLEET_RULES, DEFAULT_FLEET_RULES, d.settings);
  ONBOARDING_TEMPLATES.splice(0, ONBOARDING_TEMPLATES.length, ...d.templates);
};

const newOnboarding = (
  list: VehicleOnboarding[],
  vehicleId: number,
  driver: { id: number; name: string },
  template: OnboardingTemplate,
  startedAt: string,
): VehicleOnboarding => ({
  id: Math.max(0, ...list.map((o) => o.id)) + 1,
  vehicle_id: vehicleId,
  driver_id: driver.id,
  driver_name: driver.name,
  template_id: template.id,
  template_name: template.name,
  started_at: startedAt,
  steps: template.steps.map((s) => ({ id: s.id, title: s.title, done_at: null, done_by: null })),
});
const today = () => dayjs().format("YYYY-MM-DD");
const inDays = (days: number) => dayjs().add(days, "day").format("YYYY-MM-DD");
const nextId = (list: { id: number }[]) => Math.max(0, ...list.map((x) => x.id)) + 1;

const SAMPLE_BY = "Sample data";

const sampleData = (): FleetData => {
  const vehicle = (v: Partial<Vehicle> & Pick<Vehicle, "id" | "registration" | "make_model">): Vehicle => ({
    type: "company",
    fuel_type: "diesel",
    mileage: 0,
    status: "active",
    driver_id: null,
    driver_name: null,
    mot_due: "",
    insurance_due: "",
    tax_due: "",
    service_due: "",
    tyre_check_due: "",
    gps_tracker: "",
    notes: "",
    created_at: inDays(-400),
    weekly_fuel_limit: 0,
    ...v,
  });

  const vehicles: Vehicle[] = [
    vehicle({
      id: 1,
      registration: "LX21 ABC",
      make_model: "Ford Transit Custom",
      mileage: 48210,
      driver_id: 101,
      driver_name: "Jamie Storeman",
      mot_due: inDays(24),
      insurance_due: inDays(160),
      tax_due: inDays(95),
      service_due: inDays(-12),
      tyre_check_due: inDays(-78),
      weekly_fuel_limit: 60,
      fuel_use_min: 5,
      fuel_use_max: 6.5,
    }),
    vehicle({
      id: 2,
      registration: "KP70 XYZ",
      make_model: "Volkswagen Caddy",
      mileage: 61840,
      driver_id: 102,
      driver_name: "Morgan Buyer",
      mot_due: inDays(140),
      insurance_due: inDays(160),
      tax_due: inDays(27),
      service_due: inDays(300),
      tyre_check_due: inDays(162),
      created_at: inDays(-380),
    }),
    vehicle({
      id: 3,
      registration: "BD23 MNG",
      make_model: "BMW 320d",
      type: "management",
      mileage: 22410,
      mot_due: inDays(220),
      insurance_due: inDays(190),
      tax_due: inDays(120),
      service_due: inDays(330),
      tyre_check_due: inDays(152),
      gps_tracker: "TRK-0031",
      created_at: inDays(-200),
      vin: "WBA8E1C50JA123456",
      first_registered: "2023-03-14",
      v5c_reference: "1234 5678 9012",
      registered_keeper: "Belcka Ltd",
      engine: "Diesel · 1995 cc",
      parking_place: "Head office car park, bay 12",
    }),
    vehicle({
      id: 4,
      registration: "WR19 PRV",
      make_model: "Toyota Corolla",
      type: "private",
      fuel_type: "hybrid",
      mileage: 53300,
      driver_id: 103,
      driver_name: "Jordan Supervisor",
      mot_due: inDays(70),
      insurance_due: inDays(12),
      created_at: inDays(-90),
    }),
    vehicle({
      id: 5,
      registration: "YH18 VAN",
      make_model: "Mercedes Sprinter",
      mileage: 98420,
      status: "in_service",
      mot_due: inDays(45),
      insurance_due: inDays(200),
      tax_due: inDays(60),
      service_due: inDays(5),
      tyre_check_due: inDays(100),
      notes: "At Northside Garage for clutch repair.",
      created_at: inDays(-700),
    }),
  ];

  let id = 0;
  const ev = (e: Partial<VehicleEvent> & Pick<VehicleEvent, "vehicle_id" | "kind" | "date">): VehicleEvent => ({
    id: ++id,
    mileage: null,
    cost: null,
    supplier: "",
    invoice_no: "",
    note: "",
    created_by: SAMPLE_BY,
    created_at: e.date,
    ...e,
  });

  const events: VehicleEvent[] = [
    // LX21 ABC
    ev({ vehicle_id: 1, kind: "service", date: inDays(-377), mileage: 36500, supplier: "Northside Garage", invoice_no: "NG-2014", cost: 268, note: "Full service" }),
    ev({ vehicle_id: 1, kind: "mot", date: inDays(-341), mileage: 36900, supplier: "City MOT Centre", cost: 54.85, passed: true, note: "Advisory: rear brake pads wearing" }),
    ev({ vehicle_id: 1, kind: "tyre_change", date: inDays(-260), mileage: 39800, supplier: "Kwik Fit", invoice_no: "KF-88213", cost: 412, note: "2 front tyres replaced", tread: { FL: 7, FR: 7, RL: 5, RR: 5 } }),
    ev({ vehicle_id: 1, kind: "mileage", date: inDays(-95), mileage: 45100 }),
    ev({ vehicle_id: 1, kind: "fuel", date: inDays(-22), mileage: 47420, litres: 58.2, cost: 86.72, supplier: "BP" }),
    ev({ vehicle_id: 1, kind: "fuel", date: inDays(-10), mileage: 47930, litres: 55.1, cost: 81.55, supplier: "Shell", card: "424421", import_id: "fuel-1" }),
    ev({ vehicle_id: 1, kind: "fuel", date: inDays(-2), mileage: 48210, litres: 31.4, cost: 46.47, supplier: "BP" }),
    ev({ vehicle_id: 1, kind: "road_charge", date: inDays(-8), supplier: "TfL Auto Pay", invoice_no: "ULEZ-55102", cost: 12.5, note: "ULEZ daily charge", import_id: "charge-1" }),
    ev({ vehicle_id: 1, kind: "parking", date: inDays(-5), supplier: "RingGo", invoice_no: "RG-7741203", cost: 4.2, note: "Wood Green · Zone 8812", import_id: "charge-2" }),
    ev({ vehicle_id: 3, kind: "parking", date: inDays(-4), supplier: "RingGo", invoice_no: "RG-7741988", cost: 6.8, note: "Camden · Zone 5120", import_id: "charge-2" }),
    ev({ vehicle_id: 2, kind: "fine", date: inDays(-30), supplier: "Haringey Council", invoice_no: "PCN HG41022871", cost: 65, note: "Parking contravention, paid at the reduced rate" }),
    ev({ vehicle_id: 1, kind: "insurance", date: inDays(-205), supplier: "Aviva Fleet", invoice_no: "AV-20931", cost: 1180, file_name: "aviva-lx21abc.pdf" }),
    // Sent from the driver app: wait for approval
    ev({ vehicle_id: 1, kind: "parking", date: inDays(-1), supplier: "RingGo · Wood Green", cost: 8.4, status: "pending", submitted_by: "Jamie Storeman", created_by: "Jamie Storeman", project: "CF114 Haringey Disrepairs", file_name: "receipt-parking.jpg", note: "Parking at the site" }),
    ev({ vehicle_id: 1, kind: "cleaning", date: inDays(-3), supplier: "Hand car wash", cost: 15, status: "pending", submitted_by: "Jamie Storeman", created_by: "Jamie Storeman", file_name: "receipt-wash.jpg" }),
    ev({ vehicle_id: 2, kind: "vehicle_supplies", date: inDays(-2), supplier: "Halfords", cost: 22.99, status: "pending", submitted_by: "Morgan Buyer", created_by: "Morgan Buyer", file_name: "receipt-adblue.jpg", note: "AdBlue 10 L" }),
    ev({ vehicle_id: 4, kind: "mileage_claim", date: inDays(-1), cost: 28.8, claim_miles: 64, claim_rate: 45, status: "pending", submitted_by: "Jordan Supervisor", created_by: "Jordan Supervisor", project: "CF252 Haringey OT", note: "Office to Haringey site and back" }),
    ev({ vehicle_id: 4, kind: "mileage_claim", date: inDays(-12), cost: 18, claim_miles: 40, claim_rate: 45, status: "approved", submitted_by: "Jordan Supervisor", created_by: "Jordan Supervisor", project: "CF114 Haringey Disrepairs", note: "Site meeting", decided_by: SAMPLE_BY, decided_at: inDays(-11) }),
    ev({ vehicle_id: 2, kind: "parking", date: inDays(-20), supplier: "NCP Camden", cost: 24, status: "rejected", submitted_by: "Morgan Buyer", created_by: "Morgan Buyer", file_name: "receipt-ncp.jpg", decided_by: SAMPLE_BY, decided_at: inDays(-19), reject_reason: "Weekend parking, not for work." }),
    // KP70 XYZ
    ev({ vehicle_id: 2, kind: "mot", date: inDays(-225), mileage: 58200, supplier: "City MOT Centre", cost: 54.85, passed: true }),
    ev({ vehicle_id: 2, kind: "service", date: inDays(-65), mileage: 60900, supplier: "Northside Garage", invoice_no: "NG-2377", cost: 249, note: "Interim service" }),
    ev({ vehicle_id: 2, kind: "tyre_check", date: inDays(-20), mileage: 61500, tread: { FL: 5, FR: 5, RL: 6, RR: 6 } }),
    ev({ vehicle_id: 2, kind: "fuel", date: inDays(-6), mileage: 61840, litres: 44, cost: 65.12, supplier: "Esso", card: "427730", import_id: "fuel-1" }),
    // BD23 MNG
    ev({ vehicle_id: 3, kind: "mot", date: inDays(-145), mileage: 21000, supplier: "City MOT Centre", cost: 54.85, passed: true }),
    ev({ vehicle_id: 3, kind: "service", date: inDays(-35), mileage: 22000, supplier: "BMW Service", invoice_no: "BMW-55120", cost: 399, note: "Annual service" }),
    ev({ vehicle_id: 3, kind: "tyre_check", date: inDays(-30), mileage: 22100, tread: { FL: 6, FR: 6, RL: 6, RR: 5 } }),
    // WR19 PRV
    ev({ vehicle_id: 4, kind: "mot", date: inDays(-295), mileage: 50000, supplier: "Toyota Enfield", passed: true }),
    // YH18 VAN
    ev({ vehicle_id: 5, kind: "mot", date: inDays(-320), mileage: 89000, supplier: "City MOT Centre", cost: 54.85, passed: true }),
    ev({ vehicle_id: 5, kind: "service", date: inDays(-360), mileage: 88200, supplier: "Northside Garage", cost: 310 }),
    ev({ vehicle_id: 5, kind: "repair", date: inDays(-3), mileage: 98420, supplier: "Northside Garage", note: "Clutch slipping, booked in for a new clutch" }),
  ];

  const documents: VehicleDocument[] = [
    { id: 1, vehicle_id: 3, kind: "V5C registration certificate (logbook)", number: "1234 5678 9012", date: "2023-03-14", expires_on: "", note: "", file_name: "v5c-bd23mng.pdf", uploaded_by: SAMPLE_BY, uploaded_at: inDays(-200) },
    { id: 2, vehicle_id: 3, kind: "Insurance certificate", number: "POL-778812", date: inDays(-175), expires_on: inDays(190), note: "", file_name: "insurance-2026.pdf", uploaded_by: SAMPLE_BY, uploaded_at: inDays(-175) },
  ];

  const driver_logs: DriverLog[] = [
    { id: 1, vehicle_id: 1, driver_id: 101, driver_name: "Jamie Storeman", from: inDays(-400), to: null },
    { id: 2, vehicle_id: 2, driver_id: 106, driver_name: "Alex Finance", from: inDays(-380), to: inDays(-120) },
    { id: 3, vehicle_id: 2, driver_id: 102, driver_name: "Morgan Buyer", from: inDays(-120), to: null },
    { id: 4, vehicle_id: 3, driver_id: 104, driver_name: "Sam Carpenter", from: inDays(-200), to: inDays(-60) },
    { id: 5, vehicle_id: 4, driver_id: 103, driver_name: "Jordan Supervisor", from: inDays(-90), to: null },
  ];

  const permits: ParkingPermit[] = [
    { id: 1, vehicle_id: 3, zone: "Camden CA-F", issuer: "Camden Council", reference: "CA-F-2026-1042", valid_from: inDays(-300), valid_until: inDays(65), status: "approved", requested_by: SAMPLE_BY, decided_by: SAMPLE_BY, decided_at: inDays(-300), reject_reason: "" },
    { id: 2, vehicle_id: 3, zone: "Head office staff parking", issuer: "Belcka", reference: "HO-55-023", valid_from: inDays(-5), valid_until: inDays(360), status: "pending", requested_by: "Sam Carpenter (app)", decided_by: "", decided_at: "", reject_reason: "" },
    { id: 3, vehicle_id: 1, zone: "Haringey H-2", issuer: "Haringey Council", reference: "HG-H2-88710", valid_from: inDays(-340), valid_until: inDays(20), status: "approved", requested_by: SAMPLE_BY, decided_by: SAMPLE_BY, decided_at: inDays(-340), reject_reason: "" },
  ];

  const onboardings: VehicleOnboarding[] = [];
  const started = (vehicleId: number, driver: { id: number; name: string }, type: Vehicle["type"], at: string, doneCount: number) => {
    const template = defaultTemplateFor(type);
    if (!template) return;
    const o = newOnboarding(onboardings, vehicleId, driver, template, at);
    o.steps = o.steps.map((s, i) => (i < doneCount ? { ...s, done_at: at, done_by: SAMPLE_BY } : s));
    onboardings.push(o);
  };
  started(1, { id: 101, name: "Jamie Storeman" }, "company", inDays(-400), 6);
  started(2, { id: 102, name: "Morgan Buyer" }, "company", inDays(-120), 3);

  const check = (id: number, vehicleId: number, driver: string, date: string, mileage: number, defects: Record<string, string> = {}): DailyChecklist => ({
    id,
    vehicle_id: vehicleId,
    driver_name: driver,
    date,
    mileage,
    items: DAILY_CHECK_ITEMS.map((item) => ({
      item,
      ok: !(item in defects),
      note: defects[item] ?? "",
      // camera photos the driver took of the defect
      photos: item in defects ? [`${item.split(" ")[0].toLowerCase()}-${id}-1.jpg`, `${item.split(" ")[0].toLowerCase()}-${id}-2.jpg`] : [],
    })),
  });

  const checklists: DailyChecklist[] = [
    check(1, 1, "Jamie Storeman", inDays(-1), 48150),
    check(2, 2, "Morgan Buyer", inDays(-1), 61800),
    check(3, 1, "Jamie Storeman", today(), 48210, { "Tyres and wheels": "Front left tyre looks low on air" }),
    check(4, 2, "Morgan Buyer", today(), 61840),
    check(5, 2, "Morgan Buyer", inDays(-4), 61700, { "Mirrors and windows": "Passenger wing mirror glass cracked" }),
    check(6, 3, "Sam Carpenter", inDays(-70), 21400, { "Mirrors and windows": "Driver side wiper blade split" }),
  ];

  const defect = (d: Partial<Defect> & Pick<Defect, "id" | "vehicle_id" | "description" | "reported_by" | "reported_at">): Defect => ({
    type: "defect",
    category: "Other",
    severity: "minor",
    status: "open",
    owner: "",
    resolution: "",
    updated_by: d.reported_by,
    updated_at: d.reported_at,
    checklist_id: null,
    ...d,
  });

  const defects: Defect[] = [
    defect({ id: 1, vehicle_id: 1, category: "Tyres and wheels", severity: "major", description: "Front left tyre looks low on air", reported_by: "Jamie Storeman", reported_at: today(), checklist_id: 3 }),
    defect({ id: 2, vehicle_id: 2, category: "Mirrors and windows", severity: "minor", description: "Passenger wing mirror glass cracked", reported_by: "Morgan Buyer", reported_at: inDays(-4), checklist_id: 5 }),
    defect({ id: 3, vehicle_id: 2, type: "accident", category: "Accident", severity: "major", incident_date: inDays(-3), photos: ["accident-kp70-1.jpg", "accident-kp70-2.jpg"], description: "Reversed into a bollard at the Camden site. Rear bumper dented, lights fine. Nobody hurt.", reported_by: "Morgan Buyer", reported_at: inDays(-3), status: "in_progress", owner: "Northside Garage", updated_by: SAMPLE_BY, updated_at: inDays(-2) }),
    defect({ id: 4, vehicle_id: 3, category: "Mirrors and windows", severity: "minor", description: "Driver side wiper blade split", reported_by: "Sam Carpenter", reported_at: inDays(-70), checklist_id: 6, status: "resolved", owner: "Office", resolution: "New wiper blades fitted", updated_by: SAMPLE_BY, updated_at: inDays(-68) }),
    defect({ id: 5, vehicle_id: 1, type: "accident", category: "Accident", severity: "minor", incident_date: inDays(-1), photos: [], description: "Wing mirror clipped by a passing van while parked on Lordship Lane. Mirror still works.", reported_by: "Jamie Storeman", reported_at: inDays(-1) }),
  ];

  const licences: DriverLicence[] = [
    { driver_id: 101, driver_name: "Jamie Storeman", categories: "B, BE", checked_on: inDays(-60), valid_until: inDays(300), checked_by: SAMPLE_BY, reference: "DVLA check code ZX 12 AB 34" },
    { driver_id: 102, driver_name: "Morgan Buyer", categories: "B", checked_on: inDays(-200), valid_until: inDays(18), checked_by: SAMPLE_BY, reference: "" },
    { driver_id: 103, driver_name: "Jordan Supervisor", categories: "B", checked_on: inDays(-90), valid_until: inDays(1020), checked_by: SAMPLE_BY, reference: "" },
    { driver_id: 104, driver_name: "Sam Carpenter", categories: "B, C1", checked_on: inDays(-400), valid_until: inDays(-9), checked_by: SAMPLE_BY, reference: "" },
  ];

  const reimbursements: Reimbursement[] = [{ driver_id: 103, method: "per_mile", rate_pence: 45, fixed_amount: 0 }];

  const cards: FuelCard[] = [
    { id: 1, number: "424421", holder: "J STOREMAN", driver_id: 101, driver_name: "Jamie Storeman", group: "Drivers", expires: dayjs().add(14, "month").format("YYYY-MM"), blocked: false },
    { id: 2, number: "427730", holder: "M BUYER", driver_id: 102, driver_name: "Morgan Buyer", group: "Drivers", expires: dayjs().add(1, "month").format("YYYY-MM"), blocked: false },
    { id: 3, number: "421108", holder: "C COMMERCIAL", driver_id: 105, driver_name: "Casey Commercial", group: "Managers", expires: dayjs().add(20, "month").format("YYYY-MM"), blocked: false },
    { id: 4, number: "430019", holder: "POOL CARD 1", driver_id: null, driver_name: null, group: "Pool", expires: dayjs().add(8, "month").format("YYYY-MM"), blocked: false },
  ];

  const connection = (c: Partial<Connection> & Pick<Connection, "id" | "name" | "brings" | "kind" | "target">): Connection => ({
    connected: false,
    account: "",
    connected_by: "",
    connected_at: "",
    ...c,
  });

  const connections: Connection[] = [
    connection({ id: "shell", name: "Shell fuel cards", brings: "Monthly Fuel Consumption Report: litres and cost per card.", kind: "file", target: "fuel", connected: true, account: "Fleet Hub 88-4410", connected_by: SAMPLE_BY, connected_at: inDays(-120) }),
    connection({ id: "ringgo", name: "RingGo parking", brings: "Parking sessions paid on the RingGo Corporate account.", kind: "file", target: "charges", charge_kind: "parking", connected: true, account: "Corporate 552310", connected_by: SAMPLE_BY, connected_at: inDays(-90) }),
    connection({ id: "tfl", name: "TfL Auto Pay", brings: "Congestion Charge and ULEZ charges for each registration.", kind: "file", target: "charges", charge_kind: "road_charge", connected: true, account: "AP-1029384", connected_by: SAMPLE_BY, connected_at: inDays(-90) }),
    connection({ id: "dart", name: "Dart Charge", brings: "Dartford Crossing charges from the account statement.", kind: "file", target: "charges", charge_kind: "road_charge" }),
    connection({ id: "tflroads", name: "TfL road status", brings: "Which main London roads have delays or closures right now.", kind: "live", target: "none" }),
    connection({ id: "dvla", name: "DVLA vehicle check", brings: "Tax and MOT status and dates for each registration, so dates don't have to be typed.", kind: "server", target: "none" }),
    connection({ id: "dvsa", name: "DVSA MOT history", brings: "Past MOT tests, mileage at each test and advisory notes.", kind: "server", target: "none" }),
  ];

  const imports: ImportBatch[] = [
    { id: "fuel-1", connection_id: "shell", source: "Shell fuel cards", file_name: "shell-fuel-consumption.csv", period_from: inDays(-14), period_to: inDays(-1), rows: 2, litres: 99.1, total: 146.67, imported_by: SAMPLE_BY, imported_at: inDays(-1) },
    { id: "charge-1", connection_id: "tfl", source: "TfL Auto Pay", file_name: "tfl-autopay-statement.csv", period_from: inDays(-14), period_to: inDays(-7), rows: 1, litres: 0, total: 12.5, imported_by: SAMPLE_BY, imported_at: inDays(-6) },
    { id: "charge-2", connection_id: "ringgo", source: "RingGo parking", file_name: "ringgo-history.csv", period_from: inDays(-7), period_to: inDays(-3), rows: 2, litres: 0, total: 11, imported_by: SAMPLE_BY, imported_at: inDays(-2) },
  ];

  const conflicts: ImportConflict[] = [
    { id: 1, import_id: "charge-2", source: "RingGo parking", type: "unknown_registration", detail: "AB12 CDE · Stratford · RG-7742101", vehicle_id: null, date: inDays(-3), amount: 5.4, resolved: false, note: "", resolved_by: "", resolved_at: "" },
    { id: 2, import_id: "fuel-1", source: "Shell fuel cards", type: "over_fuel_limit", detail: "LX21 ABC used 86.5 L in one week, limit 60 L", vehicle_id: 1, date: inDays(-10), amount: null, resolved: true, note: "Long site run to Kent, agreed with the manager.", resolved_by: SAMPLE_BY, resolved_at: inDays(-1) },
  ];

  return {
    vehicles,
    events,
    documents,
    driver_logs,
    permits,
    onboardings,
    defects,
    checklists,
    settings: { ...DEFAULT_FLEET_RULES },
    templates: DEFAULT_ONBOARDING_TEMPLATES.map((t) => ({ ...t, steps: t.steps.map((s) => ({ ...s })) })),
    licences,
    reimbursements,
    cards,
    connections,
    imports,
    conflicts,
    locations: (() => {
      // Sample stops around north London, today and yesterday.
      const P: Record<string, [number, number]> = {
        "Wood Green": [51.5975, -0.1097],
        Tottenham: [51.5882, -0.0717],
        Hackney: [51.545, -0.0553],
        Camden: [51.539, -0.1426],
        Stratford: [51.5416, -0.0033],
        Enfield: [51.6523, -0.0807],
        "Haringey site CF114": [51.5869, -0.1035],
      };
      const t = (daysAgo: number, h: number, m: number) => dayjs().subtract(daysAgo, "day").hour(h).minute(m).second(0).toISOString();
      const rows: [number, string, number | null, string, string, string][] = [
        // driver, name, vehicle, at, place, action
        [101, "Jamie Storeman", 1, t(1, 7, 40), "Wood Green", "Daily checklist"],
        [101, "Jamie Storeman", 1, t(1, 10, 15), "Haringey site CF114", "Parking expense"],
        [101, "Jamie Storeman", 1, t(1, 15, 5), "Tottenham", "Fuel"],
        [101, "Jamie Storeman", 1, t(0, 7, 35), "Wood Green", "Daily checklist"],
        [101, "Jamie Storeman", 1, t(0, 9, 50), "Hackney", "Daily checklist · defect"],
        [101, "Jamie Storeman", 1, t(0, 12, 20), "Haringey site CF114", "Mileage"],
        [102, "Morgan Buyer", 2, t(1, 8, 0), "Camden", "Daily checklist"],
        [102, "Morgan Buyer", 2, t(0, 8, 5), "Camden", "Daily checklist"],
        [102, "Morgan Buyer", 2, t(0, 11, 30), "Stratford", "Vehicle supplies expense"],
        [103, "Jordan Supervisor", 4, t(1, 9, 10), "Enfield", "Mileage claim"],
      ];
      return rows.map(([driver_id, driver_name, vehicle_id, at, place, action], i) => ({
        id: i + 1,
        driver_id,
        driver_name,
        vehicle_id,
        at,
        lat: P[place][0],
        lng: P[place][1],
        place,
        action,
      }));
    })(),
    activities: [
      { id: 1, at: dayjs().subtract(400, "day").hour(9).toISOString(), by: SAMPLE_BY, area: "vehicle", vehicle_id: 1, action: "Vehicle added", detail: "LX21 ABC · Ford Transit Custom" },
      { id: 2, at: dayjs().subtract(120, "day").hour(10).toISOString(), by: SAMPLE_BY, area: "driver", vehicle_id: 2, action: "Driver assigned", detail: "KP70 XYZ · Morgan Buyer" },
      { id: 3, at: dayjs().subtract(60, "day").hour(14).toISOString(), by: SAMPLE_BY, area: "driver", vehicle_id: 3, action: "Driver removed", detail: "BD23 MNG · Sam Carpenter" },
      { id: 4, at: dayjs().subtract(35, "day").hour(11).toISOString(), by: SAMPLE_BY, area: "record", vehicle_id: 3, action: "Service added", detail: "BD23 MNG · BMW Service · £399.00" },
      { id: 5, at: dayjs().subtract(11, "day").hour(16).toISOString(), by: SAMPLE_BY, area: "expense", vehicle_id: 4, action: "Expense approved", detail: "WR19 PRV · Mileage claim · £18.00" },
      { id: 6, at: dayjs().subtract(6, "day").hour(8).toISOString(), by: SAMPLE_BY, area: "import", vehicle_id: null, action: "File imported", detail: "TfL Auto Pay · tfl-autopay-statement.csv · 1 row" },
      { id: 7, at: dayjs().subtract(2, "day").hour(9).toISOString(), by: SAMPLE_BY, area: "import", vehicle_id: null, action: "File imported", detail: "RingGo parking · ringgo-history.csv · 2 rows, 1 conflict" },
      { id: 8, at: dayjs().subtract(1, "day").hour(17).toISOString(), by: SAMPLE_BY, area: "import", vehicle_id: null, action: "Conflict resolved", detail: "Weekly fuel limit exceeded · LX21 ABC" },
    ],
  };
};

const read = (companyId?: number | null): FleetData => {
  let data = sampleData();
  try {
    const raw = window.localStorage.getItem(storageKey(companyId));
    if (raw) data = { ...data, ...JSON.parse(raw) };
  } catch {
    // storage blocked or broken: fall back to the sample data
  }
  applySettings(data);
  return data;
};

const write = (companyId: number | null | undefined, data: FleetData) => {
  try {
    window.localStorage.setItem(storageKey(companyId), JSON.stringify(data));
  } catch {
    // ignore: the screen still updates
  }
};

// Closes the current driver log row and opens a new one when the driver changes.
const changeDriverLog = (logs: DriverLog[], vehicleId: number, driver: DriverOption | null): DriverLog[] => {
  const open = logs.find((l) => l.vehicle_id === vehicleId && !l.to);
  if ((open?.driver_id ?? null) === (driver?.id ?? null)) return logs;
  const closed = logs.map((l) => (l === open ? { ...l, to: today() } : l));
  return driver
    ? [...closed, { id: nextId(logs), vehicle_id: vehicleId, driver_id: driver.id, driver_name: driver.name, from: today(), to: null }]
    : closed;
};

// A driver change closes the driver log row and, for company vehicles, starts the new driver's
// onboarding list (fleet_vehicle_drivers + fleet_vehicle_onboardings).
const withDriverChange = (d: FleetData, vehicleId: number, driver: DriverOption | null): FleetData => {
  const logs = changeDriverLog(d.driver_logs, vehicleId, driver);
  if (logs === d.driver_logs || !driver) return { ...d, driver_logs: logs };
  const vehicle = d.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle || vehicle.type === "private") return { ...d, driver_logs: logs };
  const template = defaultTemplateFor(vehicle.type);
  if (!template) return { ...d, driver_logs: logs };
  const onboarding = newOnboarding(d.onboardings, vehicleId, driver, template, today());
  return { ...d, driver_logs: logs, onboardings: [...d.onboardings, onboarding] };
};

const addMonths = (date: string, months: number) => dayjs(date).add(months, "month").format("YYYY-MM-DD");

// A new record moves the vehicle's mileage and due dates on, like the prototype does.
const applyEvent = (v: Vehicle, e: VehicleEvent): Vehicle => {
  const next = { ...v };
  if (e.mileage && e.mileage > next.mileage) next.mileage = e.mileage;
  const later = (current: string | undefined, candidate: string) =>
    !current || candidate > current ? candidate : current;
  if (e.kind === "service") next.service_due = later(next.service_due, addMonths(e.date, FLEET_RULES.serviceMonths));
  if (e.kind === "mot" && e.passed) next.mot_due = later(next.mot_due, addMonths(e.date, FLEET_RULES.motValidMonths));
  if (e.kind === "tyre_check" || e.kind === "tyre_change")
    next.tyre_check_due = later(next.tyre_check_due, addMonths(e.date, FLEET_RULES.tyreCheckMonths));
  return next;
};

// After a record is changed or deleted: mileage and the due dates that come from records are
// worked out again from what is left (dates typed on the vehicle stay when no record sets them).
const recompute = (v: Vehicle, events: VehicleEvent[]): Vehicle => {
  const mine = events.filter((e) => e.vehicle_id === v.id);
  const next = { ...v };
  const readings = mine.filter((e) => e.mileage).map((e) => e.mileage as number);
  if (readings.length) next.mileage = Math.max(...readings);
  const last = (match: (e: VehicleEvent) => boolean) => mine.filter(match).map((e) => e.date).sort().pop();
  const service = last((e) => e.kind === "service");
  if (service) next.service_due = addMonths(service, FLEET_RULES.serviceMonths);
  const mot = last((e) => e.kind === "mot" && !!e.passed);
  if (mot) next.mot_due = addMonths(mot, FLEET_RULES.motValidMonths);
  const tyres = last((e) => e.kind === "tyre_check" || e.kind === "tyre_change");
  if (tyres) next.tyre_check_due = addMonths(tyres, FLEET_RULES.tyreCheckMonths);
  return next;
};

export type NewEvent = Omit<VehicleEvent, "id" | "created_by" | "created_at">;
export type NewDocument = Omit<VehicleDocument, "id" | "uploaded_by" | "uploaded_at">;
export type NewPermit = Pick<ParkingPermit, "vehicle_id" | "zone" | "issuer" | "reference" | "valid_from" | "valid_until">;

export function useVehicles(companyId?: number | null, userName = "You") {
  const [data, setData] = useState<FleetData>({
    vehicles: [],
    events: [],
    documents: [],
    driver_logs: [],
    permits: [],
    onboardings: [],
    defects: [],
    checklists: [],
    settings: { ...DEFAULT_FLEET_RULES },
    templates: [],
    licences: [],
    reimbursements: [],
    cards: [],
    connections: [],
    imports: [],
    conflicts: [],
    activities: [],
    locations: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // undefined = session still loading; null = this user has no company, so there is nothing to load
    if (companyId === null) {
      setLoading(false);
      return;
    }
    if (!companyId) return;
    setData(read(companyId));
    setLoading(false);
  }, [companyId]);

  const update = useCallback(
    (change: (d: FleetData) => FleetData) => {
      setData((prev) => {
        const next = change(prev);
        applySettings(next);
        write(companyId, next);
        return next;
      });
    },
    [companyId],
  );

  const { vehicles } = data;

  // fleet_activities: every change below writes who did what.
  const regOf = (id: number | null | undefined) => vehicles.find((v) => v.id === id)?.registration ?? "";
  const log = (
    entries: { area: ActivityArea; vehicle_id: number | null; action: string; detail: string }[],
  ) => {
    if (!entries.length) return;
    update((d) => {
      let id = nextId(d.activities);
      const at = new Date().toISOString();
      return { ...d, activities: [...d.activities, ...entries.map((e) => ({ ...e, id: id++, at, by: userName }))] };
    });
  };

  // The other vehicle (current or archived) that already has this registration, if any.
  const findByRegistration = (registration: string, exceptId?: number) =>
    vehicles.find(
      (v) =>
        v.id !== exceptId &&
        v.registration.replace(/\s/g, "") === registration.replace(/\s/g, ""),
    );

  const save = async (form: VehicleForm, driver: DriverOption | null) => {
    const vid = form.id ?? nextId(data.vehicles);
    log([
      { area: "vehicle", vehicle_id: vid, action: form.id ? "Vehicle updated" : "Vehicle added", detail: `${form.registration.trim()} · ${form.make_model.trim()}` },
      ...((form.id ? data.vehicles.find((v) => v.id === form.id)?.driver_id ?? null : null) !== (driver?.id ?? null)
        ? [{ area: "driver" as const, vehicle_id: vid, action: driver ? "Driver assigned" : "Driver removed", detail: `${form.registration.trim()}${driver ? ` · ${driver.name}` : ""}` }]
        : []),
    ]);
    const fields = {
      registration: form.registration.trim(),
      make_model: form.make_model.trim(),
      type: form.type,
      fuel_type: form.fuel_type,
      mileage: Number(form.mileage || 0),
      status: form.status,
      driver_id: driver?.id ?? null,
      driver_name: driver?.name ?? null,
      driver_image: driver?.image ?? null,
      mot_due: form.mot_due,
      insurance_due: form.insurance_due,
      tax_due: form.type === "private" ? "" : form.tax_due,
      service_due: form.type === "private" ? "" : form.service_due,
      gps_tracker: form.gps_tracker.trim(),
      notes: form.notes.trim(),
    };
    update((d) => {
      const id = form.id ?? nextId(d.vehicles);
      const vehiclesNext = form.id
        ? d.vehicles.map((v) => (v.id === form.id ? { ...v, ...fields } : v))
        : [{ ...fields, id, tyre_check_due: "", created_at: today(), weekly_fuel_limit: 0 }, ...d.vehicles];
      // A new vehicle's mileage is its first odometer reading, so later readings are checked against it.
      const eventsNext: VehicleEvent[] = form.id
        ? d.events
        : [
            ...d.events,
            {
              id: nextId(d.events),
              vehicle_id: id,
              kind: "mileage",
              date: today(),
              mileage: fields.mileage,
              cost: null,
              supplier: "",
              invoice_no: "",
              note: "Added to the fleet",
              created_by: userName,
              created_at: today(),
            },
          ];
      return withDriverChange({ ...d, vehicles: vehiclesNext, events: eventsNext }, id, driver);
    });
  };

  const updateVehicle = async (id: number, patch: Partial<Vehicle>) => {
    log([
      {
        area: "vehicle",
        vehicle_id: id,
        action:
          patch.status === "in_service"
            ? "Taken off the road"
            : "weekly_fuel_limit" in patch
              ? "Weekly fuel limit changed"
              : "fuel_use_min" in patch
                ? "Normal fuel use changed"
                : "Vehicle details updated",
        detail: `${regOf(id)}${"weekly_fuel_limit" in patch ? ` · ${patch.weekly_fuel_limit ? `${patch.weekly_fuel_limit} L a week` : "no limit"}` : ""}${
          "fuel_use_min" in patch
            ? ` · ${patch.fuel_use_min || patch.fuel_use_max ? `${patch.fuel_use_min ?? "…"} – ${patch.fuel_use_max ?? "…"} L/100 km` : "not set"}`
            : ""
        }`,
      },
    ]);
    update((d) => ({ ...d, vehicles: d.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));
  };

  const assignDriver = async (id: number, driver: DriverOption | null) => {
    const before = vehicles.find((v) => v.id === id)?.driver_name;
    log([{ area: "driver", vehicle_id: id, action: driver ? "Driver assigned" : "Driver removed", detail: `${regOf(id)} · ${driver?.name ?? before ?? ""}` }]);
    update((d) =>
      withDriverChange(
        {
          ...d,
          vehicles: d.vehicles.map((v) =>
            v.id === id
              ? { ...v, driver_id: driver?.id ?? null, driver_name: driver?.name ?? null, driver_image: driver?.image ?? null }
              : v,
          ),
        },
        id,
        driver,
      ),
    );
  };

  // Archiving removes the driver; the vehicle keeps its history and can be restored.
  const archive = async (ids: number[]) => {
    log(ids.map((id) => ({ area: "vehicle" as const, vehicle_id: id, action: "Vehicle archived", detail: regOf(id) })));
    update((d) => ({
      ...d,
      vehicles: d.vehicles.map((v) =>
        ids.includes(v.id)
          ? { ...v, status: "archived", driver_id: null, driver_name: null, driver_image: null, archived_at: today() }
          : v,
      ),
      driver_logs: ids.reduce((logs, id) => changeDriverLog(logs, id, null), d.driver_logs),
    }));
  };

  const restore = async (ids: number[]) => {
    log(ids.map((id) => ({ area: "vehicle" as const, vehicle_id: id, action: "Vehicle restored", detail: regOf(id) })));
    update((d) => ({
      ...d,
      vehicles: d.vehicles.map((v) => (ids.includes(v.id) ? { ...v, status: "inactive", archived_at: null } : v)),
    }));
  };

  const addEvent = async (event: NewEvent) => {
    log([{ area: "record", vehicle_id: event.vehicle_id, action: `${EVENT_KINDS[event.kind].label} added`, detail: [regOf(event.vehicle_id), event.supplier, event.cost ? money(event.cost) : ""].filter(Boolean).join(" · ") }]);
    update((d) => {
      const saved: VehicleEvent = { ...event, id: nextId(d.events), created_by: userName, created_at: today() };
      return {
        ...d,
        events: [...d.events, saved],
        vehicles: d.vehicles.map((v) => (v.id === event.vehicle_id ? applyEvent(v, saved) : v)),
      };
    });
  };

  const addDocument = async (doc: NewDocument) => {
    log([{ area: "document", vehicle_id: doc.vehicle_id, action: "Document uploaded", detail: `${regOf(doc.vehicle_id)} · ${doc.kind}` }]);
    update((d) => ({
      ...d,
      documents: [...d.documents, { ...doc, id: nextId(d.documents), uploaded_by: userName, uploaded_at: today() }],
    }));
  };

  const removeDocument = async (id: number) => {
    const doc = data.documents.find((x) => x.id === id);
    if (doc) log([{ area: "document", vehicle_id: doc.vehicle_id, action: "Document removed", detail: `${regOf(doc.vehicle_id)} · ${doc.kind}` }]);
    update((d) => ({ ...d, documents: d.documents.filter((doc) => doc.id !== id) }));
  };

  // Change a record added on the web. Mileage and due dates are worked out again.
  const updateEvent = async (id: number, patch: Partial<NewEvent>) => {
    const ev = data.events.find((x) => x.id === id);
    if (ev) log([{ area: "record", vehicle_id: ev.vehicle_id, action: `${EVENT_KINDS[ev.kind].label} changed`, detail: [regOf(ev.vehicle_id), patch.date ? dayjs(patch.date).format("DD/MM/YYYY") : "", patch.cost ? money(patch.cost) : ""].filter(Boolean).join(" · ") }]);
    update((d) => {
      const events = d.events.map((e) => (e.id === id ? { ...e, ...patch } : e));
      return { ...d, events, vehicles: d.vehicles.map((v) => (v.id === ev?.vehicle_id ? recompute(v, events) : v)) };
    });
  };

  const deleteEvent = async (id: number) => {
    const ev = data.events.find((x) => x.id === id);
    if (ev) log([{ area: "record", vehicle_id: ev.vehicle_id, action: `${EVENT_KINDS[ev.kind].label} deleted`, detail: [regOf(ev.vehicle_id), dayjs(ev.date).format("DD/MM/YYYY"), ev.supplier, ev.cost ? money(ev.cost) : ""].filter(Boolean).join(" · ") }]);
    update((d) => {
      const events = d.events.filter((e) => e.id !== id);
      return { ...d, events, vehicles: d.vehicles.map((v) => (v.id === ev?.vehicle_id ? recompute(v, events) : v)) };
    });
  };

  // Attach an invoice or receipt file to a cost that has none yet.
  const attachFile = async (eventId: number, fileName: string) => {
    const ev = data.events.find((x) => x.id === eventId);
    if (ev) log([{ area: "record", vehicle_id: ev.vehicle_id, action: "Invoice file attached", detail: `${regOf(ev.vehicle_id)} · ${EVENT_KINDS[ev.kind].label} · ${fileName}` }]);
    update((d) => ({ ...d, events: d.events.map((e) => (e.id === eventId ? { ...e, file_name: fileName } : e)) }));
  };

  // Permits added on the web are approved straight away; requests from the app wait for approval.
  const addPermit = async (permit: NewPermit) => {
    log([{ area: "permit", vehicle_id: permit.vehicle_id, action: "Permit added", detail: `${regOf(permit.vehicle_id)} · ${permit.zone}` }]);
    update((d) => ({
      ...d,
      permits: [
        ...d.permits,
        {
          ...permit,
          id: nextId(d.permits),
          status: "approved",
          requested_by: userName,
          decided_by: userName,
          decided_at: today(),
          reject_reason: "",
        },
      ],
    }));
  };

  const decidePermit = async (id: number, approve: boolean, reason = "") => {
    const permit = data.permits.find((x) => x.id === id);
    if (permit) log([{ area: "permit", vehicle_id: permit.vehicle_id, action: approve ? "Permit approved" : "Permit rejected", detail: `${regOf(permit.vehicle_id)} · ${permit.zone}${reason ? ` · ${reason}` : ""}` }]);
    update((d) => ({
      ...d,
      permits: d.permits.map((p) =>
        p.id === id
          ? { ...p, status: approve ? "approved" : "rejected", decided_by: userName, decided_at: today(), reject_reason: reason }
          : p,
      ),
    }));
  };

  const removePermit = async (id: number) => {
    const permit = data.permits.find((x) => x.id === id);
    if (permit) log([{ area: "permit", vehicle_id: permit.vehicle_id, action: "Permit removed", detail: `${regOf(permit.vehicle_id)} · ${permit.zone}` }]);
    update((d) => ({ ...d, permits: d.permits.filter((p) => p.id !== id) }));
  };

  // Start the onboarding list for the current driver, or switch it to another type.
  const startOnboarding = async (vehicleId: number, templateId: number) => {
    log([{ area: "onboarding", vehicle_id: vehicleId, action: "Start list started", detail: `${regOf(vehicleId)} · ${ONBOARDING_TEMPLATES.find((t) => t.id === templateId)?.name ?? ""}` }]);
    update((d) => {
      const vehicle = d.vehicles.find((v) => v.id === vehicleId);
      const template = ONBOARDING_TEMPLATES.find((t) => t.id === templateId);
      if (!vehicle?.driver_id || !vehicle.driver_name || !template) return d;
      const others = d.onboardings.filter(
        (o) => !(o.vehicle_id === vehicleId && o.driver_id === vehicle.driver_id),
      );
      const fresh = newOnboarding(
        d.onboardings,
        vehicleId,
        { id: vehicle.driver_id, name: vehicle.driver_name },
        template,
        today(),
      );
      return { ...d, onboardings: [...others, fresh] };
    });
  };

  const toggleOnboardingStep = async (onboardingId: number, stepId: number) => {
    const ob = data.onboardings.find((o) => o.id === onboardingId);
    const step = ob?.steps.find((x) => x.id === stepId);
    if (ob && step) log([{ area: "onboarding", vehicle_id: ob.vehicle_id, action: step.done_at ? "Start list step unticked" : "Start list step done", detail: `${regOf(ob.vehicle_id)} · ${ob.driver_name} · ${step.title}` }]);
    update((d) => ({
      ...d,
      onboardings: d.onboardings.map((o) =>
        o.id === onboardingId
          ? {
              ...o,
              steps: o.steps.map((s) =>
                s.id === stepId
                  ? s.done_at
                    ? { ...s, done_at: null, done_by: null }
                    : { ...s, done_at: today(), done_by: userName }
                  : s,
              ),
            }
          : o,
      ),
    }));
  };

  const updateDefect = async (id: number, patch: Pick<Defect, "status" | "owner" | "resolution"> & { severity?: Defect["severity"] }) => {
    const defect = data.defects.find((x) => x.id === id);
    if (defect) log([{ area: "defect", vehicle_id: defect.vehicle_id, action: `${defect.type === "accident" ? "Accident" : "Defect"} ${patch.status.replace("_", " ")}`, detail: `${regOf(defect.vehicle_id)} · ${defect.type === "accident" ? "Accident" : defect.category}${patch.resolution ? ` · ${patch.resolution}` : ""}` }]);
    update((data) => ({
      ...data,
      defects: data.defects.map((d) =>
        d.id === id ? { ...d, ...patch, updated_by: userName, updated_at: today() } : d,
      ),
    }));
  };

  // Approve or reject expenses and mileage claims sent from the driver app.
  const decideExpenses = async (ids: number[], approve: boolean, reason = "") => {
    log(
      data.events
        .filter((e) => ids.includes(e.id) && e.status === "pending")
        .map((e) => ({ area: "expense" as const, vehicle_id: e.vehicle_id, action: approve ? "Expense approved" : "Expense rejected", detail: `${regOf(e.vehicle_id)} · ${EVENT_KINDS[e.kind].label} · ${money(e.cost)}${reason ? ` · ${reason}` : ""}` })),
    );
    update((data) => ({
      ...data,
      events: data.events.map((e) =>
        ids.includes(e.id) && e.status === "pending"
          ? {
              ...e,
              status: approve ? "approved" : "rejected",
              decided_by: userName,
              decided_at: today(),
              reject_reason: approve ? "" : reason,
            }
          : e,
      ),
    }));
  };

  // Puts a decided expense back to "Waiting for approval" (e.g. rejected by mistake).
  const reopenExpense = async (id: number) => {
    const e = data.events.find((x) => x.id === id);
    if (!e || !e.status || e.status === "pending") return;
    log([{ area: "expense", vehicle_id: e.vehicle_id, action: "Expense decision undone", detail: `${regOf(e.vehicle_id)} · ${EVENT_KINDS[e.kind].label} · ${money(e.cost)} · was ${e.status}` }]);
    update((d) => ({
      ...d,
      events: d.events.map((x) =>
        x.id === id ? { ...x, status: "pending", decided_by: "", decided_at: "", reject_reason: "" } : x,
      ),
    }));
  };

  // fleet_settings
  const saveSettings = async (settings: FleetRules) => {
    log([{ area: "settings", vehicle_id: null, action: "Fleet rules changed", detail: `Service ${settings.serviceMonths} months / ${settings.serviceMiles} mi · tyres ${settings.tyreCheckMonths} months · due soon ${settings.dueSoonDays} days` }]);
    update((d) => ({ ...d, settings: { ...settings } }));
  };

  // fleet_onboarding_templates: add (no id) or edit a type. Lists already started keep their steps.
  const saveTemplate = async (template: { id?: number; name: string; steps: string[] }) => {
    log([{ area: "settings", vehicle_id: null, action: template.id ? "Onboarding type updated" : "Onboarding type added", detail: `${template.name} · ${template.steps.length} steps` }]);
    update((d) => {
      const stepId = Math.max(0, ...d.templates.flatMap((t) => t.steps.map((s) => s.id))) + 1;
      const steps = template.steps.map((title, i) => {
        const existing = d.templates.find((t) => t.id === template.id)?.steps.find((s) => s.title === title);
        return { id: existing?.id ?? stepId + i, title };
      });
      const templates = template.id
        ? d.templates.map((t) => (t.id === template.id ? { ...t, name: template.name, steps } : t))
        : [...d.templates, { id: nextId(d.templates), name: template.name, steps }];
      return { ...d, templates };
    });
  };

  const deleteTemplate = async (id: number) => {
    log([{ area: "settings", vehicle_id: null, action: "Onboarding type deleted", detail: data.templates.find((t) => t.id === id)?.name ?? "" }]);
    update((d) => ({ ...d, templates: d.templates.filter((t) => t.id !== id) }));
  };

  // fleet_driver_licences: one record per driver
  const saveLicence = async (licence: Omit<DriverLicence, "checked_by"> & { checked_by?: string }) => {
    log([{ area: "driver", vehicle_id: null, action: "Licence check recorded", detail: `${licence.driver_name} · valid until ${dayjs(licence.valid_until).format("DD/MM/YYYY")}` }]);
    update((d) => ({
      ...d,
      licences: [
        ...d.licences.filter((l) => l.driver_id !== licence.driver_id),
        { ...licence, checked_by: licence.checked_by || userName },
      ],
    }));
  };

  // fleet_driver_reimbursements: null clears it (no reimbursement)
  const saveReimbursement = async (driverId: number, r: Reimbursement | null) => {
    log([{ area: "driver", vehicle_id: null, action: "Reimbursement changed", detail: r ? (r.method === "per_mile" ? `${r.rate_pence}p per mile` : `${money(r.fixed_amount)} a month`) : "None" }]);
    update((d) => ({
      ...d,
      reimbursements: [...d.reimbursements.filter((x) => x.driver_id !== driverId), ...(r ? [r] : [])],
    }));
  };

  // fleet_fuel_cards: add (no id) or edit
  const saveCard = async (card: Omit<FuelCard, "id"> & { id?: number }) => {
    log([{ area: "card", vehicle_id: null, action: card.id ? (card.blocked ? "Fuel card blocked" : "Fuel card updated") : "Fuel card added", detail: `•••• ${card.number}${card.driver_name ? ` · ${card.driver_name}` : ""}` }]);
    update((d) => ({
      ...d,
      cards: card.id
        ? d.cards.map((c) => (c.id === card.id ? { ...c, ...card, id: c.id } : c))
        : [...d.cards, { ...card, id: nextId(d.cards) }],
    }));
  };

  // fleet_connections
  const setConnection = async (id: string, connected: boolean, account = "") => {
    log([{ area: "settings", vehicle_id: null, action: connected ? "Service connected" : "Service disconnected", detail: data.connections.find((c) => c.id === id)?.name ?? id }]);
    update((d) => ({
      ...d,
      connections: d.connections.map((c) =>
        c.id === id
          ? { ...c, connected, account: connected ? account : c.account, connected_by: connected ? userName : "", connected_at: connected ? today() : "" }
          : c,
      ),
    }));
  };

  // Saves an imported file: the rows become vehicle records tagged with the import id, rows that
  // could not be placed become conflicts, and fuel imports are checked against weekly limits.
  const applyImport = async (
    batch: Omit<ImportBatch, "id" | "imported_by" | "imported_at">,
    rows: Omit<NewEvent, "import_id">[],
    skipped: Pick<ImportConflict, "type" | "detail" | "vehicle_id" | "date" | "amount">[],
    prefix: "fuel" | "charge",
  ) => {
    log([{ area: "import", vehicle_id: null, action: "File imported", detail: `${batch.source} · ${batch.file_name} · ${rows.length} row${rows.length === 1 ? "" : "s"}${skipped.length ? `, ${skipped.length} conflict${skipped.length === 1 ? "" : "s"}` : ""}` }]);
    update((d) => {
      const n = d.imports.filter((i) => i.id.startsWith(prefix)).length + 1;
      const id = `${prefix}-${n}`;
      let eventId = nextId(d.events);
      const created: VehicleEvent[] = rows.map((r) => ({
        ...r,
        id: eventId++,
        import_id: id,
        created_by: userName,
        created_at: today(),
      }));
      let vehiclesNext = d.vehicles;
      created.forEach((e) => {
        vehiclesNext = vehiclesNext.map((v) => (v.id === e.vehicle_id ? applyEvent(v, e) : v));
      });

      let conflictId = nextId(d.conflicts);
      const newConflicts: ImportConflict[] = skipped.map((c) => ({
        ...c,
        id: conflictId++,
        import_id: id,
        source: batch.source,
        resolved: false,
        note: "",
        resolved_by: "",
        resolved_at: "",
      }));

      if (prefix === "fuel") {
        // weekly litres per vehicle (Monday to Sunday) for the weeks this import touches
        const all = [...d.events, ...created].filter((e) => e.kind === "fuel");
        const monday = (date: string) => dayjs(date).subtract((dayjs(date).day() + 6) % 7, "day").format("YYYY-MM-DD");
        const weeks = new Set(created.map((e) => `${e.vehicle_id}|${monday(e.date)}`));
        weeks.forEach((key) => {
          const [vid, start] = key.split("|");
          const v = vehiclesNext.find((x) => x.id === Number(vid));
          const limit = v?.weekly_fuel_limit ?? 0;
          if (!v || !limit) return;
          const end = dayjs(start).add(6, "day").format("YYYY-MM-DD");
          const litres = all
            .filter((e) => e.vehicle_id === v.id && e.date >= start && e.date <= end)
            .reduce((sum, e) => sum + (e.litres ?? 0), 0);
          if (litres > limit) {
            newConflicts.push({
              id: conflictId++,
              import_id: id,
              source: batch.source,
              type: "over_fuel_limit",
              detail: `${v.registration} used ${litres.toFixed(1)} L in the week from ${dayjs(start).format("DD/MM")}, limit ${limit} L`,
              vehicle_id: v.id,
              date: start,
              amount: null,
              resolved: false,
              note: "",
              resolved_by: "",
              resolved_at: "",
            });
          }
        });
      }

      return {
        ...d,
        vehicles: vehiclesNext,
        events: [...d.events, ...created],
        imports: [...d.imports, { ...batch, id, imported_by: userName, imported_at: today() }],
        conflicts: [...d.conflicts, ...newConflicts],
      };
    });
  };

  // Removes the records an import created. Its open conflicts are closed with a note.
  const undoImport = async (id: string) => {
    const batch = data.imports.find((i) => i.id === id);
    log([{ area: "import", vehicle_id: null, action: "Import undone", detail: batch ? `${batch.source} · ${batch.file_name}` : id }]);
    update((d) => ({
      ...d,
      events: d.events.filter((e) => e.import_id !== id),
      imports: d.imports.map((i) => (i.id === id ? { ...i, undone_by: userName, undone_at: today() } : i)),
      conflicts: d.conflicts.map((c) =>
        c.import_id === id && !c.resolved
          ? { ...c, resolved: true, note: "Import undone", resolved_by: userName, resolved_at: today() }
          : c,
      ),
    }));
  };

  const resolveConflict = async (id: number, resolved: boolean, note: string) => {
    const conflict = data.conflicts.find((c) => c.id === id);
    if (conflict) log([{ area: "import", vehicle_id: conflict.vehicle_id, action: resolved ? "Conflict resolved" : "Conflict reopened", detail: `${conflict.source} · ${conflict.detail}${note ? ` · ${note}` : ""}` }]);
    update((d) => ({
      ...d,
      conflicts: d.conflicts.map((c) =>
        c.id === id ? { ...c, resolved, note, resolved_by: userName, resolved_at: today() } : c,
      ),
    }));
  };

  return {
    vehicles,
    settings: data.settings,
    activities: data.activities,
    locations: data.locations,
    reopenExpense,
    noCompany: companyId === null,
    updateEvent,
    deleteEvent,
    cards: data.cards,
    connections: data.connections,
    imports: data.imports,
    conflicts: data.conflicts,
    saveCard,
    setConnection,
    applyImport,
    undoImport,
    resolveConflict,
    templates: data.templates,
    licences: data.licences,
    reimbursements: data.reimbursements,
    saveSettings,
    saveTemplate,
    deleteTemplate,
    saveLicence,
    saveReimbursement,
    defects: data.defects,
    checklists: data.checklists,
    updateDefect,
    decideExpenses,
    events: data.events,
    documents: data.documents,
    driverLogs: data.driver_logs,
    permits: data.permits,
    onboardings: data.onboardings,
    attachFile,
    addPermit,
    decidePermit,
    removePermit,
    startOnboarding,
    toggleOnboardingStep,
    loading,
    save,
    updateVehicle,
    assignDriver,
    archive,
    restore,
    addEvent,
    addDocument,
    removeDocument,
    findByRegistration,
  };
}
