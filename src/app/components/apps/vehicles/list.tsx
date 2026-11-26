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
  MenuItem,
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
  IconCalendar,
  IconCalendarX,
  IconDownload,
  IconChecklist,
  IconClipboardCheck,
  IconTool,
  IconArchive,
  IconArrowBackUp,
  IconTrash,
  IconCar,
  IconEdit,
  IconPlus,
  IconSearch,
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
import { csvDate, downloadCsv } from "./csv";
import {
  countsAsCost,
  dueItems,
  formatDate,
  formatMiles,
  fuelLabel,
  money,
  needsDailyCheck,
  nextDue,
  permitState,
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
import { CARD_TONE, StatCard } from "./detail/common";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { buildActions } from "./actions";
import DriverChecksToday from "./driver-checks-today";
import dayjs from "dayjs";

type QuickFilter = "all" | "active" | "mot" | "service";
type View = "current" | "archived";
type Period = "30" | "90" | "365" | "year" | "all" | "custom";

const PERIODS: Record<Period, { label: string; short: string }> = {
  "30": { label: "Last 30 days", short: "30 days" },
  "90": { label: "Last 90 days", short: "90 days" },
  "365": { label: "Last 12 months", short: "12 months" },
  year: { label: "This year", short: "this year" },
  all: { label: "All time", short: "all time" },
  custom: { label: "Choose dates...", short: "dates" },
};

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
  const { vehicles, loading, save, assignDriver, archive, restore, remove, findByRegistration } = store;
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
  // Period for the miles and costs columns
  const [period, setPeriod] = useState<Period>("30");
  const [custom, setCustom] = useState({
    from: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD"),
  });
  const [assignFor, setAssignFor] = useState<Vehicle | null>(null);
  const [toArchive, setToArchive] = useState<Vehicle | null>(null);
  const [toDelete, setToDelete] = useState<Vehicle | null>(null);

  const isArchiveView = view === "archived";
  const current = useMemo(() => vehicles.filter((v) => v.status !== "archived"), [vehicles]);
  const archivedCount = vehicles.length - current.length;

  // MOT/service overdue, worked out as on the vehicle page and Action Centre
  const isOverdue = (v: Vehicle, label: "MOT" | "Service") =>
    (v.status === "active" || v.status === "in_service") &&
    dueItems(v).some((i) => i.label === label && i.state === "overdue");

  const stats = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");
    const needCheck = current.filter((v) => needsDailyCheck(v, store.dailyChecks));
    const checked = new Set(store.checklists.filter((c) => c.date === today).map((c) => c.vehicle_id));
    const live = new Set(current.map((v) => v.id));
    return {
      active: current.filter((v) => v.status === "active").length,
      actions: buildActions(store).length,
      defects: store.defects.filter(
        (d) => d.type === "defect" && (d.status === "open" || d.status === "in_progress") && live.has(d.vehicle_id),
      ).length,
      checksDone: needCheck.filter((v) => checked.has(v.id)).length,
      checksNeeded: needCheck.length,
      mot: current.filter((v) => isOverdue(v, "MOT")).length,
      service: current.filter((v) => isOverdue(v, "Service")).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, store.checklists, store.defects, store.events, store.permits, store.onboardings, store.licences, store.conflicts]);

  const today = dayjs().format("YYYY-MM-DD");
  const range = useMemo(() => {
    if (period === "all") return { from: "", to: today, name: "all time" };
    if (period === "year") return { from: dayjs().startOf("year").format("YYYY-MM-DD"), to: today, name: "this year" };
    if (period === "custom") {
      const from = custom.from && custom.to && custom.from > custom.to ? custom.to : custom.from;
      return {
        from,
        to: custom.to || today,
        name: `${formatDate(from)} – ${formatDate(custom.to || today)}`,
      };
    }
    return { from: dayjs().subtract(Number(period), "day").format("YYYY-MM-DD"), to: today, name: PERIODS[period].short };
  }, [period, custom, today]);

  const usage = useMemo(() => {
    const map = new Map<number, { miles: number; costs: number }>();
    for (const v of vehicles) {
      const own = store.events.filter((e) => e.vehicle_id === v.id);
      const readings = own
        .filter((e) => e.mileage && e.date <= range.to)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.mileage ?? 0) - (b.mileage ?? 0));
      // start: last reading before the period (or first); end: last in it (or current)
      const start = range.from ? [...readings].reverse().find((e) => e.date < range.from) ?? readings[0] : readings[0];
      const end = range.to >= today ? v.mileage : readings[readings.length - 1]?.mileage ?? v.mileage;
      const miles = start ? Math.max(0, end - (start.mileage ?? 0)) : 0;
      const costs = own
        .filter((e) => countsAsCost(e) && e.date >= range.from && e.date <= range.to)
        .reduce((sum, e) => sum + (e.cost ?? 0), 0);
      map.set(v.id, { miles, costs });
    }
    return map;
  }, [vehicles, store.events, range, today]);

  const permitsOf = (v: Vehicle) => store.permits.filter((p) => p.vehicle_id === v.id);

  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (isArchiveView !== (v.status === "archived")) return false;
      if (filters.type && v.type !== filters.type) return false;
      if (!isArchiveView) {
        if (filters.status && v.status !== filters.status) return false;
        if (quick === "active" && v.status !== "active") return false;
        if (quick === "mot" && !isOverdue(v, "MOT")) return false;
        if (quick === "service" && !isOverdue(v, "Service")) return false;
      }
      if (!term) return true;
      return [v.registration, v.make_model, v.driver_name ?? "", v.gps_tracker]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, searchTerm, filters, quick, isArchiveView]);

  const handleAssign = async (vehicle: Vehicle, driver: DriverOption | null) => {
    try {
      await assignDriver(vehicle.id, driver);
    } catch {
      return;
    }
    toast.success(
      driver
        ? `${vehicle.registration} assigned to ${driver.name}.`
        : `Driver removed from ${vehicle.registration}.`,
    );
    setAssignFor(null);
  };

  const handleArchive = async () => {
    if (!toArchive) return;
    try {
      await archive([toArchive.id]);
    } catch {
      return;
    }
    toast.success(`${toArchive.registration} moved to Archived.`);
    setToArchive(null);
  };

  const handleRestore = async (v: Vehicle) => {
    try {
      await restore([v.id]);
    } catch {
      return;
    }
    toast.success(`${v.registration} is back in the list as Inactive. Assign a driver to use it again.`);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await remove([toDelete.id]);
    } catch {
      return;
    }
    toast.success(`${toDelete.registration} deleted.`);
    setToDelete(null);
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
      header: `Mileage / ${range.name}`,
      cell: ({ row }) => (
        <Box sx={{ pl: 1, fontVariantNumeric: "tabular-nums" }}>
          <Typography className="f-14" fontWeight={600}>
            {formatMiles(row.original.mileage)}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            +{formatMiles(usage.get(row.original.id)?.miles ?? 0)}
          </Typography>
        </Box>
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
    columnHelper.accessor((v) => usage.get(v.id)?.costs ?? 0, {
      id: "costs",
      header: `Costs · ${range.name}`,
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1, fontVariantNumeric: "tabular-nums" }}>
          {money(usage.get(row.original.id)?.costs ?? 0)}
        </Typography>
      ),
    }),
    columnHelper.accessor((v) => permitsOf(v).length, {
      id: "permits",
      header: "Parking permits",
      cell: ({ row }) => {
        const list = permitsOf(row.original);
        const attention = list.filter((p) => ["pending", "expiring", "expired"].includes(permitState(p))).length;
        return (
          <Tooltip title={attention ? `${attention} need${attention === 1 ? "s" : ""} attention` : "Open permits"}>
            <Chip
              size="small"
              variant={list.length ? "filled" : "outlined"}
              color={attention ? "warning" : list.length ? "primary" : "default"}
              label={`${list.length} permit${list.length === 1 ? "" : "s"}`}
              onClick={() => router.push(`/apps/vehicles/${row.original.id}?tab=permits`)}
            />
          </Tooltip>
        );
      },
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
        const deleteButton = (
          <Tooltip title="Delete">
            <IconButton color="error" onClick={() => setToDelete(v)}>
              <IconTrash size={18} />
            </IconButton>
          </Tooltip>
        );
        if (v.status === "archived") {
          return (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button
                size="small"
                variant="outlined"
                startIcon={<IconArrowBackUp size={16} />}
                onClick={() => handleRestore(v)}
              >
                Restore
              </Button>
              {deleteButton}
            </Stack>
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
            {deleteButton}
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

  // Visible vehicles (search, filters, tiles applied), sorted like the table.
  const exportCsv = () => {
    const list = table.getSortedRowModel().rows.map((r) => r.original);
    if (!list.length) {
      toast.error("No vehicles to export.");
      return;
    }
    const due = (v: Vehicle, label: string) => {
      const item = dueItems(v).find((i) => i.label === label);
      return item ? csvDate(formatDate(item.date)) : "";
    };
    downloadCsv(`vehicles-${isArchiveView ? "archived-" : ""}${dayjs().format("YYYY-MM-DD")}.csv`, [
      [
        "Registration",
        "Make and model",
        "Type",
        "Fuel",
        "Status",
        "Driver",
        "Mileage",
        "MOT due",
        "Service due",
        "Insurance due",
        "Road tax due",
        "Tyre check due",
        "Next due",
        `Miles (${range.name})`,
        `Costs (${range.name})`,
        "Parking permits",
        "GPS tracker",
      ],
      ...list.map((v) => {
        const next = nextDue(v);
        return [
          v.registration,
          v.make_model,
          typeLabel(v.type),
          fuelLabel(v.fuel_type),
          statusInfo(v.status).label,
          v.driver_name ?? "",
          v.mileage,
          due(v, "MOT"),
          due(v, "Service"),
          due(v, "Insurance"),
          due(v, "Road tax"),
          due(v, "Tyre check"),
          next ? `${next.label} · ${formatDate(next.date)}` : "",
          usage.get(v.id)?.miles ?? 0,
          (usage.get(v.id)?.costs ?? 0).toFixed(2),
          permitsOf(v).length,
          v.gps_tracker,
        ];
      }),
    ]);
    toast.success(`${list.length} vehicle${list.length === 1 ? "" : "s"} exported.`);
  };

  const STAT_HINT: Record<string, string> = {
    active: "In use now",
    actions: "In the Action Centre",
    defects: "From daily checklists",
    checks: "Done / needed today",
    mot: "Past the MOT date",
    service: "Past the service date",
  };

  // Vehicle tiles filter this list; the others open the Action Centre.
  const statCards: {
    key: string;
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: "primary" | "error" | "warning" | "secondary" | "info" | "success";
    filter?: QuickFilter;
    href?: string;
    alert?: boolean;
  }[] = [
    { key: "active", label: "Active vehicles", value: stats.active, icon: <IconCar size={22} />, color: "primary", filter: "active" },
    {
      key: "actions",
      label: "Open actions",
      value: stats.actions,
      icon: <IconChecklist size={22} />,
      color: "secondary",
      href: "/apps/vehicles/action-centre",
    },
    {
      key: "defects",
      label: "Open defects",
      value: stats.defects,
      icon: <IconTool size={22} />,
      color: "warning",
      href: "/apps/vehicles/action-centre?section=register",
      alert: stats.defects > 0,
    },
    {
      key: "checks",
      label: "Checklists today",
      value: `${stats.checksDone} / ${stats.checksNeeded}`,
      icon: <IconClipboardCheck size={22} />,
      color: stats.checksDone < stats.checksNeeded ? "info" : "success",
      href: "/apps/vehicles/action-centre?section=checks",
    },
    { key: "mot", label: "MOT overdue", value: stats.mot, icon: <IconCalendarX size={22} />, color: "error", filter: "mot", alert: stats.mot > 0 },
    {
      key: "service",
      label: "Service overdue",
      value: stats.service,
      icon: <IconAlertTriangle size={22} />,
      color: "error",
      filter: "service",
      alert: stats.service > 0,
    },
  ];

  if (store.noCompany) return <NoCompany />;

  return (
    <Box sx={{ minHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <FleetNav data={store} />

      {!isArchiveView && (
        <Grid container spacing={2} sx={{ px: 2, pt: 2, pb: 1 }}>
          {statCards.map((card) => (
            <Grid key={card.key} size={{ xs: 6, sm: 4, lg: 2 }}>
              <StatCard
                icon={card.icon}
                tone={CARD_TONE[card.color]}
                value={card.value}
                label={card.label}
                hint={STAT_HINT[card.key]}
                active={!!card.filter && quick === card.filter}
                alert={card.alert}
                link={!!card.href}
                title={card.href ? "Open in the Action Centre" : quick === card.filter ? "Show all vehicles" : "Show these vehicles"}
                onClick={() =>
                  card.href ? router.push(card.href) : setQuick(quick === card.filter ? "all" : (card.filter as QuickFilter))
                }
              />
            </Grid>
          ))}
        </Grid>
      )}

      <Box sx={{ display: "flex", flexDirection: "column" }}>
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
            <CustomTextField
              select
              size="small"
              value={period}
              onChange={(e: any) => setPeriod(e.target.value)}
              sx={{ minWidth: 170 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconCalendar size={16} />
                    </InputAdornment>
                  ),
                },
              }}
              aria-label="Period for miles and costs"
            >
              {(Object.keys(PERIODS) as Period[]).map((p) => (
                <MenuItem key={p} value={p}>
                  {PERIODS[p].label}
                </MenuItem>
              ))}
            </CustomTextField>
            {period === "custom" && (
              <>
                <CustomTextField
                  type="date"
                  size="small"
                  value={custom.from}
                  onChange={(e: any) => setCustom((c) => ({ ...c, from: e.target.value }))}
                  slotProps={{ htmlInput: { max: custom.to || today, "aria-label": "From" } }}
                />
                <Typography color="textSecondary">to</Typography>
                <CustomTextField
                  type="date"
                  size="small"
                  value={custom.to}
                  onChange={(e: any) => setCustom((c) => ({ ...c, to: e.target.value }))}
                  slotProps={{ htmlInput: { min: custom.from, max: today, "aria-label": "To" } }}
                />
              </>
            )}
            {quick !== "all" && !isArchiveView && (
              <Chip
                label={statCards.find((c) => c.filter === quick)?.label}
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
            <Button variant="outlined" startIcon={<IconDownload size={18} />} onClick={exportCsv}>
              Export CSV
            </Button>
            {!isArchiveView && (
              <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={openCreate}>
                Add vehicle
              </Button>
            )}
            <ColumnVisibilityButton table={table} />
          </Stack>
        </Stack>
        <Divider />

        <InventoryTable table={table} loading={loading} rowCount={rows.length} onRowClick={openVehicle} />
        <Divider />
        <TablePaginationFooter table={table} totalRows={rows.length} />
      </Box>

      {!isArchiveView && (
        <DriverChecksToday
          vehicles={current}
          checklists={store.checklists}
          dailyChecks={store.dailyChecks}
          onOpenVehicle={openVehicle}
          onOpenActionCentre={() => router.push("/apps/vehicles/action-centre?section=checks")}
        />
      )}

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

      <ConfirmDialog
        open={!!toDelete}
        title="Delete vehicle"
        message={
          toDelete
            ? `Delete ${toDelete.registration}? It disappears from the list and the archive, and its registration can be added again. ${
                toDelete.driver_name ? `${toDelete.driver_name} will no longer see it in their app. ` : ""
              }Use Archive instead when the vehicle is sold and you want to keep it with the past vehicles.`
            : ""
        }
        confirmLabel="Delete"
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </Box>
  );
};

export default VehicleList;
