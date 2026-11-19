"use client";
import React from "react";
import dayjs from "dayjs";
import { Alert, Box, MenuItem, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "../inventory-new/shared/FormDrawer";
import FormField from "../inventory-new/shared/FormField";
import {
  FUEL_TYPES,
  normaliseRegistration,
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
  VehicleForm,
  VehicleFormErrors,
} from "./types";
import { DriverOption } from "./useVehicles";
import { DriverPicker } from "./shared";

interface VehicleDrawerProps {
  open: boolean;
  onClose: () => void;
  formData: VehicleForm;
  setFormData: React.Dispatch<React.SetStateAction<VehicleForm>>;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  drivers: DriverOption[];
  busyDriverIds: Map<number, string>;
  errors: VehicleFormErrors;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>
    {children}
  </Typography>
);

const VehicleDrawer: React.FC<VehicleDrawerProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isSaving,
  drivers,
  busyDriverIds,
  errors,
}) => {
  const set = <K extends keyof VehicleForm>(name: K, value: VehicleForm[K]) =>
    setFormData((prev) => ({ ...prev, [name]: value }));
  const isEdit = !!formData.id;
  const isPrivate = formData.type === "private";
  const typeHint = VEHICLE_TYPES.find((t) => t.value === formData.type)?.hint;
  const statusHint = VEHICLE_STATUSES.find((s) => s.value === formData.status)?.hint;

  // A date in the past is allowed (the vehicle shows as overdue) but flagged so it isn't a typo.
  const dateField = (name: "mot_due" | "insurance_due" | "tax_due", label: string, hint: string) => {
    const expired = !!formData[name] && formData[name] < dayjs().format("YYYY-MM-DD");
    return (
      <Box flex={1}>
        <FormField label={`${label} *`}>
          <CustomTextField
            type="date"
            value={formData[name]}
            onChange={(e: any) => set(name, e.target.value)}
            fullWidth
            error={!!errors[name]}
            helperText={errors[name] ?? (expired ? "This date has passed: it will show as overdue." : hint)}
            sx={expired && !errors[name] ? { "& .MuiFormHelperText-root": { color: "warning.dark" } } : undefined}
          />
        </FormField>
      </Box>
    );
  };

  return (
    <FormDrawer
      open={open}
      title={isEdit ? "Edit Vehicle" : "Add Vehicle"}
      onClose={onClose}
      onSubmit={onSubmit}
      isSaving={isSaving}
      submitLabel={isEdit ? "Save changes" : "Add vehicle"}
      width={560}
    >
      <SectionTitle>Vehicle</SectionTitle>

      <Stack direction="row" spacing={2}>
        <Box flex={1}>
          <FormField label="Registration *">
            <CustomTextField
              autoFocus={!isEdit}
              value={formData.registration}
              onChange={(e: any) =>
                set("registration", normaliseRegistration(e.target.value).slice(0, 10))
              }
              placeholder="AB12 CDE"
              fullWidth
              error={!!errors.registration}
              helperText={errors.registration ?? "As on the number plate"}
              slotProps={{ htmlInput: { style: { textTransform: "uppercase", fontWeight: 600 } } }}
            />
          </FormField>
        </Box>
        <Box flex={1}>
          <FormField label="Make and model *">
            <CustomTextField
              value={formData.make_model}
              onChange={(e: any) => set("make_model", e.target.value.slice(0, 80))}
              placeholder="Ford Transit Custom"
              fullWidth
              error={!!errors.make_model}
              helperText={errors.make_model}
            />
          </FormField>
        </Box>
      </Stack>

      <FormField label="Type" hint={typeHint}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          color="primary"
          value={formData.type}
          onChange={(_, value) => value && set("type", value)}
        >
          {VEHICLE_TYPES.map((t) => (
            <ToggleButton key={t.value} value={t.value} sx={{ textTransform: "none" }}>
              {t.short}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </FormField>

      <Stack direction="row" spacing={2}>
        <Box flex={1}>
          <FormField label="Fuel">
            <CustomTextField
              select
              value={formData.fuel_type}
              onChange={(e: any) => set("fuel_type", e.target.value)}
              fullWidth
              size="small"
            >
              {FUEL_TYPES.map((f) => (
                <MenuItem key={f.value} value={f.value}>
                  {f.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </FormField>
        </Box>
        <Box flex={1}>
          <FormField label="Mileage (miles) *">
            <CustomTextField
              value={formData.mileage}
              onChange={(e: any) => {
                const value = e.target.value.replace(/,/g, "");
                if (!/^\d{0,7}$/.test(value)) return;
                set("mileage", value);
              }}
              placeholder="e.g. 48210"
              fullWidth
              error={!!errors.mileage}
              helperText={errors.mileage ?? (isEdit ? undefined : "Odometer today")}
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
            />
          </FormField>
        </Box>
        <Box flex={1}>
          <FormField label="Status" hint={statusHint}>
            <CustomTextField
              select
              value={formData.status}
              onChange={(e: any) => set("status", e.target.value)}
              fullWidth
              size="small"
            >
              {VEHICLE_STATUSES.filter((s) => s.value !== "archived").map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </FormField>
        </Box>
      </Stack>

      <SectionTitle>{isPrivate ? "Owner" : "Driver"}</SectionTitle>
      <FormField
        label={isPrivate ? "Employee who owns the car *" : "Assigned to"}
        hint={
          errors.driver_id
            ? undefined
            : isPrivate
              ? "They claim business mileage for this car in their Belcka app."
              : "The employee sees this vehicle in their Belcka app. Leave empty if nobody drives it yet."
        }
      >
        <DriverPicker
          drivers={drivers}
          value={formData.driver_id}
          onChange={(driver) => set("driver_id", driver?.id ?? null)}
          busyDriverIds={busyDriverIds}
          error={errors.driver_id}
        />
      </FormField>

      <SectionTitle>Due dates</SectionTitle>
      {isPrivate && (
        <Alert severity="info">
          Private cars only need a valid MOT and insurance. Road tax and service are not tracked.
        </Alert>
      )}
      <Stack direction="row" spacing={2}>
        {dateField("mot_due", "MOT until", "New car: when its first MOT is due")}
        {dateField("insurance_due", "Insurance until", "End date on the certificate")}
      </Stack>
      {!isPrivate && (
        <Stack direction="row" spacing={2}>
          {dateField("tax_due", "Road tax until", "From the DVLA tax reminder")}
          <Box flex={1} />
        </Stack>
      )}
      {!isPrivate && (
        <Typography variant="caption" color="textSecondary">
          The next service is worked out from the last service and the fleet service rule.
        </Typography>
      )}

      <SectionTitle>Other</SectionTitle>
      <FormField label="GPS tracker number" hint="Optional">
        <CustomTextField
          value={formData.gps_tracker}
          onChange={(e: any) => set("gps_tracker", e.target.value.slice(0, 40))}
          fullWidth
        />
      </FormField>
      <FormField label="Notes" hint="Optional">
        <CustomTextField
          value={formData.notes}
          onChange={(e: any) => set("notes", e.target.value.slice(0, 300))}
          multiline
          minRows={2}
          fullWidth
        />
      </FormField>
    </FormDrawer>
  );
};

export default VehicleDrawer;
