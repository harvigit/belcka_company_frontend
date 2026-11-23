"use client";
import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Divider, MenuItem, Paper, Stack, Typography } from "@mui/material";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "../inventory-new/shared/FormDrawer";
import FormField from "../inventory-new/shared/FormField";
import { PhotoThumbs, RegPlate } from "./shared";
import {
  DailyChecklist,
  Defect,
  defectItem,
  DEFECT_STATUS,
  DefectSeverity,
  DefectStatus,
  formatDate,
  SEVERITY,
  Vehicle,
} from "./types";

/* ---------- Review an existing defect or driver request ---------- */
interface ReviewProps {
  defect: Defect | null;
  vehicle: Vehicle | null;
  checklists: DailyChecklist[];
  onClose: () => void;
  onSave: (id: number, patch: Pick<Defect, "status" | "owner" | "resolution"> & { severity?: DefectSeverity }) => Promise<void>;
  onTakeOffRoad: (vehicleId: number) => Promise<void>;
  onOpenVehicle: (vehicleId: number) => void;
  onViewChecklist: (checklistId: number) => void;
}

const Info: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2} py={0.5}>
    <Typography variant="body2" color="textSecondary">
      {label}
    </Typography>
    <Box textAlign="right">{children}</Box>
  </Stack>
);

export const DefectReviewDrawer: React.FC<ReviewProps> = ({
  defect,
  vehicle,
  checklists,
  onClose,
  onSave,
  onTakeOffRoad,
  onOpenVehicle,
  onViewChecklist,
}) => {
  const [status, setStatus] = useState<DefectStatus>("open");
  const [severity, setSeverity] = useState<DefectSeverity>("major");
  const [owner, setOwner] = useState("");
  const [resolution, setResolution] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (defect) {
      setStatus(defect.status);
      setSeverity(defect.severity);
      setOwner(defect.owner);
      setResolution(defect.resolution);
      setShowErrors(false);
    }
  }, [defect]);

  if (!defect) return null;
  const isAccident = defect.type === "accident";
  const closing = status === "resolved" || status === "closed";
  const resolutionError = showErrors && closing && !resolution.trim() ? "Say what was done before closing it." : "";
  const unsafe = !isAccident && severity === "critical";
  const item = isAccident ? undefined : defectItem(defect, checklists);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (closing && !resolution.trim()) {
      toast.error("Please add what was done.");
      return;
    }
    await onSave(defect.id, {
      status,
      owner: owner.trim(),
      resolution: resolution.trim(),
      ...(isAccident ? {} : { severity }),
    });
    toast.success(`${isAccident ? "Accident report" : "Defect"} updated.`);
    onClose();
  };

  return (
    <FormDrawer
      open
      title={isAccident ? "Accident report" : "Defect"}
      onClose={onClose}
      onSubmit={submit}
      isSaving={false}
      submitLabel="Save"
    >
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mb={1}>
          {vehicle && <RegPlate registration={vehicle.registration} />}
          {isAccident ? (
            <Chip size="small" color="error" variant="outlined" label="Accident" />
          ) : (
            <Chip size="small" color={SEVERITY[defect.severity].color} label={SEVERITY[defect.severity].label} />
          )}
          <Chip size="small" color={DEFECT_STATUS[defect.status].color} label={DEFECT_STATUS[defect.status].label} />
        </Stack>
        <Typography fontWeight={600} mb={0.5}>
          {isAccident ? "What happened" : defect.category}
        </Typography>
        <Typography variant="body2" mb={1}>
          {defect.description}
        </Typography>
        <Divider sx={{ my: 1 }} />
        <Info label="Reported">
          <Typography variant="body2">
            {formatDate(defect.reported_at)} · {defect.reported_by}
          </Typography>
        </Info>
        {vehicle && (
          <Info label="Vehicle">
            <Typography variant="body2">{vehicle.make_model}</Typography>
          </Info>
        )}
        {isAccident && defect.incident_date && (
          <Info label="Date of accident">
            <Typography variant="body2" fontWeight={600}>
              {formatDate(defect.incident_date)}
            </Typography>
          </Info>
        )}
        {isAccident ? (
          <Box mt={1}>
            <Typography variant="body2" color="textSecondary" mb={1}>
              Driver&apos;s photos
            </Typography>
            {defect.photos?.length ? (
              <PhotoThumbs photos={defect.photos} />
            ) : (
              <Typography variant="caption" color="textSecondary">
                No photos added (optional for accidents)
              </Typography>
            )}
          </Box>
        ) : (
          <Box mt={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="textSecondary">
                Driver&apos;s photos
              </Typography>
              {defect.checklist_id && (
                <Button size="small" variant="outlined" onClick={() => onViewChecklist(defect.checklist_id as number)}>
                  View checklist
                </Button>
              )}
            </Stack>
            <PhotoThumbs photos={item?.photos ?? []} />
          </Box>
        )}
        {vehicle && (
          <Button size="small" variant="outlined" sx={{ mt: 1.5 }} onClick={() => onOpenVehicle(vehicle.id)}>
            Open vehicle
          </Button>
        )}
      </Paper>

      {unsafe && vehicle && vehicle.status === "active" && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={async () => {
                try {
                  await onTakeOffRoad(vehicle.id);
                } catch {
                  return; // the API's message is already shown
                }
                toast.success(`${vehicle.registration} marked as In service.`);
              }}
            >
              Take off road
            </Button>
          }
        >
          The vehicle may be unsafe but is still marked Active.
        </Alert>
      )}

      {!isAccident && (
        <FormField label="Severity" hint="The driver only marks an item as a defect; the office sets how serious it is.">
          <CustomTextField select size="small" fullWidth value={severity} onChange={(e: any) => setSeverity(e.target.value)}>
            {(Object.keys(SEVERITY) as DefectSeverity[]).map((s) => (
              <MenuItem key={s} value={s}>
                {SEVERITY[s].label}
                {s === "critical" ? " · should not be driven" : ""}
              </MenuItem>
            ))}
          </CustomTextField>
        </FormField>
      )}
      <FormField label="Status">
        <CustomTextField select size="small" fullWidth value={status} onChange={(e: any) => setStatus(e.target.value)}>
          {(Object.keys(DEFECT_STATUS) as DefectStatus[]).map((s) => (
            <MenuItem key={s} value={s}>
              {DEFECT_STATUS[s].label}
            </MenuItem>
          ))}
        </CustomTextField>
      </FormField>
      <FormField label="Responsible" hint="Who is dealing with it, e.g. a person or the garage">
        <CustomTextField fullWidth value={owner} onChange={(e: any) => setOwner(e.target.value.slice(0, 60))} />
      </FormField>
      <FormField
        label={`What was done${closing ? " *" : ""}`}
        hint={isAccident ? "e.g. insurance claim number, repair booked, cost recharged" : undefined}
      >
        <CustomTextField
          fullWidth
          multiline
          minRows={2}
          value={resolution}
          onChange={(e: any) => setResolution(e.target.value.slice(0, 300))}
          error={!!resolutionError}
          helperText={resolutionError}
        />
      </FormField>
      {defect.updated_at !== defect.reported_at && (
        <Typography variant="caption" color="textSecondary">
          Last updated {formatDate(defect.updated_at)} by {defect.updated_by}
        </Typography>
      )}
    </FormDrawer>
  );
};
