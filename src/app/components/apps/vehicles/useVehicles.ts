"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/utils/axios";
import {
  DailyChecklist,
  DEFAULT_FLEET_RULES,
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
  Connection,
  FuelCard,
  ImportBatch,
  ImportConflict,
  DriverLocation,
  FleetPlace,
  Vehicle,
  VehicleDocument,
  VehicleEvent,
  VehicleForm,
  VehicleOnboarding,
} from "./types";

// Everything in the Vehicles section comes from the vehicles API: vehicles, the driver log, licence checks and
// reimbursements, fuel cards, every vehicle record (fuel, service, MOT, tyres, costs, expenses from the app),
// file imports and their conflicts, documents, parking permits, defects and daily checks, start lists, fleet
// rules, start list types and connections, the activity log, Map places and driver locations.
// The API writes the activity log itself; this hook reads it again after each change.
// The API calls throw when they fail (the API's message is already shown as a toast), so callers
// keep their form open and do not show a success message.

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
  places: FleetPlace[];
}

const emptyData = (): FleetData => ({
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
  places: [],
});

// Saved rules and start list types are copied into the shared FLEET_RULES / ONBOARDING_TEMPLATES
// so every screen and helper uses them.
const applySettings = (d: Pick<FleetData, "settings" | "templates">) => {
  Object.assign(FLEET_RULES, DEFAULT_FLEET_RULES, d.settings);
  ONBOARDING_TEMPLATES.splice(0, ONBOARDING_TEMPLATES.length, ...d.templates);
};

// Fields the vehicles API saves (vehicles/update takes any of them).
const VEHICLE_API_FIELDS = [
  "registration",
  "make_model",
  "type",
  "fuel_type",
  "mileage",
  "status",
  "driver_id",
  "mot_due",
  "insurance_due",
  "tax_due",
  "gps_tracker",
  "notes",
  "vin",
  "first_registered",
  "v5c_reference",
  "registered_keeper",
  "engine",
  "parking",
  "next_photo_check",
  "weekly_fuel_limit",
  "fuel_use_min",
  "fuel_use_max",
] as const;

const vehicleApiBody = (patch: Partial<Vehicle>) =>
  Object.fromEntries(Object.entries(patch).filter(([k]) => (VEHICLE_API_FIELDS as readonly string[]).includes(k)));

const markApi = (list: VehicleEvent[]): VehicleEvent[] => list.map((e) => ({ ...e, from_api: true }));

// The record fields the vehicles/events API saves.
const EVENT_API_FIELDS = [
  "date",
  "mileage",
  "litres",
  "cost",
  "supplier",
  "invoice_no",
  "note",
  "station",
  "card",
  "passed",
  "tread",
  "wheels",
  "lowest_tread",
  "claim_miles",
  "claim_rate",
] as const;
const eventApiBody = (e: Partial<NewEvent>) => {
  const body = Object.fromEntries(EVENT_API_FIELDS.filter((k) => e[k] !== undefined).map((k) => [k, e[k]]));
  // photos are uploaded after the record is saved; only their state goes with the record
  if (body.wheels) {
    body.wheels = Object.fromEntries(Object.entries(e.wheels ?? {}).map(([w, v]) => [w, { state: v?.state }]));
  }
  return body;
};

// A file picked on a form: the invoice or receipt, and photos (a tyre check labels them FL/FR/RL/RR/extra).
export interface EventUploads {
  file?: File | null;
  photo_files?: { file: File; label?: string }[];
}

export type NewEvent = Omit<VehicleEvent, "id" | "created_by" | "created_at"> & EventUploads;
export type NewDocument = Omit<VehicleDocument, "id" | "uploaded_by" | "uploaded_at">;
export type NewPermit = Pick<ParkingPermit, "vehicle_id" | "zone" | "issuer" | "reference" | "valid_from" | "valid_until">;

const info = <T,>(res: { data?: { info?: T } }, fallback: T): T => res.data?.info ?? fallback;

