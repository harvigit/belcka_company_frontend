"use client";
import React, { useEffect, useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { IconCurrentLocation } from "@tabler/icons-react";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormField from "../../inventory-new/shared/FormField";
import { ParkingPlace, Vehicle } from "../types";

const coord = (v: string) => /^-?\d{0,3}(\.\d{0,7})?$/.test(v);

/** Where the vehicle is normally kept (same fields as the prototype parking place form). */
const ParkingDialog: React.FC<{
  open: boolean;
  vehicle: Vehicle;
  onClose: () => void;
  onSave: (parking: ParkingPlace) => Promise<void>;
}> = ({ open, vehicle, onClose, onSave }) => {
  const [form, setForm] = useState({ name: "", address: "", lat: "", lng: "" });
  const [tried, setTried] = useState(false);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    const p = vehicle.parking;
    setForm({
      name: p?.name ?? "",
      address: p?.address ?? "",
      lat: typeof p?.lat === "number" ? String(p.lat) : "",
      lng: typeof p?.lng === "number" ? String(p.lng) : "",
    });
    setTried(false);
    setNote("");
  }, [open, vehicle.parking]);

  if (!open) return null;

  const lat = form.lat === "" ? null : Number(form.lat);
  const lng = form.lng === "" ? null : Number(form.lng);
  const errors = {
    name: tried && !form.name.trim() ? "Enter the place name." : "",
    lat: lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90) ? "Between -90 and 90." : "",
    lng: lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180) ? "Between -180 and 180." : "",
    pair: (lat === null) !== (lng === null) ? "Enter both latitude and longitude, or neither." : "",
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setNote("This browser can't share your position. Enter it by hand.");
      return;
    }
    setLocating(true);
    setNote("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setNote(`Position set (accurate to about ${Math.round(pos.coords.accuracy)} m).`);
      },
      (err) => {
        setLocating(false);
        setNote(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked in your browser. Allow it, or enter the position by hand."
            : "Couldn't get your position. Enter it by hand.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const save = async () => {
    setTried(true);
    if (!form.name.trim() || errors.lat || errors.lng || errors.pair) {
      toast.error("Please check the highlighted fields.");
      return;
    }
    await onSave({
      name: form.name.trim(),
      address: form.address.trim(),
      lat,
      lng,
    });
    toast.success(`Parking place saved for ${vehicle.registration}.`);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Parking place · {vehicle.registration}</DialogTitle>
      <DialogContent>
        <Typography color="textSecondary" mb={2}>
          Set where the vehicle is normally kept. This is shared between the web and the driver app.
        </Typography>
        <Stack spacing={2}>
          <FormField label="Place name *">
            <CustomTextField
              fullWidth
              value={form.name}
              placeholder="e.g. Head Office yard"
              onChange={(e: any) => setForm((f) => ({ ...f, name: e.target.value.slice(0, 60) }))}
              error={!!errors.name}
              helperText={errors.name}
            />
          </FormField>
          <FormField label="Address">
            <CustomTextField
              fullWidth
              value={form.address}
              onChange={(e: any) => setForm((f) => ({ ...f, address: e.target.value.slice(0, 160) }))}
            />
          </FormField>
          <Stack direction="row" spacing={2}>
            <FormField label="Latitude">
              <CustomTextField
                fullWidth
                value={form.lat}
                onChange={(e: any) => coord(e.target.value) && setForm((f) => ({ ...f, lat: e.target.value }))}
                error={!!errors.lat || !!errors.pair}
                helperText={errors.lat}
                slotProps={{ htmlInput: { inputMode: "decimal" } }}
              />
            </FormField>
            <FormField label="Longitude">
              <CustomTextField
                fullWidth
                value={form.lng}
                onChange={(e: any) => coord(e.target.value) && setForm((f) => ({ ...f, lng: e.target.value }))}
                error={!!errors.lng || !!errors.pair}
                helperText={errors.lng}
                slotProps={{ htmlInput: { inputMode: "decimal" } }}
              />
            </FormField>
          </Stack>
          {errors.pair && (
            <Typography variant="caption" color="error">
              {errors.pair}
            </Typography>
          )}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="outlined"
              onClick={locate}
              disabled={locating}
              startIcon={locating ? <CircularProgress size={16} /> : <IconCurrentLocation size={16} />}
            >
              Use current position
            </Button>
            {note && (
              <Typography variant="caption" color="textSecondary">
                {note}
              </Typography>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save}>
          Save parking place
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ParkingDialog;
