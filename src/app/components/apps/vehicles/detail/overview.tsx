"use client";
import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { IconEdit, IconUserPlus } from "@tabler/icons-react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "../../inventory-new/shared/FormDrawer";
import FormField from "../../inventory-new/shared/FormField";
import { DriverName, DueCell } from "../shared";
import {
  countsAsCost,
  dueItems,
  formatDate,
  formatMiles,
  fuelLabel,
  money,
  typeLabel,
  Vehicle,
  VehicleEvent,
} from "../types";
import { Section, StatTile } from "./common";
import { ActionRow, ACTION_CATEGORY, PRIORITY } from "../actions";

type DetailsForm = Pick<
  Vehicle,
  "vin" | "first_registered" | "v5c_reference" | "registered_keeper" | "engine" | "parking_place"
>;

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2} py={0.75}>
    <Typography variant="body2" color="textSecondary">
      {label}
    </Typography>
    <Typography component="div" variant="body2" fontWeight={600} textAlign="right" sx={{ wordBreak: "break-word" }}>
      {value || "-"}
    </Typography>
  </Stack>
);

interface OverviewProps {
  vehicle: Vehicle;
  events: VehicleEvent[];
  readOnly: boolean;
  onAssign: () => void;
  onEdit: () => void;
  onUpdate: (patch: Partial<Vehicle>) => Promise<void>;
  onOpenTab: (tab: string) => void;
  // this vehicle's rows from the Action Centre
  attention: ActionRow[];
  onOpenAction: (row: ActionRow) => void;
}

