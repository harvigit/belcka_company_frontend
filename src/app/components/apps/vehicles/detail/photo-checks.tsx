"use client";
import React, { useState } from "react";
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import { IconCameraUp } from "@tabler/icons-react";
import toast from "react-hot-toast";
import ConfirmDialog from "../../inventory-new/shared/ConfirmDialog";
import { DueCell, PhotoThumbs } from "../shared";
import { dueItems, FLEET_RULES, formatDate, formatMiles, PHOTO_SHOTS, Vehicle, VehicleEvent } from "../types";
import { Section, StatTile } from "./common";

/**
 * Photo checks (like the prototype): every few months, at a random date, the driver takes seven
 * photos of the whole vehicle in the app. It proves the state of the vehicle, e.g. when new damage
 * appeared. The office can ask for one straight away.
 */
const PhotoChecksTab: React.FC<{
  vehicle: Vehicle;
  events: VehicleEvent[];
  readOnly: boolean;
  onAskNow: () => Promise<void>;
}> = ({ vehicle, events, readOnly, onAskNow }) => {
  const [asking, setAsking] = useState(false);
  const isPrivate = vehicle.type === "private";
  const next = dueItems(vehicle).find((d) => d.label === "Photo check") ?? null;
  const checks = events
    .filter((e) => e.kind === "photo_check")
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  if (isPrivate) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderStyle: "dashed", textAlign: "center" }}>
        <Typography color="textSecondary">Private cars don&apos;t need photo checks.</Typography>
      </Paper>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatTile label="Next photo check" value={formatDate(next?.date)} sub={<DueCell item={next} />} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatTile
            label="Last photo check"
            value={checks[0] ? formatDate(checks[0].date) : "-"}
            sub={checks[0] ? `${checks[0].created_by} · ${formatMiles(checks[0].mileage)}` : "None yet"}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatTile
            label="Rule"
            value={`About every ${FLEET_RULES.photoCheckMonths} months`}
            sub="On a random day, so drivers can't tell when it comes"
          />
        </Grid>
      </Grid>

      <Section
        title="Photo checks"
        subtitle={`The driver takes ${PHOTO_SHOTS.length} photos in the app: ${PHOTO_SHOTS.join(", ").toLowerCase()}.`}
        actions={
          !readOnly && (
            <Button
              variant="outlined"
              startIcon={<IconCameraUp size={16} />}
              onClick={() => setAsking(true)}
              disabled={!vehicle.driver_id}
              title={vehicle.driver_id ? undefined : "Assign a driver first"}
            >
              Ask for a check now
            </Button>
          )
        }
      >
        {checks.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderStyle: "dashed", textAlign: "center" }}>
            <Typography color="textSecondary">No photo checks yet.</Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {checks.map((c) => (
              <Paper key={c.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mb={1}>
                  <Typography fontWeight={700}>{formatDate(c.date)}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    · {c.created_by} · {formatMiles(c.mileage)}
                  </Typography>
                  {typeof c.lowest_tread === "number" && (
                    <Chip size="small" variant="outlined" label={`Lowest tread ${c.lowest_tread} mm`} />
                  )}
                  <Chip size="small" variant="outlined" label={`${c.photos?.length ?? 0} / ${PHOTO_SHOTS.length} photos`} />
                </Stack>
                {c.note && (
                  <Typography variant="body2" mb={1}>
                    {c.note}
                  </Typography>
                )}
                <PhotoThumbs photos={c.photos ?? []} size={72} />
              </Paper>
            ))}
          </Stack>
        )}
      </Section>

      <ConfirmDialog
        open={asking}
        title="Ask for a photo check now"
        message={`${vehicle.driver_name ?? "The driver"} will be asked in the app to do a photo check of ${vehicle.registration} today.`}
        confirmLabel="Ask now"
        onClose={() => setAsking(false)}
        onConfirm={async () => {
          await onAskNow();
          toast.success(`Photo check asked for ${vehicle.registration}.`);
          setAsking(false);
        }}
      />
    </Box>
  );
};

export default PhotoChecksTab;
