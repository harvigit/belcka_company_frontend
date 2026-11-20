"use client";
import React, { useState } from "react";
import { Box, Button, Chip, Divider, Grid, Link, Paper, Stack, Typography } from "@mui/material";
import {
  IconCarCrash,
  IconEdit,
  IconGauge,
  IconMapPin,
  IconUserPlus,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "../../inventory-new/shared/FormDrawer";
import FormField from "../../inventory-new/shared/FormField";
import { DriverName } from "../shared";
import {
  countsAsCost,
  DUE_CHIP,
  dueItems,
  formatDate,
  formatMiles,
  fuelLabel,
  fuelUse,
  money,
  parkingText,
  typeLabel,
  Vehicle,
  VehicleEvent,
} from "../types";
import { RecordTable, Section, StatTile, toneAt } from "./common";
import ParkingDialog from "./parking-dialog";

type DetailsForm = Pick<Vehicle, "vin" | "first_registered" | "v5c_reference" | "registered_keeper" | "engine">;

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
  onUpdateMileage: () => void;
  onAddAccident: () => void;
}

/**
 * Vehicle overview, laid out like the prototype: the key numbers, the parking place,
 * what is due, and the main actions underneath.
 */
const Overview: React.FC<OverviewProps> = ({
  vehicle,
  events,
  readOnly,
  onAssign,
  onEdit,
  onUpdate,
  onUpdateMileage,
  onAddAccident,
}) => {
  const [parkingOpen, setParkingOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState<DetailsForm>({});
  const [vinError, setVinError] = useState("");

  // Miles since N days ago: from the last reading before that day (or the first one) to now.
  const readings = events
    .filter((e) => e.mileage)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.mileage ?? 0) - (b.mileage ?? 0));
  const milesSince = (days: number) => {
    const from = dayjs().subtract(days, "day").format("YYYY-MM-DD");
    const base = [...readings].reverse().find((e) => e.date < from) ?? readings[0];
    return base ? Math.max(0, vehicle.mileage - (base.mileage ?? 0)) : 0;
  };
  const yearStart = dayjs().startOf("year").format("YYYY-MM-DD");
  const costThisYear = events.filter((e) => e.date >= yearStart && countsAsCost(e)).reduce((s, e) => s + (e.cost ?? 0), 0);
  const mpg = fuelUse(events).mpg;
  const due = dueItems(vehicle);
  const parking = vehicle.parking;
  const hasPosition = typeof parking?.lat === "number" && typeof parking?.lng === "number";

  const openDetails = () => {
    setDetails({
      vin: vehicle.vin ?? "",
      first_registered: vehicle.first_registered ?? "",
      v5c_reference: vehicle.v5c_reference ?? "",
      registered_keeper: vehicle.registered_keeper ?? "",
      engine: vehicle.engine ?? "",
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

  const tiles: { label: string; value: React.ReactNode; sub?: React.ReactNode }[] = [
    {
      label: "Assigned to",
      value: vehicle.driver_name ? <DriverName name={vehicle.driver_name} image={vehicle.driver_image} /> : "No driver",
    },
    { label: "Type", value: typeLabel(vehicle.type) },
    { label: "Mileage", value: formatMiles(vehicle.mileage) },
    {
      label: "Parking place",
      value: parking?.name || "Not set",
      sub: parking ? (
        <>
          {parking.address}
          {hasPosition && (
            <Link
              href={`https://www.google.com/maps/search/?api=1&query=${parking.lat},${parking.lng}`}
              target="_blank"
              rel="noopener"
              display="block"
            >
              Google Maps
            </Link>
          )}
        </>
      ) : undefined,
    },
    { label: "Last 30 days", value: formatMiles(milesSince(30)) },
    { label: "Last 12 months", value: formatMiles(milesSince(365)) },
    { label: "Fuel use", value: mpg ? `${mpg.toFixed(1)} mpg` : "-" },
    { label: "Fuel", value: fuelLabel(vehicle.fuel_type) },
    { label: "Costs this year", value: money(costThisYear) },
  ];

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {/* Key numbers */}
      <Grid container spacing={2}>
        {tiles.map((t, i) => (
          // 5 per row on wide screens: 9 tiles fit in 2 rows
          <Grid key={t.label} size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile label={t.label} value={t.value} sub={t.sub} tone={toneAt(i)} />
          </Grid>
        ))}
      </Grid>

      {!readOnly && (
        <Box>
          <Button variant="contained" startIcon={<IconMapPin size={18} />} onClick={() => setParkingOpen(true)}>
            {parking?.name ? "Update parking place" : "Add parking place"}
          </Button>
        </Box>
      )}

      {/* What is due */}
      <Section title="What is due">
        <RecordTable
          rows={due.map((d) => ({ ...d, id: d.label }))}
          empty="Nothing to track for this vehicle."
          columns={[
            { header: "Item", render: (d) => d.label },
            { header: "Date", render: (d) => formatDate(d.date) },
            {
              header: "State",
              render: (d) => <Chip size="small" color={DUE_CHIP[d.state].color} label={DUE_CHIP[d.state].label} />,
            },
          ]}
        />
      </Section>

      {/* Main actions, like the prototype */}
      {!readOnly && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" startIcon={<IconEdit size={16} />} onClick={onEdit}>
            Edit vehicle
          </Button>
          <Button variant="outlined" startIcon={<IconUserPlus size={16} />} onClick={onAssign}>
            {vehicle.driver_id ? "Change driver" : "Assign driver"}
          </Button>
          <Button variant="outlined" startIcon={<IconGauge size={16} />} onClick={onUpdateMileage}>
            Update mileage
          </Button>
          <Button variant="outlined" startIcon={<IconCarCrash size={16} />} onClick={onAddAccident}>
            Accident
          </Button>
        </Stack>
      )}

      {/* V5C logbook details */}
      <Section
        title="Vehicle details"
        subtitle="From the V5C logbook"
        actions={
          !readOnly && (
            <Button variant="outlined" startIcon={<IconEdit size={16} />} onClick={openDetails}>
              Edit
            </Button>
          )
        }
      >
        <Paper variant="outlined" sx={{ borderRadius: 2, px: 2, py: 1, maxWidth: 640 }}>
          <Row label="VIN" value={vehicle.vin} />
          <Row label="First registered" value={vehicle.first_registered ? formatDate(vehicle.first_registered) : ""} />
          <Row label="V5C reference" value={vehicle.v5c_reference} />
          <Row label="Registered keeper" value={vehicle.registered_keeper} />
          <Row label="Engine" value={vehicle.engine} />
          <Row label="GPS tracker" value={vehicle.gps_tracker} />
          {vehicle.notes && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Row label="Notes" value={vehicle.notes} />
            </>
          )}
        </Paper>
      </Section>

      <ParkingDialog
        open={parkingOpen}
        vehicle={vehicle}
        onClose={() => setParkingOpen(false)}
        onSave={(p) => onUpdate({ parking: p })}
      />

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
      </FormDrawer>
    </Box>
  );
};

export default Overview;