const Overview: React.FC<OverviewProps> = ({ vehicle, events, readOnly, onAssign, onEdit, onUpdate, onOpenTab, attention, onOpenAction }) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState<DetailsForm>({});
  const [vinError, setVinError] = useState("");

  const yearStart = dayjs().startOf("year").format("YYYY-MM-DD");
  const costThisYear = events.filter((e) => e.date >= yearStart && countsAsCost(e)).reduce((s, e) => s + (e.cost ?? 0), 0);
  const monthAgo = dayjs().subtract(30, "day").format("YYYY-MM-DD");
  const reading30 = events
    .filter((e) => e.mileage && e.date <= monthAgo)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const miles30 = reading30 ? vehicle.mileage - (reading30.mileage ?? 0) : null;
  const due = dueItems(vehicle);
  // e.g. "2 due dates · 1 defect"
  const attentionSummary = Object.entries(
    attention.reduce<Record<string, number>>((acc, a) => {
      acc[ACTION_CATEGORY[a.category]] = (acc[ACTION_CATEGORY[a.category]] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, n]) => `${n} ${label.toLowerCase()}`)
    .join(" · ");
  // due dates already have their own list below
  const otherAttention = attention.filter((a) => a.category !== "due");

  const tabFor = (label: string) =>
    label === "Tyre check" ? "tyres" : label === "MOT" || label === "Service" ? "maintenance" : null;

  const openDetails = () => {
    setDetails({
      vin: vehicle.vin ?? "",
      first_registered: vehicle.first_registered ?? "",
      v5c_reference: vehicle.v5c_reference ?? "",
      registered_keeper: vehicle.registered_keeper ?? "",
      engine: vehicle.engine ?? "",
      parking_place: vehicle.parking_place ?? "",
    });
    setVinError("");
    setDetailsOpen(true);
  };

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const vin = (details.vin ?? "").trim();
    if (vin && vin.length !== 17) {
      setVinError("A VIN has 17 characters.");
      return;
    }
    await onUpdate({
      vin,
      first_registered: details.first_registered,
      v5c_reference: (details.v5c_reference ?? "").trim(),
      registered_keeper: (details.registered_keeper ?? "").trim(),
      engine: (details.engine ?? "").trim(),
      parking_place: (details.parking_place ?? "").trim(),
    });
    toast.success("Vehicle details saved.");
    setDetailsOpen(false);
  };

  const field = (name: keyof DetailsForm, label: string, opts: { type?: string; hint?: string; max?: number } = {}) => (
    <FormField label={label} hint={opts.hint}>
      <CustomTextField
        type={opts.type}
        value={details[name] ?? ""}
        onChange={(ev: any) => {
          let value = ev.target.value;
          if (name === "vin") {
            value = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17);
            setVinError("");
          }
          setDetails((d) => ({ ...d, [name]: opts.max ? value.slice(0, opts.max) : value }));
        }}
        fullWidth
        error={name === "vin" && !!vinError}
        helperText={name === "vin" ? vinError : undefined}
      />
    </FormField>
  );

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: "100%" }}>
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{ textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}
            >
              Driver
            </Typography>
            <Box mt={0.5}>
              {vehicle.driver_name ? (
                <DriverName name={vehicle.driver_name} image={vehicle.driver_image} />
              ) : (
                <Typography variant="h6" fontWeight={700} color="textSecondary">
                  No driver
                </Typography>
              )}
            </Box>
            {!readOnly && (
              <Button size="small" variant="outlined" startIcon={<IconUserPlus size={16} />} onClick={onAssign} sx={{ mt: 1 }}>
                {vehicle.driver_id ? "Change driver" : "Assign driver"}
              </Button>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Mileage" value={formatMiles(vehicle.mileage)} sub={miles30 !== null ? `${formatMiles(miles30)} in the last 30 days` : undefined} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Costs this year" value={money(costThisYear)} sub="Fuel, service, repairs, tyres" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile
            label="Needs attention"
            value={attention.length}
            sub={attention.length ? attentionSummary : "Everything is up to date"}
          />
        </Grid>
      </Grid>

      {otherAttention.length > 0 && (
        <Section title="Open items" subtitle="Defects, accidents, permits and other things to sort out for this vehicle.">
          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            {otherAttention.map((a, i) => (
              <React.Fragment key={a.id}>
                {i > 0 && <Divider />}
                <Stack direction="row" alignItems="center" spacing={1.5} px={2} py={1.25}>
                  <Chip size="small" color={PRIORITY[a.priority].color} label={PRIORITY[a.priority].label} />
                  <Box flex={1} minWidth={0}>
                    <Typography variant="body2" fontWeight={600}>
                      {a.title}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {a.detail}
                    </Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={() => onOpenAction(a)}>
                    Open
                  </Button>
                </Stack>
              </React.Fragment>
            ))}
          </Paper>
        </Section>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Section
            title="What is due"
            subtitle={vehicle.type === "private" ? "Private car: only MOT and insurance are needed." : undefined}
            actions={
              !readOnly && (
                <Button variant="outlined" startIcon={<IconEdit size={16} />} onClick={onEdit}>
                  Edit dates
                </Button>
              )
            }
          >
            <Paper variant="outlined" sx={{ borderRadius: 2 }}>
              {due.map((d, i) => {
                const tab = tabFor(d.label);
                return (
                  <React.Fragment key={d.label}>
                    {i > 0 && <Divider />}
                    <Stack direction="row" alignItems="center" justifyContent="space-between" px={2} py={1.25}>
                      <DueCell item={d} />
                      {tab && (
                        <Button size="small" onClick={() => onOpenTab(tab)}>
                          History
                        </Button>
                      )}
                    </Stack>
                  </React.Fragment>
                );
              })}
            </Paper>
          </Section>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Section
            title="Vehicle details"
            actions={
              !readOnly && (
                <Button variant="outlined" startIcon={<IconEdit size={16} />} onClick={openDetails}>
                  Edit
                </Button>
              )
            }
          >
            <Paper variant="outlined" sx={{ borderRadius: 2, px: 2, py: 1 }}>
              <Row label="Type" value={typeLabel(vehicle.type)} />
              <Row label="Fuel" value={fuelLabel(vehicle.fuel_type)} />
              <Row label="Parking place" value={vehicle.parking_place} />
              <Row label="GPS tracker" value={vehicle.gps_tracker} />
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="caption" color="textSecondary" fontWeight={600}>
                FROM THE V5C LOGBOOK
              </Typography>
              <Row label="VIN" value={vehicle.vin} />
              <Row label="First registered" value={vehicle.first_registered ? formatDate(vehicle.first_registered) : ""} />
              <Row label="V5C reference" value={vehicle.v5c_reference} />
              <Row label="Registered keeper" value={vehicle.registered_keeper} />
              <Row label="Engine" value={vehicle.engine} />
              {vehicle.notes && (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <Row label="Notes" value={vehicle.notes} />
                </>
              )}
            </Paper>
            {!vehicle.vin && !readOnly && (
              <Chip
                sx={{ mt: 1 }}
                size="small"
                color="warning"
                variant="outlined"
                label="Add the V5C details so the vehicle can be identified"
                onClick={openDetails}
              />
            )}
          </Section>
        </Grid>
      </Grid>

      <FormDrawer
        open={detailsOpen}
        title={`Vehicle details · ${vehicle.registration}`}
        onClose={() => setDetailsOpen(false)}
        onSubmit={saveDetails}
        isSaving={false}
      >
        <Typography variant="body2" color="textSecondary">
          Copy these from the V5C logbook.
        </Typography>
        {field("vin", "VIN", { hint: "17 characters" })}
        <Stack direction="row" spacing={2}>
          <Box flex={1}>{field("first_registered", "First registered", { type: "date" })}</Box>
          <Box flex={1}>{field("v5c_reference", "V5C reference", { max: 20 })}</Box>
        </Stack>
        {field("registered_keeper", "Registered keeper", { max: 80 })}
        {field("engine", "Fuel and engine", { hint: "e.g. Diesel · 1995 cc", max: 40 })}
        <Divider />
        {field("parking_place", "Parking place", { hint: "Where the vehicle is kept overnight", max: 120 })}
      </FormDrawer>
    </Box>
  );
};

export default Overview;