export function useVehicles(companyId?: number | null, _userName = "You") {
  const [data, setData] = useState<FleetData>(emptyData);
  const [loading, setLoading] = useState(true);
  const activityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback((change: (d: FleetData) => FleetData) => {
    setData((prev) => {
      const next = change(prev);
      if (next.settings !== prev.settings || next.templates !== prev.templates) applySettings(next);
      return next;
    });
  }, []);

  useEffect(() => {
    // undefined = session still loading; null = this user has no company, so there is nothing to load
    if (companyId === null) {
      setLoading(false);
      return;
    }
    if (!companyId) return;
    let cancelled = false;
    setLoading(true);
    setData(emptyData());
    // One failed list does not empty the others.
    const get = (url: string, params?: Record<string, unknown>) =>
      api.get(url, params ? { params } : undefined).catch(() => ({ data: { info: undefined } }));
    Promise.all([
      get("vehicles/get", { status: "all" }),
      get("vehicles/drivers/get"),
      get("vehicles/fuel-cards/get"),
      get("vehicles/events/get"),
      get("vehicles/imports/get"),
      get("vehicles/documents/get"),
      get("vehicles/permits/get"),
      get("vehicles/defects/get"),
      get("vehicles/onboardings/get"),
      get("vehicles/settings/get"),
      get("vehicles/activities/get"),
      get("vehicles/places/get"),
      get("vehicles/locations/get"),
    ])
      .then(
        ([
          vehiclesRes,
          driversRes,
          cardsRes,
          eventsRes,
          importsRes,
          documentsRes,
          permitsRes,
          defectsRes,
          onboardingsRes,
          settingsRes,
          activitiesRes,
          placesRes,
          locationsRes,
        ]) => {
          if (cancelled) return;
          const drivers = info<any>(driversRes, {});
          const imports = info<any>(importsRes, {});
          const defects = info<any>(defectsRes, {});
          const settings = info<any>(settingsRes, {});
          const next: FleetData = {
            vehicles: info(vehiclesRes, []),
            driver_logs: drivers.driver_logs ?? [],
            licences: drivers.licences ?? [],
            reimbursements: drivers.reimbursements ?? [],
            cards: info(cardsRes, []),
            events: markApi(info(eventsRes, [])),
            documents: info(documentsRes, []),
            permits: info(permitsRes, []),
            imports: (imports.imports ?? []).map((i: ImportBatch) => ({ ...i, from_api: true })),
            conflicts: (imports.conflicts ?? []).map((c: ImportConflict) => ({ ...c, from_api: true })),
            defects: defects.defects ?? [],
            checklists: defects.checklists ?? [],
            onboardings: info(onboardingsRes, []),
            settings: { ...DEFAULT_FLEET_RULES, ...(settings.rules ?? {}) },
            templates: settings.templates ?? [],
            connections: settings.connections ?? [],
            activities: info(activitiesRes, []),
            places: info(placesRes, []),
            locations: info(locationsRes, []),
          };
          applySettings(next);
          setData(next);
        },
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(
    () => () => {
      if (activityTimer.current) clearTimeout(activityTimer.current);
    },
    [],
  );

  /* ---------- reading parts again after a change ---------- */

  // The API writes the activity log; it is read again shortly after each change (several changes, one read).
  const reloadActivities = () => {
    if (activityTimer.current) clearTimeout(activityTimer.current);
    activityTimer.current = setTimeout(() => {
      api
        .get("vehicles/activities/get")
        .then((res) => update((d) => ({ ...d, activities: info(res, d.activities) })))
        .catch(() => undefined);
    }, 300);
  };

  // The API keeps the driver log when a vehicle's driver changes; this reads it again afterwards.
  const reloadDriverLogs = () =>
    api
      .get("vehicles/drivers/get")
      .then((res) => update((d) => ({ ...d, driver_logs: res.data?.info?.driver_logs ?? d.driver_logs })))
      .catch(() => undefined); // the save itself worked; the API's message is already shown

  // A new driver of a company vehicle gets a start list from the API.
  const reloadOnboardings = () =>
    api
      .get("vehicles/onboardings/get")
      .then((res) => update((d) => ({ ...d, onboardings: info(res, d.onboardings) })))
      .catch(() => undefined);

  // Records of one vehicle, read again (e.g. the first mileage reading of a new vehicle).
  const reloadEvents = (vehicleId: number) =>
    api
      .get("vehicles/events/get", { params: { vehicle_id: vehicleId } })
      .then((res) =>
        update((d) => ({
          ...d,
          events: [...d.events.filter((e) => e.vehicle_id !== vehicleId), ...markApi(info(res, []))],
        })),
      )
      .catch(() => undefined);

  // The vehicle as the API has it now (records move its mileage and due dates on).
  const reloadVehicle = (vehicleId: number) =>
    api
      .get("vehicles/get", { params: { id: vehicleId, status: "all" } })
      .then((res) => {
        const fresh: Vehicle | undefined = res.data?.info?.[0];
        if (fresh) update((d) => withVehicle(d, fresh));
      })
      .catch(() => undefined);

  // Puts a vehicle returned by the API into the list (new ones first).
  const withVehicle = (d: FleetData, saved: Vehicle): FleetData => ({
    ...d,
    vehicles: d.vehicles.some((v) => v.id === saved.id)
      ? d.vehicles.map((v) => (v.id === saved.id ? saved : v))
      : [saved, ...d.vehicles],
  });

  const withEvents = (d: FleetData, saved: VehicleEvent[]): FleetData => {
    const ids = new Set(saved.map((e) => e.id));
    return { ...d, events: [...d.events.filter((e) => !ids.has(e.id)), ...markApi(saved)] };
  };

  const { vehicles } = data;

  // The other vehicle (current or archived) that already has this registration, if any.
  const findByRegistration = (registration: string, exceptId?: number) =>
    vehicles.find(
      (v) =>
        v.id !== exceptId &&
        v.registration.replace(/\s/g, "") === registration.replace(/\s/g, ""),
    );

  /* ---------- vehicles ---------- */

  const save = async (form: VehicleForm, driver: DriverOption | null) => {
    const body = {
      registration: form.registration.trim(),
      make_model: form.make_model.trim(),
      type: form.type,
      fuel_type: form.fuel_type,
      mileage: Number(form.mileage || 0),
      status: form.status,
      driver_id: driver?.id ?? null,
      mot_due: form.mot_due,
      insurance_due: form.insurance_due,
      tax_due: form.type === "private" ? "" : form.tax_due,
      gps_tracker: form.gps_tracker.trim(),
      notes: form.notes.trim(),
    };
    const res = form.id
      ? await api.post("vehicles/update", { id: form.id, ...body })
      : await api.post("vehicles/create", body);
    const saved: Vehicle = res.data.info;
    update((d) => withVehicle(d, saved));
    reloadDriverLogs();
    reloadOnboardings();
    reloadActivities();
    // A new vehicle's first odometer reading is saved by the API.
    if (!form.id) reloadEvents(saved.id);
  };

  const updateVehicle = async (id: number, patch: Partial<Vehicle>) => {
    const body = vehicleApiBody(patch);
    if (!Object.keys(body).length) return;
    const res = await api.post("vehicles/update", { id, ...body });
    update((d) => withVehicle(d, res.data.info));
    reloadActivities();
  };

  // "Ask for a check now": the photo check is due today; the driver sees it in the app.
  const askPhotoCheck = async (id: number) => {
    const res = await api.post("vehicles/update", { id, next_photo_check: new Date().toISOString().slice(0, 10) });
    update((d) => withVehicle(d, res.data.info));
    reloadActivities();
  };

  const assignDriver = async (id: number, driver: DriverOption | null) => {
    const res = await api.post("vehicles/update", { id, driver_id: driver?.id ?? null });
    update((d) => withVehicle(d, res.data.info));
    reloadDriverLogs();
    reloadOnboardings();
    reloadActivities();
  };

  // Archiving removes the driver; the vehicle keeps its history and can be restored.
  const archive = async (ids: number[]) => {
    await api.post("vehicles/archive", { vehicle_ids: ids.join(",") });
    update((d) => ({
      ...d,
      vehicles: d.vehicles.map((v) =>
        ids.includes(v.id)
          ? { ...v, status: "archived", driver_id: null, driver_name: null, driver_image: null, archived_at: new Date().toISOString().slice(0, 10) }
          : v,
      ),
    }));
    reloadDriverLogs();
    reloadActivities();
  };

  const restore = async (ids: number[]) => {
    await api.post("vehicles/unarchive", { vehicle_ids: ids.join(",") });
    update((d) => ({
      ...d,
      vehicles: d.vehicles.map((v) => (ids.includes(v.id) ? { ...v, status: "inactive", archived_at: null } : v)),
    }));
    reloadActivities();
  };

  // Deletes the vehicles (the API keeps their records); they leave the list and the archive.
  const remove = async (ids: number[]) => {
    await api.post("vehicles/delete", { vehicle_ids: ids.join(",") });
    update((d) => ({ ...d, vehicles: d.vehicles.filter((v) => !ids.includes(v.id)) }));
    reloadDriverLogs();
    reloadActivities();
  };

  /* ---------- records, invoices and photos ---------- */

  // The invoice file and photos picked on the form go up after the record is saved.
  const uploadFor = async (eventId: number, uploads: EventUploads) => {
    let saved: VehicleEvent | null = null;
    if (uploads.file) {
      const form = new FormData();
      form.append("file", uploads.file);
      form.append("event_id", String(eventId));
      const res = await api.post("vehicles/events/attach-file", form, { headers: { "Content-Type": "multipart/form-data" } });
      saved = res.data.info;
    }
    if (uploads.photo_files?.length) {
      const form = new FormData();
      uploads.photo_files.forEach((p) => form.append("photos", p.file));
      form.append("target", "event");
      form.append("target_id", String(eventId));
      form.append("labels", uploads.photo_files.map((p) => p.label ?? "").join(","));
      await api.post("vehicles/photos/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      saved = null; // read again below with the photo links
    }
    return saved;
  };

  const addEvent = async (event: NewEvent) => {
    const res = await api.post("vehicles/events/create", { ...eventApiBody(event), vehicle_id: event.vehicle_id, kind: event.kind });
    let saved: VehicleEvent = res.data.info;
    update((d) => withEvents(d, [saved]));
    try {
      const withFiles = await uploadFor(saved.id, event);
      if (withFiles) saved = withFiles;
    } finally {
      // the record is saved even when a file could not be uploaded
      if (event.photo_files?.length) reloadEvents(event.vehicle_id);
      else update((d) => withEvents(d, [saved]));
      reloadVehicle(event.vehicle_id);
      reloadActivities();
    }
  };

  // Change a record. Mileage and due dates are worked out again by the API.
  const updateEvent = async (id: number, patch: Partial<NewEvent>) => {
    const res = await api.post("vehicles/events/update", { id, ...eventApiBody(patch) });
    let saved: VehicleEvent = res.data.info;
    const withFiles = await uploadFor(id, patch);
    if (withFiles) saved = withFiles;
    if (patch.photo_files?.length) reloadEvents(saved.vehicle_id);
    else update((d) => withEvents(d, [saved]));
    reloadVehicle(saved.vehicle_id);
    reloadActivities();
  };

  const deleteEvent = async (id: number) => {
    const ev = data.events.find((x) => x.id === id);
    await api.post("vehicles/events/delete", { event_ids: String(id) });
    update((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }));
    if (ev) reloadVehicle(ev.vehicle_id);
    reloadActivities();
  };

  // Attach an invoice or receipt file to a cost that has none yet.
  const attachFile = async (eventId: number, file: File) => {
    const saved = await uploadFor(eventId, { file });
    if (saved) update((d) => withEvents(d, [saved]));
    reloadActivities();
  };

  // Approve or reject expenses and mileage claims sent from the driver app.
  const decideExpenses = async (ids: number[], approve: boolean, reason = "") => {
    const pending = data.events.filter((e) => ids.includes(e.id) && e.status === "pending").map((e) => e.id);
    if (!pending.length) return;
    const res = await api.post("vehicles/events/decide", { event_ids: pending.join(","), approve, reason });
    const saved: VehicleEvent[] = info(res, []);
    update((d) => withEvents(d, saved));
    [...new Set(saved.map((e) => e.vehicle_id))].forEach((vid) => reloadVehicle(vid));
    reloadActivities();
  };

  // Puts a decided expense back to "Waiting for approval" (e.g. rejected by mistake).
  const reopenExpense = async (id: number) => {
    const e = data.events.find((x) => x.id === id);
    if (!e || !e.status || e.status === "pending") return;
    const res = await api.post("vehicles/events/reopen", { id });
    update((d) => withEvents(d, [res.data.info]));
    reloadVehicle(e.vehicle_id);
    reloadActivities();
  };

  /* ---------- documents and permits ---------- */

  // Uploads the photo or PDF with the document's details (multipart, vehicles/documents/create).
  const addDocument = async (doc: NewDocument, file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("vehicle_id", String(doc.vehicle_id));
    form.append("kind", doc.kind);
    form.append("number", doc.number ?? "");
    form.append("date", doc.date ?? "");
    form.append("expires_on", doc.expires_on ?? "");
    form.append("note", doc.note ?? "");
    const res = await api.post("vehicles/documents/create", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const saved: VehicleDocument = res.data.info;
    update((d) => ({ ...d, documents: [...d.documents, saved] }));
    reloadActivities();
  };

  const removeDocument = async (id: number) => {
    await api.post("vehicles/documents/delete", { document_ids: String(id) });
    update((d) => ({ ...d, documents: d.documents.filter((doc) => doc.id !== id) }));
    reloadActivities();
  };

  // Added in the office: the API approves it straight away (vehicles/permits/create).
  const addPermit = async (permit: NewPermit) => {
    const res = await api.post("vehicles/permits/create", permit);
    update((d) => ({ ...d, permits: [...d.permits, res.data.info] }));
    reloadActivities();
  };
  // Approve or reject a request from the driver app (a reason is needed to reject).
  const decidePermit = async (id: number, approve: boolean, reason = "") => {
    const res = await api.post("vehicles/permits/decide", { id, approve, reason });
    const saved: ParkingPermit = res.data.info;
    update((d) => ({ ...d, permits: d.permits.map((p) => (p.id === id ? saved : p)) }));
    reloadActivities();
  };
  const removePermit = async (id: number) => {
    await api.post("vehicles/permits/delete", { permit_ids: String(id) });
    update((d) => ({ ...d, permits: d.permits.filter((p) => p.id !== id) }));
    reloadActivities();
  };

  /* ---------- Map places ---------- */

  const addPlace = async (place: Omit<FleetPlace, "id" | "created_by" | "created_at">) => {
    const res = await api.post("vehicles/places/create", place);
    update((d) => ({ ...d, places: [...d.places, res.data.info] }));
    reloadActivities();
  };

  const removePlace = async (id: number) => {
    await api.post("vehicles/places/delete", { id });
    update((d) => ({ ...d, places: d.places.filter((x) => x.id !== id) }));
    reloadActivities();
  };

  /* ---------- start lists ---------- */

  const withOnboarding = (d: FleetData, saved: VehicleOnboarding): FleetData => ({
    ...d,
    // starting a list replaces the unfinished one of the same driver
    onboardings: [
      ...d.onboardings.filter(
        (o) => o.id !== saved.id && !(o.vehicle_id === saved.vehicle_id && o.driver_id === saved.driver_id && o.steps.some((s) => !s.done_at)),
      ),
      saved,
    ],
  });

  // Start the onboarding list for the current driver, or switch it to another type.
  const startOnboarding = async (vehicleId: number, templateId: number) => {
    const res = await api.post("vehicles/onboardings/start", { vehicle_id: vehicleId, template_id: templateId });
    update((d) => withOnboarding(d, res.data.info));
    reloadActivities();
  };

  const toggleOnboardingStep = async (onboardingId: number, stepId: number) => {
    const res = await api.post("vehicles/onboardings/toggle-step", { onboarding_id: onboardingId, step_id: stepId });
    const saved: VehicleOnboarding = res.data.info;
    update((d) => ({ ...d, onboardings: d.onboardings.map((o) => (o.id === saved.id ? saved : o)) }));
    reloadActivities();
  };

  /* ---------- defects ---------- */

  const updateDefect = async (id: number, patch: Pick<Defect, "status" | "owner" | "resolution"> & { severity?: Defect["severity"] }) => {
    const res = await api.post("vehicles/defects/update", { id, ...patch });
    const saved: Defect = res.data.info;
    update((d) => ({ ...d, defects: d.defects.map((x) => (x.id === id ? saved : x)) }));
    reloadActivities();
  };

  /* ---------- settings ---------- */

  const saveSettings = async (settings: FleetRules) => {
    const res = await api.post("vehicles/settings/save", settings);
    update((d) => ({ ...d, settings: { ...DEFAULT_FLEET_RULES, ...res.data.info } }));
    // due dates use the new rules
    api
      .get("vehicles/get", { params: { status: "all" } })
      .then((r) => update((d) => ({ ...d, vehicles: info(r, d.vehicles) })))
      .catch(() => undefined);
    reloadActivities();
  };

  // Add (no id) or edit a start list type. Lists already started keep their steps.
  const saveTemplate = async (template: { id?: number; name: string; steps: string[] }) => {
    const res = await api.post("vehicles/settings/save-template", template);
    const saved: OnboardingTemplate = res.data.info;
    update((d) => ({
      ...d,
      templates: d.templates.some((t) => t.id === saved.id)
        ? d.templates.map((t) => (t.id === saved.id ? saved : t))
        : [...d.templates, saved],
    }));
    reloadActivities();
  };

  const deleteTemplate = async (id: number) => {
    await api.post("vehicles/settings/delete-template", { id });
    update((d) => ({ ...d, templates: d.templates.filter((t) => t.id !== id) }));
    reloadActivities();
  };

  const setConnection = async (id: string, connected: boolean, account = "") => {
    const res = await api.post("vehicles/settings/set-connection", { id, connected, account });
    const saved: Connection = res.data.info;
    update((d) => ({ ...d, connections: d.connections.map((c) => (c.id === id ? saved : c)) }));
    reloadActivities();
  };

  /* ---------- drivers and fuel cards ---------- */

  // fleet_driver_licences: one record per driver
  const saveLicence = async (licence: Omit<DriverLicence, "checked_by"> & { checked_by?: string }) => {
    const res = await api.post("vehicles/drivers/save-licence", {
      driver_id: licence.driver_id,
      categories: licence.categories,
      checked_on: licence.checked_on,
      valid_until: licence.valid_until,
      reference: licence.reference,
      ...(licence.checked_by ? { checked_by: licence.checked_by } : {}),
    });
    const saved: DriverLicence = res.data.info;
    update((d) => ({ ...d, licences: [...d.licences.filter((l) => l.driver_id !== saved.driver_id), saved] }));
    reloadActivities();
  };

  // fleet_driver_reimbursements: null clears it (no reimbursement)
  const saveReimbursement = async (driverId: number, r: Reimbursement | null) => {
    let saved: Reimbursement | null = null;
    if (r) {
      const res = await api.post("vehicles/drivers/save-reimbursement", {
        driver_id: driverId,
        method: r.method,
        rate_pence: r.rate_pence,
        fixed_amount: r.fixed_amount,
      });
      saved = res.data.info;
    } else if (data.reimbursements.some((x) => x.driver_id === driverId)) {
      await api.post("vehicles/drivers/delete-reimbursement", { driver_id: driverId });
    }
    update((d) => ({
      ...d,
      reimbursements: [...d.reimbursements.filter((x) => x.driver_id !== driverId), ...(saved ? [saved] : [])],
    }));
    reloadActivities();
  };

  // fleet_fuel_cards: add (no id) or edit
  const saveCard = async (card: Omit<FuelCard, "id"> & { id?: number }) => {
    const body = {
      number: card.number,
      holder: card.holder,
      driver_id: card.driver_id,
      group: card.group,
      expires: card.expires,
      blocked: card.blocked,
    };
    const res = card.id
      ? await api.post("vehicles/fuel-cards/update", { id: card.id, ...body })
      : await api.post("vehicles/fuel-cards/create", body);
    const saved: FuelCard = res.data.info;
    update((d) => ({
      ...d,
      cards: d.cards.some((c) => c.id === saved.id) ? d.cards.map((c) => (c.id === saved.id ? saved : c)) : [...d.cards, saved],
    }));
    reloadActivities();
  };

  /* ---------- file imports ---------- */

  // Saves an imported file: the rows become vehicle records tagged with the import id, rows that
  // could not be placed become conflicts, and fuel imports are checked against weekly limits.
  const applyImport = async (
    batch: Omit<ImportBatch, "id" | "imported_by" | "imported_at">,
    rows: Omit<NewEvent, "import_id">[],
    skipped: Pick<ImportConflict, "type" | "detail" | "vehicle_id" | "date" | "amount">[],
    prefix: "fuel" | "charge",
  ): Promise<string | undefined> => {
    const skippedRows = skipped.map((c) => ({ type: c.type, detail: c.detail, vehicle_id: c.vehicle_id, date: c.date, amount: c.amount }));
    const res =
      prefix === "fuel"
        ? await api.post("vehicles/imports/fuel", {
            source: batch.source,
            file_name: batch.file_name,
            rows: rows.map((r) => ({
              vehicle_id: r.vehicle_id,
              date: r.date,
              mileage: r.mileage,
              litres: r.litres,
              cost: r.cost,
              supplier: r.supplier,
              card: r.card,
            })),
            skipped: skippedRows,
          })
        : await api.post("vehicles/imports/charges", {
            source: batch.source,
            file_name: batch.file_name,
            // every row of a file is the same kind (the service's charge kind)
            kind: rows[0]?.kind ?? "road_charge",
            rows: rows.map((r) => ({ vehicle_id: r.vehicle_id, date: r.date, cost: r.cost, reference: r.invoice_no, place: r.note })),
            skipped: skippedRows,
          });
    const result = res.data.info;
    const created: VehicleEvent[] = markApi(result.events ?? []);
    update((d) => ({
      ...d,
      events: [...d.events, ...created],
      imports: [{ ...result.import, from_api: true }, ...d.imports],
      conflicts: [...(result.conflicts ?? []).map((c: ImportConflict) => ({ ...c, from_api: true })), ...d.conflicts],
    }));
    // fuel readings move each vehicle's mileage on
    if (prefix === "fuel") [...new Set(created.map((e) => e.vehicle_id))].forEach((id) => reloadVehicle(id));
    reloadActivities();
    return res.data.message;
  };

  // Removes the records an import created. Its open conflicts are closed with a note.
  const undoImport = async (id: string) => {
    await api.post("vehicles/imports/undo", { import_id: id });
    const touched = [...new Set(data.events.filter((e) => e.import_id === id).map((e) => e.vehicle_id))];
    const res = await api.get("vehicles/imports/get").catch(() => null);
    update((d) => ({
      ...d,
      events: d.events.filter((e) => e.import_id !== id),
      ...(res && {
        imports: (res.data?.info?.imports ?? []).map((i: ImportBatch) => ({ ...i, from_api: true })),
        conflicts: (res.data?.info?.conflicts ?? []).map((c: ImportConflict) => ({ ...c, from_api: true })),
      }),
    }));
    touched.forEach((vid) => reloadVehicle(vid));
    reloadActivities();
  };

  const resolveConflict = async (id: number, resolved: boolean, note: string) => {
    const res = await api.post("vehicles/imports/resolve-conflict", { id, resolved, note });
    const saved: ImportConflict = { ...res.data.info, from_api: true };
    update((d) => ({ ...d, conflicts: d.conflicts.map((c) => (c.id === id ? saved : c)) }));
    reloadActivities();
  };

  return {
    vehicles,
    settings: data.settings,
    activities: data.activities,
    locations: data.locations,
    places: data.places,
    addPlace,
    removePlace,
    askPhotoCheck,
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
    remove,
    addEvent,
    addDocument,
    removeDocument,
    findByRegistration,
  };
}
