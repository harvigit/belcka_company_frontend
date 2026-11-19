"use client";
import React, { useEffect, useState } from "react";
import { Alert, Box, MenuItem, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "../../inventory-new/shared/FormDrawer";
import FormField from "../../inventory-new/shared/FormField";
import { EventKind, EVENT_KINDS, FLEET_RULES, formatMiles, Vehicle, VehicleEvent } from "../types";
import { NewEvent } from "../useVehicles";

const WHEELS = [
  ["FL", "Front left"],
  ["FR", "Front right"],
  ["RL", "Rear left"],
  ["RR", "Rear right"],
] as const;

type Wheel = (typeof WHEELS)[number][0];

interface FormState {
  date: string;
  mileage: string;
  cost: string;
  supplier: string;
  invoice_no: string;
  note: string;
  litres: string;
  passed: "yes" | "no";
  tread: Record<Wheel, string>;
}

const blank = (): FormState => ({
  date: dayjs().format("YYYY-MM-DD"),
  mileage: "",
  cost: "",
  supplier: "",
  invoice_no: "",
  note: "",
  litres: "",
  passed: "yes",
  tread: { FL: "", FR: "", RL: "", RR: "" },
});

// What each record type asks for, so every form shows only fields that matter.
// Invoice-only costs (insurance, parking, fines...) use the Invoices tab form instead.
const FIELDS: Partial<Record<
  EventKind,
  {
    title: string;
    mileage: "required" | "optional";
    cost: boolean;
    supplier?: string;
    invoice?: boolean;
    note: string;
    noteRequired?: boolean;
    info?: string;
  }
>> = {
  service: {
    title: "Add service",
    mileage: "required",
    cost: true,
    supplier: "Garage",
    invoice: true,
    note: "Work done",
    info: `The next service moves to ${FLEET_RULES.serviceMonths} months after this date.`,
  },
  mot: {
    title: "Add MOT",
    mileage: "required",
    cost: true,
    supplier: "Test centre",
    note: "Advisories",
    info: `A pass moves the MOT date to ${FLEET_RULES.motValidMonths} months after the test.`,
  },
  tyre_check: {
    title: "Add tyre check",
    mileage: "optional",
    cost: false,
    note: "Note",
    info: `Tyres at ${FLEET_RULES.treadLimitMm} mm or less need replacing. The next check moves to ${FLEET_RULES.tyreCheckMonths} months after this date.`,
  },
  tyre_change: {
    title: "Add tyre change",
    mileage: "optional",
    cost: true,
    supplier: "Fitter",
    invoice: true,
    note: "Which tyres were changed",
    noteRequired: true,
  },
  fuel: {
    title: "Log fuel",
    mileage: "required",
    cost: true,
    supplier: "Station",
    note: "Note",
  },
  mileage: {
    title: "Add mileage reading",
    mileage: "required",
    cost: false,
    note: "Note",
  },
  repair: {
    title: "Add repair",
    mileage: "optional",
    cost: true,
    supplier: "Garage",
    invoice: true,
    note: "What was repaired",
    noteRequired: true,
  },
  accident: {
    title: "Record accident",
    mileage: "optional",
    cost: true,
    note: "What happened",
    noteRequired: true,
  },
};

// Record types this form can add or edit (invoice-only costs use the Invoices tab form).
export const hasEventForm = (kind: EventKind) => !!FIELDS[kind];

interface EventDrawerProps {
  kind: EventKind | null;
  // the record being changed; empty when adding a new one
  editing?: VehicleEvent | null;
  vehicle: Vehicle;
  events: VehicleEvent[];
  onClose: () => void;
  onSave: (event: NewEvent) => Promise<void>;
}

const decimal = (value: string, max = 7) => new RegExp(`^\\d{0,${max}}(\\.\\d{0,2})?$`).test(value);

const EventDrawer: React.FC<EventDrawerProps> = ({ kind: newKind, editing, vehicle, events: allEvents, onClose, onSave }) => {
  const kind = editing?.kind ?? newKind;
  // the record being edited doesn't count against itself
  const events = editing ? allEvents.filter((e) => e.id !== editing.id) : allEvents;
  const [form, setForm] = useState<FormState>(blank);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!kind) return;
    setShowErrors(false);
    if (!editing) {
      setForm(blank());
      return;
    }
    setForm({
      date: editing.date,
      mileage: editing.mileage ? String(editing.mileage) : "",
      cost: editing.cost !== null && editing.cost !== undefined ? String(editing.cost) : "",
      supplier: editing.supplier,
      invoice_no: editing.invoice_no,
      note: editing.note,
      litres: editing.litres ? String(editing.litres) : "",
      passed: editing.passed === false ? "no" : "yes",
      tread: {
        FL: editing.tread?.FL !== undefined ? String(editing.tread.FL) : "",
        FR: editing.tread?.FR !== undefined ? String(editing.tread.FR) : "",
        RL: editing.tread?.RL !== undefined ? String(editing.tread.RL) : "",
        RR: editing.tread?.RR !== undefined ? String(editing.tread.RR) : "",
      },
    });
  }, [kind, editing]);

  const cfg = kind ? FIELDS[kind] : undefined;
  if (!kind || !cfg) return null;
  // Fuel follows the "odometer at every fill" setting; other records use their own rule.
  const mileageRequired = kind === "fuel" ? FLEET_RULES.odometerEveryFill : cfg.mileage === "required";
  const set = <K extends keyof FormState>(name: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  // An odometer can't go backwards: compare with the highest reading on or before this date.
  const readingBefore = Math.max(
    0,
    ...events.filter((e) => e.date <= form.date && e.mileage).map((e) => e.mileage as number),
    !editing && form.date >= dayjs().format("YYYY-MM-DD") ? vehicle.mileage : 0,
  );
  // ...and a back-dated reading can't be higher than a later one.
  const later = events.filter((e) => e.date > form.date && e.mileage).map((e) => e.mileage as number);
  const readingAfter = later.length ? Math.min(...later) : null;
  const mileage = form.mileage === "" ? null : Number(form.mileage);

  const errors: Partial<Record<"date" | "mileage" | "litres" | "cost" | "note" | "tread", string>> = {};
  if (!form.date) errors.date = "Choose a date.";
  else if (form.date > dayjs().format("YYYY-MM-DD")) errors.date = "The date can't be in the future.";
  if (mileage === null && mileageRequired && showErrors) errors.mileage = "Enter the odometer reading.";
  if (mileage !== null && mileage < readingBefore)
    errors.mileage = `Can't be lower than the last reading (${formatMiles(readingBefore)}).`;
  else if (mileage !== null && readingAfter !== null && mileage > readingAfter)
    errors.mileage = `Can't be higher than a later reading (${formatMiles(readingAfter)}).`;
  if (kind === "fuel" && showErrors) {
    if (!(Number(form.litres) > 0)) errors.litres = "Enter the litres.";
    if (!(Number(form.cost) > 0)) errors.cost = "Enter the cost.";
  }
  if (cfg.noteRequired && showErrors && !form.note.trim()) errors.note = "Please describe it.";
  if (kind === "tyre_check" && showErrors && WHEELS.some(([w]) => form.tread[w] === ""))
    errors.tread = "Enter the tread for all four tyres.";

  const lowTyres = WHEELS.filter(
    ([w]) => form.tread[w] !== "" && Number(form.tread[w]) <= FLEET_RULES.treadLimitMm,
  ).map(([, label]) => label);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    // re-check the "after first attempt" rules with showErrors on
    const missing =
      (mileageRequired && mileage === null) ||
      (kind === "fuel" && (!(Number(form.litres) > 0) || !(Number(form.cost) > 0))) ||
      (cfg.noteRequired && !form.note.trim()) ||
      (kind === "tyre_check" && WHEELS.some(([w]) => form.tread[w] === ""));
    if (missing || Object.keys(errors).length > 0) {
      toast.error("Please check the highlighted fields.");
      return;
    }
    const tread =
      kind === "tyre_check" || kind === "tyre_change"
        ? Object.fromEntries(
            WHEELS.filter(([w]) => form.tread[w] !== "").map(([w]) => [w, Number(form.tread[w])]),
          )
        : undefined;
    setSaving(true);
    try {
      await onSave({
        vehicle_id: vehicle.id,
        kind,
        date: form.date,
        mileage,
        cost: cfg.cost && form.cost !== "" ? Number(form.cost) : null,
        supplier: form.supplier.trim(),
        invoice_no: form.invoice_no.trim(),
        note: form.note.trim(),
        litres: kind === "fuel" ? Number(form.litres) : null,
        passed: kind === "mot" ? form.passed === "yes" : undefined,
        tread,
      });
      toast.success(`${EVENT_KINDS[kind].label} ${editing ? "updated" : "saved"} for ${vehicle.registration}.`);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDrawer open title={`${editing ? `Edit ${EVENT_KINDS[kind].label.toLowerCase()}` : cfg.title} · ${vehicle.registration}`} onClose={onClose} onSubmit={submit} isSaving={saving}>
      {cfg.info && <Alert severity="info">{cfg.info}</Alert>}
      {editing && (
        <Alert severity="warning">
          Saving works out the vehicle&apos;s mileage and due dates again from all its records.
        </Alert>
      )}

      <Stack direction="row" spacing={2}>
        <Box flex={1}>
          <FormField label="Date *">
            <CustomTextField
              type="date"
              value={form.date}
              onChange={(e: any) => set("date", e.target.value)}
              fullWidth
              error={!!errors.date}
              helperText={errors.date}
              slotProps={{ htmlInput: { max: dayjs().format("YYYY-MM-DD") } }}
            />
          </FormField>
        </Box>
        <Box flex={1}>
          <FormField label={`Odometer (miles)${mileageRequired ? " *" : ""}`}>
            <CustomTextField
              value={form.mileage}
              onChange={(e: any) => {
                const value = e.target.value.replace(/,/g, "");
                if (/^\d{0,7}$/.test(value)) set("mileage", value);
              }}
              placeholder={vehicle.mileage ? String(vehicle.mileage) : "0"}
              fullWidth
              error={!!errors.mileage}
              helperText={errors.mileage ?? `Last: ${formatMiles(vehicle.mileage)}`}
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
            />
          </FormField>
        </Box>
      </Stack>

      {kind === "mot" && (
        <FormField label="Result">
          <CustomTextField
            select
            value={form.passed}
            onChange={(e: any) => set("passed", e.target.value)}
            fullWidth
            size="small"
          >
            <MenuItem value="yes">Pass</MenuItem>
            <MenuItem value="no">Fail</MenuItem>
          </CustomTextField>
        </FormField>
      )}
      {kind === "mot" && form.passed === "no" && (
        <Alert severity="warning">
          A failed MOT does not move the MOT date. Book a re-test and record it when it passes.
        </Alert>
      )}

      {(kind === "tyre_check" || kind === "tyre_change") && (
        <FormField
          label={`Tread depth (mm)${kind === "tyre_check" ? " *" : ""}`}
          hint={kind === "tyre_change" ? "Optional: tread of the tyres after the change" : undefined}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            {WHEELS.map(([w, label]) => (
              <CustomTextField
                key={w}
                label={label}
                value={form.tread[w]}
                onChange={(e: any) => {
                  if (decimal(e.target.value, 2)) set("tread", { ...form.tread, [w]: e.target.value });
                }}
                size="small"
                error={
                  (!!errors.tread && form.tread[w] === "") ||
                  (form.tread[w] !== "" && Number(form.tread[w]) <= FLEET_RULES.treadLimitMm)
                }
                slotProps={{ htmlInput: { inputMode: "decimal" } }}
              />
            ))}
          </Box>
          {errors.tread && (
            <Typography variant="caption" color="error">
              {errors.tread}
            </Typography>
          )}
        </FormField>
      )}
      {lowTyres.length > 0 && (
        <Alert severity="error">
          {lowTyres.join(", ")} at or below {FLEET_RULES.treadLimitMm} mm: replace now.
        </Alert>
      )}

      {kind === "fuel" && (
        <Stack direction="row" spacing={2}>
          <Box flex={1}>
            <FormField label="Litres *">
              <CustomTextField
                value={form.litres}
                onChange={(e: any) => decimal(e.target.value, 4) && set("litres", e.target.value)}
                fullWidth
                error={!!errors.litres}
                helperText={errors.litres}
                slotProps={{ htmlInput: { inputMode: "decimal" } }}
              />
            </FormField>
          </Box>
          <Box flex={1}>
            <FormField label="Cost incl. VAT (£) *">
              <CustomTextField
                value={form.cost}
                onChange={(e: any) => decimal(e.target.value) && set("cost", e.target.value)}
                fullWidth
                error={!!errors.cost}
                helperText={
                  errors.cost ??
                  (Number(form.litres) > 0 && Number(form.cost) > 0
                    ? `£${(Number(form.cost) / Number(form.litres)).toFixed(3)} per litre`
                    : undefined)
                }
                slotProps={{ htmlInput: { inputMode: "decimal" } }}
              />
            </FormField>
          </Box>
        </Stack>
      )}

      {(cfg.supplier || (cfg.cost && kind !== "fuel")) && (
        <Stack direction="row" spacing={2}>
          {cfg.supplier && (
            <Box flex={1}>
              <FormField label={cfg.supplier}>
                <CustomTextField
                  value={form.supplier}
                  onChange={(e: any) => set("supplier", e.target.value.slice(0, 80))}
                  fullWidth
                />
              </FormField>
            </Box>
          )}
          {cfg.cost && kind !== "fuel" && (
            <Box flex={1}>
              <FormField label="Cost incl. VAT (£)">
                <CustomTextField
                  value={form.cost}
                  onChange={(e: any) => decimal(e.target.value) && set("cost", e.target.value)}
                  fullWidth
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                />
              </FormField>
            </Box>
          )}
        </Stack>
      )}

      {cfg.invoice && (
        <FormField label="Invoice number">
          <CustomTextField
            value={form.invoice_no}
            onChange={(e: any) => set("invoice_no", e.target.value.slice(0, 40))}
            fullWidth
          />
        </FormField>
      )}

      <FormField label={`${cfg.note}${cfg.noteRequired ? " *" : ""}`}>
        <CustomTextField
          value={form.note}
          onChange={(e: any) => set("note", e.target.value.slice(0, 300))}
          multiline
          minRows={2}
          fullWidth
          error={!!errors.note}
          helperText={errors.note}
        />
      </FormField>
    </FormDrawer>
  );
};

export default EventDrawer;
