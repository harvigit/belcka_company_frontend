"use client";
import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  IconAlertTriangle,
  IconArchive,
  IconArrowBackUp,
  IconCar,
  IconClockExclamation,
  IconEdit,
  IconPlus,
  IconSearch,
  IconUserOff,
  IconUserPlus,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import ColumnVisibilityButton from "../inventory-new/shared/ColumnVisibilityButton";
import FilterButton from "../inventory-new/shared/FilterButton";
import InventoryTable from "../inventory-new/shared/InventoryTable";
import ConfirmDialog from "../inventory-new/shared/ConfirmDialog";
import { useRouter } from "next/navigation";
import AssignDriverDialog from "./assign-dialog";
import { DriverName, DueCell, RegPlate, NoCompany } from "./shared";
import {
  formatDate,
  formatMiles,
  fuelLabel,
  nextDue,
  statusInfo,
  typeLabel,
  Vehicle,
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
} from "./types";
import { DriverOption, useVehicles } from "./useVehicles";
import { useDrivers } from "./useDrivers";
import { useVehicleEditor } from "./useVehicleEditor";
import FleetNav from "./fleet-nav";

type QuickFilter = "all" | "overdue" | "soon" | "unassigned";
type View = "current" | "archived";

const noFilters = { type: "", status: "" };

