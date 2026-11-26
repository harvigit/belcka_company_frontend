"use client";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { Vehicle } from "./types";
import { DriverOption } from "./useVehicles";
import { DriverName, DriverPicker, RegPlate } from "./shared";

interface AssignDriverDialogProps {
  vehicle: Vehicle | null;
  drivers: DriverOption[];
  busyDriverIds: Map<number, string>;
  onClose: () => void;
  onSave: (vehicle: Vehicle, driver: DriverOption | null) => Promise<void>;
}

const AssignDriverDialog: React.FC<AssignDriverDialogProps> = ({
  vehicle,
  drivers,
  busyDriverIds,
  onClose,
  onSave,
}) => {
  const [driverId, setDriverId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDriverId(vehicle?.driver_id ?? null);
  }, [vehicle]);

  if (!vehicle) return null;

  const driver = drivers.find((d) => d.id === driverId) ?? null;
  const unchanged = driverId === vehicle.driver_id;
  const otherVehicle = driverId ? busyDriverIds.get(driverId) : undefined;
  const drivesOther = otherVehicle && otherVehicle !== vehicle.registration;
  // A private car always belongs to an employee, so its owner can only be changed, not removed.
  const isPrivate = vehicle.type === "private";
  const canRemove = !!vehicle.driver_id && !isPrivate;

  const save = async () => {
    setSaving(true);
    try {
      await onSave(vehicle, driver);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <span>{vehicle.driver_id ? "Change driver" : "Assign driver"}</span>
          <RegPlate registration={vehicle.registration} />
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {vehicle.driver_name && (
            <Box>
              <Typography variant="caption" color="textSecondary">
                Current driver
              </Typography>
              <DriverName name={vehicle.driver_name} image={vehicle.driver_image} />
            </Box>
          )}
          <Box>
            <Typography mb={0.5}>New driver</Typography>
            <DriverPicker
              drivers={drivers}
              value={driverId}
              onChange={(d) => setDriverId(d?.id ?? null)}
              busyDriverIds={busyDriverIds}
            />
          </Box>
          {drivesOther && (
            <Alert severity="warning">
              {driver?.name} already drives {otherVehicle}. They will see both vehicles in their app.
            </Alert>
          )}
          {!unchanged && driverId && (
            <Alert severity="info">
              The vehicle appears in the employee&apos;s Belcka app straight away.
            </Alert>
          )}
          {canRemove && (
            <Typography variant="caption" color="textSecondary">
              &quot;Remove driver&quot; takes the vehicle out of {vehicle.driver_name}&apos;s app.
            </Typography>
          )}
          {isPrivate && vehicle.driver_id && (
            <Typography variant="caption" color="textSecondary">
              A private car always needs the employee who owns it. You can change the owner, but not remove it.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {canRemove && (
          <Button
            color="error"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(vehicle, null);
              } finally {
                setSaving(false);
              }
            }}
            sx={{ mr: "auto" }}
          >
            Remove driver
          </Button>
        )}
        <Button onClick={onClose} variant="outlined" color="primary">
          Cancel
        </Button>
        <Button onClick={save} variant="contained" disabled={unchanged || !driverId || saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignDriverDialog;
