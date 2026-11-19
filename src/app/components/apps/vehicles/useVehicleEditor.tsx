"use client";
import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import VehicleDrawer from "./form";
import { emptyVehicle, formatMiles, Vehicle, VehicleForm, VehicleFormErrors } from "./types";
import { DriverOption } from "./useVehicles";

interface Options {
  vehicles: Vehicle[];
  drivers: DriverOption[];
  save: (form: VehicleForm, driver: DriverOption | null) => Promise<void>;
  findByRegistration: (registration: string, exceptId?: number) => Vehicle | undefined;
}

export const toForm = (v: Vehicle): VehicleForm => ({
  id: v.id,
  registration: v.registration,
  make_model: v.make_model,
  type: v.type,
  fuel_type: v.fuel_type,
  mileage: String(v.mileage ?? ""),
  status: v.status === "archived" ? "inactive" : v.status,
  driver_id: v.driver_id,
  mot_due: v.mot_due,
  insurance_due: v.insurance_due,
  tax_due: v.tax_due,
  service_due: v.service_due,
  gps_tracker: v.gps_tracker,
  notes: v.notes,
});

// Add / Edit vehicle drawer with its validation, shared by the list and the vehicle page.
export function useVehicleEditor({ vehicles, drivers, save, findByRegistration }: Options) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<VehicleForm>(emptyVehicle);
  const [showErrors, setShowErrors] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Who already drives what, so the picker can warn before giving one person two vehicles.
  const busyDriverIds = useMemo(() => {
    const map = new Map<number, string>();
    vehicles
      .filter((v) => v.status !== "archived")
      .forEach((v) => v.driver_id && map.set(v.driver_id, v.registration));
    return map;
  }, [vehicles]);

  const savedMileage = formData.id ? vehicles.find((v) => v.id === formData.id)?.mileage ?? 0 : 0;

  // Rules from the prototype plus the fields the rest of the module depends on:
  // the due list needs MOT and insurance (and road tax for company vehicles), the odometer checks
  // need a starting mileage, and a private car always belongs to an employee.
  // Wrong values show while typing; empty required fields only after the first save attempt.
  const validate = (f: VehicleForm, showMissing: boolean): VehicleFormErrors => {
    const e: VehicleFormErrors = {};
    const isPrivate = f.type === "private";
    const registration = f.registration.trim();
    const other = registration ? findByRegistration(registration, f.id) : undefined;
    if (other) {
      e.registration =
        other.status === "archived"
          ? `${other.registration} is in the archive. Restore it instead of adding it again.`
          : `${other.registration} is already in the list.`;
    } else if (registration && registration.replace(/\s/g, "").length < 2) {
      e.registration = "A registration has at least 2 characters.";
    } else if (showMissing && !registration) {
      e.registration = "Enter the registration number.";
    }

    const model = f.make_model.trim();
    if (model && model.length < 2) e.make_model = "Enter the full make and model.";
    else if (showMissing && !model) e.make_model = "Enter the make and model.";

    if (f.id && f.mileage !== "" && Number(f.mileage) < savedMileage) {
      e.mileage = `Can't be lower than ${formatMiles(savedMileage)}.`;
    } else if (showMissing && f.mileage === "") {
      e.mileage = f.id ? "Enter the mileage." : "Enter the odometer reading today.";
    }

    if (showMissing && isPrivate && !f.driver_id) e.driver_id = "Choose the employee who owns this car.";

    if (showMissing && !f.mot_due) e.mot_due = "Enter the MOT date.";
    if (showMissing && !f.insurance_due) e.insurance_due = "Enter the insurance date.";
    if (showMissing && !isPrivate && !f.tax_due) e.tax_due = "Enter the road tax date.";
    return e;
  };

  const errors = validate(formData, showErrors);

  const openWith = (data: VehicleForm) => {
    setFormData(data);
    setShowErrors(false);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    const registration = formData.registration.trim();
    const problems = Object.keys(validate(formData, true)).length;
    if (problems > 0) {
      toast.error(
        problems === 1 ? "Please fix the highlighted field." : `Please fix the ${problems} highlighted fields.`,
      );
      return;
    }
    setIsSaving(true);
    try {
      const driver = drivers.find((d) => d.id === formData.driver_id) ?? null;
      await save({ ...formData, registration }, driver);
      toast.success(formData.id ? `${registration} updated.` : `${registration} added.`);
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const drawer = (
    <VehicleDrawer
      open={open}
      onClose={() => setOpen(false)}
      formData={formData}
      setFormData={setFormData}
      onSubmit={handleSubmit}
      isSaving={isSaving}
      drivers={drivers}
      busyDriverIds={busyDriverIds}
      errors={errors}
    />
  );

  return {
    drawer,
    busyDriverIds,
    openCreate: () => openWith(emptyVehicle),
    openEdit: (v: Vehicle) => openWith(toForm(v)),
  };
}
