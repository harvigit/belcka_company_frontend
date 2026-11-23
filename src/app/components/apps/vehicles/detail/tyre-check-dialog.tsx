"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { IconCamera, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import {
  FLEET_RULES,
  formatMiles,
  TYRE_STATE,
  TYRE_WHEELS,
  TyreState,
  TyreWheel,
  Vehicle,
  VehicleEvent,
} from "../types";
import { NewEvent } from "../useVehicles";

/* ---------- Car seen from above, with a box for each wheel around it ---------- */
export const CarTop: React.FC = () => (
  <Box
    component="svg"
    viewBox="0 0 100 200"
    sx={{ width: 84, color: "text.primary", display: "block" }}
    aria-hidden
  >
    <rect x="8" y="34" width="12" height="34" rx="4" fill="currentColor" />
    <rect x="80" y="34" width="12" height="34" rx="4" fill="currentColor" />
    <rect x="8" y="132" width="12" height="34" rx="4" fill="currentColor" />
    <rect x="80" y="132" width="12" height="34" rx="4" fill="currentColor" />
    <rect x="18" y="6" width="64" height="188" rx="28" fill="#e3ece7" stroke="currentColor" strokeWidth="4" />
    <rect x="28" y="52" width="44" height="38" rx="9" fill="#fff" stroke="currentColor" strokeWidth="3" />
    <rect x="30" y="134" width="40" height="28" rx="9" fill="#fff" stroke="currentColor" strokeWidth="3" />
  </Box>
);

/** Four wheel boxes (FL, FR left/right on top, RL, RR below) with the car in the middle. */
export const WheelLayout: React.FC<{ render: (wheel: TyreWheel, label: string) => React.ReactNode }> = ({ render }) => {
  const cell = (w: TyreWheel) => {
    const label = TYRE_WHEELS.find(([k]) => k === w)?.[1] ?? w;
    return (
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={1}>
          {label}
        </Typography>
        {render(w, label)}
      </Paper>
    );
  };
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        alignItems: "center",
        gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr auto 1fr" },
        gridTemplateAreas: { xs: '"fl fr" "rl rr"', sm: '"fl car fr" "rl car rr"' },
      }}
    >
      <Box sx={{ gridArea: "fl" }}>{cell("FL")}</Box>
      <Box sx={{ gridArea: "car", display: { xs: "none", sm: "flex" }, justifyContent: "center", px: 1 }}>
        <CarTop />
      </Box>
      <Box sx={{ gridArea: "fr" }}>{cell("FR")}</Box>
      <Box sx={{ gridArea: "rl" }}>{cell("RL")}</Box>
      <Box sx={{ gridArea: "rr" }}>{cell("RR")}</Box>
    </Box>
  );
};

/** Camera / file button for one optional photo; shows the picked file with a remove button. */
const PhotoPick: React.FC<{ value: File | null; onChange: (file: File | null) => void; label?: string }> = ({
  value,
  onChange,
  label = "Add photo",
}) => {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && !file.type.startsWith("image/")) {
            toast.error("Please choose a photo.");
          } else if (file) {
            onChange(file);
          }
          e.target.value = "";
        }}
      />
      {value ? (
        <Chip
          icon={<IconCamera size={16} />}
          label={value.name}
          onDelete={() => onChange(null)}
          deleteIcon={<IconX size={14} />}
          variant="outlined"
          sx={{ maxWidth: "100%" }}
        />
      ) : (
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<IconCamera size={16} />}
          onClick={() => input.current?.click()}
          sx={{ color: "text.secondary", borderColor: "divider" }}
        >
          {label}
        </Button>
      )}
    </>
  );
};

type WheelForm = { tread: string; state: TyreState; photo: File | null };
const emptyWheels = (): Record<TyreWheel, WheelForm> => ({
  FL: { tread: "", state: "ok", photo: null },
  FR: { tread: "", state: "ok", photo: null },
  RL: { tread: "", state: "ok", photo: null },
  RR: { tread: "", state: "ok", photo: null },
});

const treadOk = (v: string) => v !== "" && Number(v) >= 0 && Number(v) <= 12;