const VehicleList: React.FC = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null; id?: number };
  const companyId = user?.company_id;
  const { columnVisibility, onColumnVisibilityChange } = usePersistentColumnVisibility({
    storageKey: `cv_${user?.company_id}_${user?.id}_vehicles`,
    enabled: !!user?.id,
  });

  const store = useVehicles(companyId);
  const { vehicles, loading, save, assignDriver, archive, restore, findByRegistration } = store;
  const drivers = useDrivers(companyId);
  const router = useRouter();
  const editor = useVehicleEditor({ vehicles, drivers, save, findByRegistration });
  const { busyDriverIds, openCreate, openEdit } = editor;
  const openVehicle = (v: Vehicle) => router.push(`/apps/vehicles/${v.id}`);

  const [view, setView] = useState<View>("current");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(noFilters);
  const [quick, setQuick] = useState<QuickFilter>("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [assignFor, setAssignFor] = useState<Vehicle | null>(null);
  const [toArchive, setToArchive] = useState<Vehicle | null>(null);

  const isArchiveView = view === "archived";
  const current = useMemo(() => vehicles.filter((v) => v.status !== "archived"), [vehicles]);
  const archivedCount = vehicles.length - current.length;

  const counts = useMemo(() => {
    const due = current.map((v) => nextDue(v)?.state);
    return {
      all: current.length,
      overdue: due.filter((s) => s === "overdue").length,
      soon: due.filter((s) => s === "soon").length,
      unassigned: current.filter((v) => !v.driver_id).length,
    };
  }, [current]);

  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (isArchiveView !== (v.status === "archived")) return false;
      if (filters.type && v.type !== filters.type) return false;
      if (!isArchiveView) {
        if (filters.status && v.status !== filters.status) return false;
        const state = nextDue(v)?.state;
        if (quick === "overdue" && state !== "overdue") return false;
        if (quick === "soon" && state !== "soon") return false;
        if (quick === "unassigned" && v.driver_id) return false;
      }
      if (!term) return true;
      return [v.registration, v.make_model, v.driver_name ?? "", v.gps_tracker]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [vehicles, searchTerm, filters, quick, isArchiveView]);

  const hasNarrowing =
    !!searchTerm.trim() || !!filters.type || !!filters.status || (quick !== "all" && !isArchiveView);
  const clearAll = () => {
    setSearchTerm("");
    setFilters(noFilters);
    setQuick("all");
  };

  const handleAssign = async (vehicle: Vehicle, driver: DriverOption | null) => {
    await assignDriver(vehicle.id, driver);
    toast.success(
      driver
        ? `${vehicle.registration} assigned to ${driver.name}.`
        : `Driver removed from ${vehicle.registration}.`,
    );
    setAssignFor(null);
  };

  const handleArchive = async () => {
    if (!toArchive) return;
    await archive([toArchive.id]);
    toast.success(`${toArchive.registration} moved to Archived.`);
    setToArchive(null);
  };

  const handleRestore = async (v: Vehicle) => {
    await restore([v.id]);
    toast.success(`${v.registration} is back in the list as Inactive. Assign a driver to use it again.`);
  };

  const columnHelper = createColumnHelper<Vehicle>();
  const columns = [
    columnHelper.accessor("registration", {
      header: "Vehicle",
      cell: ({ row }) => {
        const v = row.original;
        const content = (
          <Stack spacing={0.5} alignItems="flex-start">
            <RegPlate registration={v.registration} />
            <Typography className="f-14" color="textSecondary" noWrap>
              {v.make_model}
            </Typography>
          </Stack>
        );
        return (
          <Tooltip title="Open vehicle" placement="right">
            <ButtonBase
              onClick={() => openVehicle(v)}
              sx={{ pl: 1, borderRadius: 1, textAlign: "left", justifyContent: "flex-start" }}
            >
              {content}
            </ButtonBase>
          </Tooltip>
        );
      },
    }),
    columnHelper.accessor("type", {
      header: "Type",
      cell: ({ row }) => (
        <Box sx={{ pl: 1 }}>
          <Typography className="f-14" noWrap>
            {typeLabel(row.original.type)}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {fuelLabel(row.original.fuel_type)}
          </Typography>
        </Box>
      ),
    }),
    columnHelper.accessor((v) => v.driver_name ?? "", {
      id: "driver",
      header: "Driver",
      cell: ({ row }) => {
        const v = row.original;
        if (v.driver_name) return <DriverName name={v.driver_name} image={v.driver_image} />;
        if (v.status === "archived") return <Typography className="f-14">-</Typography>;
        return (
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconUserPlus size={16} />}
            onClick={() => setAssignFor(v)}
          >
            Assign
          </Button>
        );
      },
    }),
    columnHelper.accessor("mileage", {
      header: "Mileage",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1, fontVariantNumeric: "tabular-nums" }}>
          {formatMiles(row.original.mileage)}
        </Typography>
      ),
    }),
    columnHelper.accessor((v) => (v.status === "archived" ? v.archived_at ?? "" : nextDue(v)?.date ?? ""), {
      id: "next_due",
      header: isArchiveView ? "Archived on" : "Next due",
      cell: ({ row }) =>
        row.original.status === "archived" ? (
          <Typography className="f-14" sx={{ pl: 1 }}>
            {formatDate(row.original.archived_at)}
          </Typography>
        ) : (
          <DueCell item={nextDue(row.original)} />
        ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ row }) => {
        const s = statusInfo(row.original.status);
        return (
          <Tooltip title={s.hint}>
            <Chip size="small" color={s.color} label={s.label} />
          </Tooltip>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const v = row.original;
        if (v.status === "archived") {
          return (
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconArrowBackUp size={16} />}
              onClick={() => handleRestore(v)}
            >
              Restore
            </Button>
          );
        }
        return (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Edit">
              <IconButton color="primary" onClick={() => openEdit(v)}>
                <IconEdit size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title={v.driver_id ? "Change driver" : "Assign driver"}>
              <IconButton color="primary" onClick={() => setAssignFor(v)}>
                <IconUserPlus size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Archive (sold or removed)">
              <IconButton color="error" onClick={() => setToArchive(v)}>
                <IconArchive size={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, pagination, columnVisibility },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
  });

  const quickCards: {
    key: QuickFilter;
    label: string;
    count: number;
    icon: React.ReactNode;
    color: "primary" | "error" | "warning" | "secondary";
  }[] = [
    { key: "all", label: "All vehicles", count: counts.all, icon: <IconCar size={22} />, color: "primary" },
    { key: "overdue", label: "Overdue", count: counts.overdue, icon: <IconAlertTriangle size={22} />, color: "error" },
    { key: "soon", label: "Due in 30 days", count: counts.soon, icon: <IconClockExclamation size={22} />, color: "warning" },
    { key: "unassigned", label: "No driver", count: counts.unassigned, icon: <IconUserOff size={22} />, color: "secondary" },
  ];

  if (store.noCompany) return <NoCompany />;

  return (
    <Box sx={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <FleetNav data={store} />

      {!isArchiveView && (
        <Grid container spacing={2} sx={{ px: 2, pt: 2, pb: 1 }}>
          {quickCards.map((card) => {
            const active = quick === card.key;
            return (
              <Grid key={card.key} size={{ xs: 6, md: 3 }}>
                <ButtonBase
                  onClick={() => setQuick(active && card.key !== "all" ? "all" : card.key)}
                  aria-pressed={active}
                  sx={{
                    width: "100%",
                    justifyContent: "flex-start",
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: active ? `${card.color}.main` : "grey.200",
                    boxShadow: active ? 1 : 0,
                    backgroundColor: "background.paper",
                    textAlign: "left",
                    transition: "all .15s",
                    "&:hover": { borderColor: `${card.color}.main` },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: `${card.color}.main`,
                      backgroundColor: `${card.color}.light`,
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={700} lineHeight={1.1}>
                      {card.count}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {card.label}
                    </Typography>
                  </Box>
                </ButtonBase>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <Stack
          mx={2}
          my={1.5}
          justifyContent="space-between"
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
        >
          <Grid display="flex" gap={1} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search registration, model or driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: { sm: 300 } }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconSearch size={16} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FilterButton
              value={filters}
              onApply={(v) => setFilters({ type: v.type ?? "", status: v.status ?? "" })}
              fields={[
                {
                  key: "type",
                  label: "Type",
                  options: VEHICLE_TYPES.map((t) => ({ value: t.value, label: t.label })),
                },
                ...(isArchiveView
                  ? []
                  : [
                      {
                        key: "status",
                        label: "Status",
                        options: VEHICLE_STATUSES.filter((s) => s.value !== "archived").map((s) => ({
                          value: s.value,
                          label: s.label,
                        })),
                      },
                    ]),
              ]}
            />
            {quick !== "all" && !isArchiveView && (
              <Chip
                label={quickCards.find((c) => c.key === quick)?.label}
                onDelete={() => setQuick("all")}
                color="primary"
                variant="outlined"
              />
            )}
          </Grid>

          <Stack direction="row" alignItems="center" spacing={1}>
            <ToggleButtonGroup
              exclusive
              size="small"
              color="primary"
              value={view}
              onChange={(_, value: View | null) => {
                if (!value) return;
                setView(value);
                setQuick("all");
                setFilters(noFilters);
              }}
            >
              <ToggleButton value="current" sx={{ textTransform: "none", px: 1.5 }}>
                Current ({current.length})
              </ToggleButton>
              <ToggleButton value="archived" sx={{ textTransform: "none", px: 1.5 }}>
                Archived ({archivedCount})
              </ToggleButton>
            </ToggleButtonGroup>
            {!isArchiveView && (
              <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={openCreate}>
                Add vehicle
              </Button>
            )}
            <ColumnVisibilityButton table={table} />
          </Stack>
        </Stack>
        <Divider />

        {!loading && rows.length === 0 && (
          <Stack alignItems="center" spacing={1} sx={{ pt: 3 }}>
            <Typography color="textSecondary">
              {hasNarrowing
                ? "No vehicles match your search or filters."
                : isArchiveView
                  ? "No archived vehicles. Sold or removed vehicles appear here with their history."
                  : "No vehicles yet. Add your first vehicle to start tracking MOT, service and drivers."}
            </Typography>
            {hasNarrowing ? (
              <Button variant="outlined" onClick={clearAll}>
                Clear search and filters
              </Button>
            ) : (
              !isArchiveView && (
                <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={openCreate}>
                  Add vehicle
                </Button>
              )
            )}
          </Stack>
        )}

        <InventoryTable table={table} loading={loading} rowCount={rows.length} onRowClick={openVehicle} />
        <Divider />
        <TablePaginationFooter table={table} totalRows={rows.length} />
      </Box>

      {editor.drawer}

      <AssignDriverDialog
        vehicle={assignFor}
        drivers={drivers}
        busyDriverIds={busyDriverIds}
        onClose={() => setAssignFor(null)}
        onSave={handleAssign}
      />

      <ConfirmDialog
        open={!!toArchive}
        title="Archive vehicle"
        message={
          toArchive
            ? `Archive ${toArchive.registration}? Use this when the vehicle is sold or no longer used. ${
                toArchive.driver_name ? `${toArchive.driver_name} will no longer see it in their app. ` : ""
              }Its history stays, and you can restore it from the Archived tab.`
            : ""
        }
        confirmLabel="Archive"
        onClose={() => setToArchive(null)}
        onConfirm={handleArchive}
      />
    </Box>
  );
};

export default VehicleList;
