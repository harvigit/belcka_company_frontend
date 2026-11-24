"use client";
import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { IconArchive, IconArrowBackUp, IconArrowLeft, IconEdit, IconTrash, IconUserPlus } from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import BlankCard from "@/app/components/shared/BlankCard";
import ConfirmDialog from "../../inventory-new/shared/ConfirmDialog";
import AssignDriverDialog from "../assign-dialog";
import { NoCompany, RegPlate } from "../shared";
import { EventKind, formatDate, fuelLabel, nextDue, DUE_CHIP, statusInfo, typeLabel } from "../types";
import { DriverOption, useVehicles } from "../useVehicles";
import { useDrivers } from "../useDrivers";
import { useVehicleEditor } from "../useVehicleEditor";
import Overview from "./overview";
import { ActivityTab, FuelTab, MaintenanceTab, MileageTab, TyresTab } from "./history";
import DocumentsTab from "./documents";
import DriversTab from "./drivers";
import PermitsTab from "./permits";
import OnboardingTab from "./onboarding";
import InvoicesTab from "./invoices";
import EventDrawer from "./event-drawer";
import TyreCheckDialog from "./tyre-check-dialog";
import PhotoChecksTab from "./photo-checks";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "maintenance", label: "MOT & Service" },
  { value: "tyres", label: "Tyres" },
  { value: "fuel", label: "Fuel" },
  { value: "mileage", label: "Mileage" },
  { value: "permits", label: "Parking permits" },
  { value: "photos", label: "Photo checks" },
  { value: "onboarding", label: "Onboarding" },
  { value: "invoices", label: "Invoices" },
  { value: "documents", label: "Documents" },
  { value: "drivers", label: "Driver history" },
  { value: "activity", label: "Activity" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const VehicleDetail: React.FC<{ vehicleId: number }> = ({ vehicleId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null; name?: string | null };
  const companyId = user?.company_id;

  const store = useVehicles(companyId, user?.name || "You");
  const { vehicles, loading } = store;
  const drivers = useDrivers(companyId);
  const editor = useVehicleEditor({
    vehicles,
    drivers,
    save: store.save,
    findByRegistration: store.findByRegistration,
  });

  const initialTab = searchParams?.get("tab") as TabValue | null;
  const [tab, setTab] = useState<TabValue>(
    TABS.some((t) => t.value === initialTab) ? (initialTab as TabValue) : "overview",
  );
  const [addKind, setAddKind] = useState<EventKind | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const vehicle = vehicles.find((v) => v.id === vehicleId);

  const changeTab = (value: TabValue) => {
    setTab(value);
    router.replace(`/apps/vehicles/${vehicleId}${value === "overview" ? "" : `?tab=${value}`}`, { scroll: false });
  };

  if (store.noCompany) return <NoCompany />;

  if (loading || !companyId) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (!vehicle) {
    return (
      <BlankCard>
        <CardContent>
          <Stack alignItems="center" spacing={2} py={6}>
            <Typography variant="h6">Vehicle not found</Typography>
            <Typography color="textSecondary">It may have been removed, or the link is wrong.</Typography>
            <Button variant="contained" onClick={() => router.push("/apps/vehicles/list")}>
              Back to vehicles
            </Button>
          </Stack>
        </CardContent>
      </BlankCard>
    );
  }

  const isArchived = vehicle.status === "archived";
  const readOnly = isArchived;
  const status = statusInfo(vehicle.status);
  const events = store.events.filter((e) => e.vehicle_id === vehicle.id);
  const logs = store.driverLogs.filter((l) => l.vehicle_id === vehicle.id);
  const docs = store.documents.filter((d) => d.vehicle_id === vehicle.id);
  const permits = store.permits.filter((p) => p.vehicle_id === vehicle.id);
  const pendingPermits = permits.filter((p) => p.status === "pending").length;
  const onboardings = store.onboardings.filter((o) => o.vehicle_id === vehicle.id);
  const currentOnboarding = vehicle.driver_id
    ? onboardings.filter((o) => o.driver_id === vehicle.driver_id).sort((a, b) => b.id - a.id)[0]
    : undefined;
  const openSteps = currentOnboarding ? currentOnboarding.steps.filter((s) => !s.done_at).length : 0;
  const next = nextDue(vehicle);

  const handleAssign = async (_v: unknown, driver: DriverOption | null) => {
    try {
      await store.assignDriver(vehicle.id, driver);
    } catch {
      return;
    }
    toast.success(driver ? `${vehicle.registration} assigned to ${driver.name}.` : `Driver removed from ${vehicle.registration}.`);
    setAssignOpen(false);
  };

  const tabProps = { vehicle, events, onAdd: setAddKind, readOnly };

  return (
    <BlankCard>
      <CardContent sx={{ pt: 1.5 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ md: "center" }}
          spacing={2}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Tooltip title="Back to vehicles">
              <IconButton onClick={() => router.push("/apps/vehicles/list")}>
                <IconArrowLeft />
              </IconButton>
            </Tooltip>
            <RegPlate registration={vehicle.registration} size="medium" />
            <Box>
              <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
                {vehicle.make_model}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mt={0.5}>
                <Chip size="small" color={status.color} label={status.label} />
                <Typography variant="body2" color="textSecondary">
                  {typeLabel(vehicle.type)} · {fuelLabel(vehicle.fuel_type)}
                </Typography>
                {!isArchived && next && next.state !== "ok" && next.state !== "missing" && (
                  <Chip
                    size="small"
                    variant="outlined"
                    color={DUE_CHIP[next.state].color}
                    label={`${next.label} ${next.state === "overdue" ? "overdue" : "due"} · ${formatDate(next.date)}`}
                  />
                )}
              </Stack>
            </Box>
          </Stack>

          {!readOnly && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button variant="outlined" startIcon={<IconEdit size={16} />} onClick={() => editor.openEdit(vehicle)}>
                Edit
              </Button>
              <Button variant="outlined" startIcon={<IconUserPlus size={16} />} onClick={() => setAssignOpen(true)}>
                {vehicle.driver_id ? "Change driver" : "Assign driver"}
              </Button>
              <Tooltip title="Archive (sold or removed)">
                <IconButton color="error" onClick={() => setArchiveOpen(true)}>
                  <IconArchive size={20} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton color="error" onClick={() => setDeleteOpen(true)}>
                  <IconTrash size={20} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Stack>

        {isArchived && (
          <Alert
            severity="info"
            sx={{ mt: 2 }}
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<IconArrowBackUp size={16} />}
                  onClick={async () => {
                    try {
                      await store.restore([vehicle.id]);
                    } catch {
                      return;
                    }
                    toast.success(`${vehicle.registration} restored as Inactive.`);
                  }}
                >
                  Restore
                </Button>
                <Button color="error" size="small" startIcon={<IconTrash size={16} />} onClick={() => setDeleteOpen(true)}>
                  Delete
                </Button>
              </Stack>
            }
          >
            Archived on {formatDate(vehicle.archived_at)}. Its history is read-only until you restore it.
          </Alert>
        )}

        <Tabs
          value={tab}
          onChange={(_, value: TabValue) => changeTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mt: 2, borderBottom: 1, borderColor: "divider" }}
        >
          {TABS.map((t) => (
            <Tab
              key={t.value}
              value={t.value}
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <span>{t.label}</span>
                  {t.value === "permits" && pendingPermits > 0 && (
                    <Chip size="small" color="warning" label={pendingPermits} sx={{ height: 20 }} />
                  )}
                  {t.value === "onboarding" && openSteps > 0 && (
                    <Chip size="small" color="primary" label={openSteps} sx={{ height: 20 }} />
                  )}
                  {t.value === "documents" && docs.length > 0 && (
                    <Typography component="span" variant="body2" color="textSecondary">
                      ({docs.length})
                    </Typography>
                  )}
                </Stack>
              }
            />
          ))}
        </Tabs>

        <Box pt={3}>
          {tab === "overview" && (
            <Overview
              vehicle={vehicle}
              events={events}
              readOnly={readOnly}
              onAssign={() => setAssignOpen(true)}
              onEdit={() => editor.openEdit(vehicle)}
              onUpdate={(patch) => store.updateVehicle(vehicle.id, patch)}
              onUpdateMileage={() => setAddKind("mileage")}
              onAddAccident={() => setAddKind("accident")}
            />
          )}
          {tab === "maintenance" && <MaintenanceTab {...tabProps} />}
          {tab === "tyres" && <TyresTab {...tabProps} />}
          {tab === "fuel" && (
            <FuelTab
              {...tabProps}
              onSetLimit={(litres) => store.updateVehicle(vehicle.id, { weekly_fuel_limit: litres })}
              onSetRange={(min, max) => store.updateVehicle(vehicle.id, { fuel_use_min: min, fuel_use_max: max })}
            />
          )}
          {tab === "mileage" && <MileageTab {...tabProps} />}
          {tab === "permits" && (
            <PermitsTab
              vehicle={vehicle}
              permits={permits}
              readOnly={readOnly}
              onAdd={store.addPermit}
              onDecide={store.decidePermit}
              onRemove={store.removePermit}
            />
          )}
          {tab === "photos" && (
            <PhotoChecksTab
              vehicle={vehicle}
              events={events}
              readOnly={readOnly}
              onAskNow={() => store.askPhotoCheck(vehicle.id)}
            />
          )}
          {tab === "onboarding" && (
            <OnboardingTab
              vehicle={vehicle}
              onboardings={onboardings}
              readOnly={readOnly}
              onAssign={() => setAssignOpen(true)}
              onStart={(templateId) => store.startOnboarding(vehicle.id, templateId)}
              onToggle={store.toggleOnboardingStep}
            />
          )}
          {tab === "invoices" && (
            <InvoicesTab
              vehicle={vehicle}
              events={events}
              readOnly={readOnly}
              onAdd={store.addEvent}
              onAttach={store.attachFile}
              onOpenTab={(value) => changeTab(value as TabValue)}
            />
          )}
          {tab === "documents" && (
            <DocumentsTab
              vehicle={vehicle}
              documents={docs}
              readOnly={readOnly}
              onAdd={store.addDocument}
              onRemove={store.removeDocument}
            />
          )}
          {tab === "drivers" && (
            <DriversTab
              vehicle={vehicle}
              logs={logs}
              events={events}
              readOnly={readOnly}
              onAssign={() => setAssignOpen(true)}
            />
          )}
          {tab === "activity" && (
            <ActivityTab
              events={events}
              driverLogs={logs}
              changes={store.activities.filter((a) => a.vehicle_id === vehicle.id)}
              onOpenLog={() => router.push("/apps/vehicles/activity")}
            />
          )}
        </Box>
      </CardContent>

      {editor.drawer}

      <TyreCheckDialog
        open={addKind === "tyre_check"}
        vehicle={vehicle}
        events={events}
        onClose={() => setAddKind(null)}
        onSave={store.addEvent}
      />

      <EventDrawer
        kind={addKind === "tyre_check" ? null : addKind}
        vehicle={vehicle}
        events={events}
        onClose={() => setAddKind(null)}
        onSave={store.addEvent}
      />

      <AssignDriverDialog
        vehicle={assignOpen ? vehicle : null}
        drivers={drivers}
        busyDriverIds={editor.busyDriverIds}
        onClose={() => setAssignOpen(false)}
        onSave={handleAssign}
      />

      <ConfirmDialog
        open={archiveOpen}
        title="Archive vehicle"
        message={`Archive ${vehicle.registration}? Use this when the vehicle is sold or no longer used. ${
          vehicle.driver_name ? `${vehicle.driver_name} will no longer see it in their app. ` : ""
        }Its history stays, and you can restore it later.`}
        confirmLabel="Archive"
        onClose={() => setArchiveOpen(false)}
        onConfirm={async () => {
          try {
            await store.archive([vehicle.id]);
          } catch {
            return;
          }
          toast.success(`${vehicle.registration} moved to Archived.`);
          setArchiveOpen(false);
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete vehicle"
        message={`Delete ${vehicle.registration}? It disappears from the list and the archive, and its registration can be added again. ${
          vehicle.driver_name ? `${vehicle.driver_name} will no longer see it in their app. ` : ""
        }Use Archive instead when the vehicle is sold and you want to keep it with the past vehicles.`}
        confirmLabel="Delete"
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          try {
            await store.remove([vehicle.id]);
          } catch {
            return;
          }
          toast.success(`${vehicle.registration} deleted.`);
          setDeleteOpen(false);
          router.push("/apps/vehicles/list");
        }}
      />
    </BlankCard>
  );
};

export default VehicleDetail;
