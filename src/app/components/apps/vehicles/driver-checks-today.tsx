"use client";
import React, { useState } from "react";
import { Box, Button, Chip, Typography } from "@mui/material";
import dayjs from "dayjs";
import ChecklistDialog from "./checklist-dialog";
import { DriverName, RegPlate } from "./shared";
import { RecordTable, Section } from "./detail/common";
import { checklistSafe, DailyCheckItem, DailyChecklist, needsDailyCheck, Vehicle } from "./types";

interface Row {
  id: number;
  vehicle: Vehicle;
  checklist: DailyChecklist | null;
}

const DriverChecksToday: React.FC<{
  vehicles: Vehicle[];
  checklists: DailyChecklist[];
  dailyChecks: DailyCheckItem[];
  onOpenVehicle: (v: Vehicle) => void;
  onOpenActionCentre: () => void;
}> = ({ vehicles, checklists, dailyChecks, onOpenVehicle, onOpenActionCentre }) => {
  const [openId, setOpenId] = useState<number | null>(null);
  const today = dayjs().format("YYYY-MM-DD");
  const todays = new Map(checklists.filter((c) => c.date === today).map((c) => [c.vehicle_id, c]));

  // Skip private cars, vehicles without a driver, and drivers with no check items.
  const rows: Row[] = vehicles
    .filter((v) => needsDailyCheck(v, dailyChecks))
    .map((v) => ({ id: v.id, vehicle: v, checklist: todays.get(v.id) ?? null }))
    // not done first, then defects, then safe
    .sort(
      (a, b) =>
        (a.checklist ? (checklistSafe(a.checklist) ? 2 : 1) : 0) - (b.checklist ? (checklistSafe(b.checklist) ? 2 : 1) : 0) ||
        a.vehicle.registration.localeCompare(b.vehicle.registration),
    );
  const done = rows.filter((r) => r.checklist).length;
  const open = checklists.find((c) => c.id === openId) ?? null;

  return (
    <Box px={2} pt={3} pb={2}>
      <Section
        title={`Driver checks today · ${done} / ${rows.length}`}
        subtitle="Company vehicles with a driver need a daily checklist from the app before use. Private cars don't."
        actions={
          <Button variant="outlined" onClick={onOpenActionCentre}>
            Open Action Centre
          </Button>
        }
      >
        <RecordTable
          rows={rows}
          empty="No company vehicles with a driver today."
          columns={[
            {
              header: "Vehicle",
              render: (r) => (
                <Box sx={{ cursor: "pointer" }} onClick={() => onOpenVehicle(r.vehicle)}>
                  <RegPlate registration={r.vehicle.registration} />
                  <Typography variant="caption" color="textSecondary" display="block" mt={0.25}>
                    {r.vehicle.make_model}
                  </Typography>
                </Box>
              ),
            },
            { header: "Driver", render: (r) => <DriverName name={r.checklist?.driver_name ?? r.vehicle.driver_name ?? "-"} /> },
            {
              header: "Submitted",
              render: (r) =>
                r.checklist ? (
                  <Typography variant="body2">
                    {r.checklist.submitted_at ? dayjs(r.checklist.submitted_at).format("HH:mm") : "Today"}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Not yet
                  </Typography>
                ),
            },
            {
              header: "Result",
              render: (r) =>
                !r.checklist ? (
                  <Chip size="small" variant="outlined" color="warning" label="Not done" />
                ) : checklistSafe(r.checklist) ? (
                  <Chip size="small" color="success" label="Safe to drive" />
                ) : (
                  <Chip size="small" color="error" label="Defects found" />
                ),
            },
            {
              header: "Defects",
              render: (r) => {
                const count = r.checklist?.items.filter((i) => !i.ok).length ?? 0;
                return r.checklist ? (
                  <Typography variant="body2" fontWeight={count ? 700 : 400} color={count ? "error" : undefined}>
                    {count}
                  </Typography>
                ) : (
                  "-"
                );
              },
            },
            {
              header: " ",
              align: "right",
              render: (r) =>
                r.checklist ? (
                  <Button size="small" variant="outlined" onClick={() => setOpenId(r.checklist!.id)}>
                    View checklist
                  </Button>
                ) : null,
            },
          ]}
        />
      </Section>

      <ChecklistDialog
        checklist={open}
        vehicle={open ? vehicles.find((v) => v.id === open.vehicle_id) ?? null : null}
        onClose={() => setOpenId(null)}
      />
    </Box>
  );
};

export default DriverChecksToday;