/* ---------- Tyre check (same fields as the prototype) ---------- */
const TyreCheckDialog: React.FC<{
  open: boolean;
  vehicle: Vehicle;
  events: VehicleEvent[];
  onClose: () => void;
  onSave: (event: NewEvent) => Promise<void>;
}> = ({ open, vehicle, events, onClose, onSave }) => {
  const [wheels, setWheels] = useState(emptyWheels);
  const [mileage, setMileage] = useState("");
  const [extraPhoto, setExtraPhoto] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWheels(emptyWheels());
    setMileage(String(vehicle.mileage || ""));
    setExtraPhoto(null);
    setNote("");
    setTried(false);
  }, [open, vehicle.mileage]);

  if (!open) return null;

  const limit = FLEET_RULES.treadLimitMm;
  // The odometer can't go below the highest reading so far.
  const lastReading = Math.max(vehicle.mileage, ...events.filter((e) => e.mileage).map((e) => e.mileage as number));
  const odo = mileage === "" ? null : Number(mileage);
  const odoError =
    odo === null ? (tried ? "Enter the odometer reading." : "") : odo < lastReading ? `Can't be lower than ${formatMiles(lastReading)}.` : "";
  const atLimit = (w: TyreWheel) => treadOk(wheels[w].tread) && Number(wheels[w].tread) <= limit;
  const stateOf = (w: TyreWheel): TyreState => (atLimit(w) ? "replace" : wheels[w].state);
  const missing = TYRE_WHEELS.filter(([w]) => !treadOk(wheels[w].tread));
  const toReplace = TYRE_WHEELS.filter(([w]) => treadOk(wheels[w].tread) && stateOf(w) === "replace").map(([, l]) => l);

  const setWheel = (w: TyreWheel, patch: Partial<WheelForm>) => setWheels((prev) => ({ ...prev, [w]: { ...prev[w], ...patch } }));

  const save = async () => {
    setTried(true);
    if (missing.length) {
      toast.error("Enter the tread for all four tyres.");
      return;
    }
    if (odo === null || odoError) {
      toast.error("Enter the odometer reading.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        vehicle_id: vehicle.id,
        kind: "tyre_check",
        date: dayjs().format("YYYY-MM-DD"),
        mileage: odo,
        cost: null,
        supplier: "",
        invoice_no: "",
        note: note.trim(),
        tread: Object.fromEntries(TYRE_WHEELS.map(([w]) => [w, Number(wheels[w].tread)])),
        wheels: Object.fromEntries(TYRE_WHEELS.map(([w]) => [w, { state: stateOf(w) }])),
        // uploaded after the check is saved, labelled with the wheel
        photo_files: [
          ...TYRE_WHEELS.flatMap(([w]) => (wheels[w].photo ? [{ file: wheels[w].photo as File, label: w }] : [])),
          ...(extraPhoto ? [{ file: extraPhoto, label: "extra" }] : []),
        ],
      });
      toast.success(
        toReplace.length ? `Saved. To replace: ${toReplace.join(", ")}.` : `Tyre check saved for ${vehicle.registration}.`,
      );
      onClose();
    } catch {
      // the API's message is already shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Tyre check · {vehicle.registration}</DialogTitle>
      <DialogContent>
        <Typography color="textSecondary" mb={2}>
          Enter the tread for each tyre. A photo is optional: take one where something looks wrong.
        </Typography>

        <WheelLayout
          render={(w, label) => {
            const error = tried && !treadOk(wheels[w].tread);
            return (
              <Stack spacing={1.25}>
                <CustomTextField
                  size="small"
                  fullWidth
                  placeholder="Tread, mm"
                  value={wheels[w].tread}
                  onChange={(e: any) => {
                    const v = e.target.value;
                    if (/^\d{0,2}(\.\d?)?$/.test(v) && (v === "" || Number(v) <= 12)) setWheel(w, { tread: v });
                  }}
                  error={error}
                  helperText={error ? "Enter 0–12 mm" : atLimit(w) ? `At or below ${limit} mm: replace` : undefined}
                  FormHelperTextProps={{ sx: { color: atLimit(w) && !error ? "error.main" : undefined, mx: 0 } }}
                  slotProps={{ htmlInput: { inputMode: "decimal", "aria-label": `${label} tread, mm` } }}
                />
                <CustomTextField
                  select
                  size="small"
                  fullWidth
                  value={stateOf(w)}
                  disabled={atLimit(w)}
                  onChange={(e: any) => setWheel(w, { state: e.target.value })}
                  slotProps={{ htmlInput: { "aria-label": `${label} state` } }}
                >
                  {(Object.keys(TYRE_STATE) as TyreState[]).map((s) => (
                    <MenuItem key={s} value={s}>
                      {TYRE_STATE[s].label}
                    </MenuItem>
                  ))}
                </CustomTextField>
                <PhotoPick value={wheels[w].photo} onChange={(photo) => setWheel(w, { photo })} />
              </Stack>
            );
          }}
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={3}>
          <Box flex={1}>
            <Typography variant="subtitle2" fontWeight={600} mb={0.75}>
              Odometer (miles) *
            </Typography>
            <CustomTextField
              fullWidth
              value={mileage}
              onChange={(e: any) => {
                const v = e.target.value.replace(/,/g, "");
                if (/^\d{0,7}$/.test(v)) setMileage(v);
              }}
              error={!!odoError}
              helperText={odoError || `Last: ${formatMiles(lastReading)}`}
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
            />
          </Box>
          <Box flex={1}>
            <Typography variant="subtitle2" fontWeight={600} mb={0.75}>
              Photo from any side · optional
            </Typography>
            <Box sx={{ minHeight: 44, display: "flex", alignItems: "center" }}>
              <PhotoPick value={extraPhoto} onChange={setExtraPhoto} label="Add photo" />
            </Box>
          </Box>
        </Stack>

        <Box mt={2}>
          <Typography variant="subtitle2" fontWeight={600} mb={0.75}>
            Note
          </Typography>
          <CustomTextField fullWidth value={note} onChange={(e: any) => setNote(e.target.value.slice(0, 160))} />
        </Box>

        {toReplace.length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            To replace: {toReplace.join(", ")}.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          Save tyre check
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TyreCheckDialog;
