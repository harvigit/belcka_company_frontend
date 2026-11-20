"use client";
import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
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
  IconCheck,
  IconCircleCheck,
  IconDownload,
  IconParking,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import InventoryTable from "../inventory-new/shared/InventoryTable";
import ConfirmDialog from "../inventory-new/shared/ConfirmDialog";
import FilterButton from "../inventory-new/shared/FilterButton";
import { selectColumn } from "../inventory-new/shared/selectColumn";
import FleetNav from "./fleet-nav";
import { CARD_TONE, StatCard } from "./detail/common";
import { NoCompany, RegPlate } from "./shared";
import { PERMIT_ORDER, PermitDrawer, PermitRejectDialog } from "./permit-forms";
import { formatDate, ParkingPermit, PERMIT_STATE, PermitState, permitState } from "./types";
import { useVehicles } from "./useVehicles";

type Focus = "all" | "active" | "attention";

// Needs the office: a request to approve, or a permit that is ending or has ended.
const ATTENTION: PermitState[] = ["pending", "expiring", "expired"];

const PermitsPage: React.FC = () => {
  const router = useRouter();
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null; name?: string | null };
  const store = useVehicles(user?.company_id, user?.name || "You");
  const { vehicles, permits, loading } = store;
  const byId = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const [focus, setFocus] = useState<Focus>("all");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ state: "", vehicle: "" });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [toReject, setToReject] = useState<ParkingPermit | null>(null);
  const [toRemove, setToRemove] = useState<ParkingPermit | null>(null);

  // Permits of vehicles still in the fleet, the ones needing action first, then by end date.
  const all = useMemo(
    () =>
      permits
        .filter((p) => byId.get(p.vehicle_id)?.status !== "archived")
        .sort(
          (a, b) =>
            PERMIT_ORDER[permitState(a)] - PERMIT_ORDER[permitState(b)] || a.valid_until.localeCompare(b.valid_until),
        ),
    [permits, byId],
  );
  const counts = {
    all: all.length,
    active: all.filter((p) => permitState(p) === "active").length,
    attention: all.filter((p) => ATTENTION.includes(permitState(p))).length,
    pending: all.filter((p) => p.status === "pending").length,
  };

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((p) => {
      const state = permitState(p);
      if (focus === "active" && state !== "active") return false;
      if (focus === "attention" && !ATTENTION.includes(state)) return false;
      if (filters.state && state !== filters.state) return false;
      if (filters.vehicle && String(p.vehicle_id) !== filters.vehicle) return false;
      if (!term) return true;
      return [byId.get(p.vehicle_id)?.registration ?? "", p.zone, p.issuer, p.reference, p.requested_by]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [all, focus, filters, search, byId]);

  const openVehicle = (p: ParkingPermit) => router.push(`/apps/vehicles/${p.vehicle_id}?tab=permits`);

  const exportCsv = () => {
    const list = selected.size ? rows.filter((p) => selected.has(p.id)) : rows;
    if (!list.length) {
      toast.error("No permits to export.");
      return;
    }
    const cell = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      ["Registration", "Zone / car park", "Issued by", "Reference", "Valid from", "Valid until", "Status", "Approved by"].map(cell).join(","),
      ...list.map((p) =>
        [
          byId.get(p.vehicle_id)?.registration ?? "",
          p.zone,
          p.issuer,
          p.reference,
          formatDate(p.valid_from),
          formatDate(p.valid_until),
          PERMIT_STATE[permitState(p)].label,
          p.status === "pending" ? "" : p.decided_by,
        ]
          .map(cell)
          .join(","),
      ),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `parking-permits-${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${list.length} permit${list.length === 1 ? "" : "s"} exported.`);
  };

  const columnHelper = createColumnHelper<ParkingPermit>();
  const columns = [
    selectColumn(rows, selected, setSelected) as any,
    columnHelper.accessor((p) => byId.get(p.vehicle_id)?.registration ?? "", {
      id: "vehicle",
      header: "Vehicle",
      cell: ({ row }) => {
        const v = byId.get(row.original.vehicle_id);
        return (
          <Box sx={{ pl: 1 }}>
            <RegPlate registration={v?.registration ?? "-"} />
            <Typography variant="caption" color="textSecondary" display="block" mt={0.25} noWrap>
              {v?.make_model}
            </Typography>
          </Box>
        );
      },
    }),
    columnHelper.accessor("zone", {
      header: "Zone / issuer",
      cell: ({ row }) => (
        <Box sx={{ pl: 1 }}>
          <Typography className="f-14" fontWeight={600}>
            {row.original.zone}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {row.original.issuer}
          </Typography>
        </Box>
      ),
    }),
    columnHelper.accessor("reference", {
      header: "Reference",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {row.original.reference || "-"}
        </Typography>
      ),
    }),
    columnHelper.accessor("valid_from", {
      header: "Valid from",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {formatDate(row.original.valid_from)}
        </Typography>
      ),
    }),
    columnHelper.accessor("valid_until", {
      header: "Valid until",
      cell: ({ row }) => {
        const state = permitState(row.original);
        return (
          <Typography
            className="f-14"
            sx={{ pl: 1 }}
            color={state === "expired" ? "error" : state === "expiring" ? "warning.main" : undefined}
            fontWeight={state === "expiring" || state === "expired" ? 600 : undefined}
          >
            {formatDate(row.original.valid_until)}
          </Typography>
        );
      },
    }),
    columnHelper.accessor((p) => PERMIT_ORDER[permitState(p)], {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const p = row.original;
        const s = PERMIT_STATE[permitState(p)];
        return (
          <Tooltip title={p.status === "rejected" && p.reject_reason ? `Reason: ${p.reject_reason}` : ""}>
            <Chip size="small" color={s.color} label={s.label} />
          </Tooltip>
        );
      },
    }),
    columnHelper.accessor((p) => (p.status === "pending" ? p.requested_by : p.decided_by), {
      id: "by",
      header: "Requested / approved by",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <Box sx={{ pl: 1 }}>
            <Typography className="f-14" noWrap>
              {p.status === "pending" ? p.requested_by : p.decided_by || "-"}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {p.status === "pending"
                ? "Requested in the app"
                : `${p.status === "approved" ? "Approved" : "Rejected"} · ${formatDate(p.decided_at)}`}
            </Typography>
          </Box>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <Stack direction="row" spacing={0.5}>
            {p.status === "pending" && (
              <>
                <Tooltip title="Approve">
                  <IconButton
                    color="success"
                    onClick={async () => {
                      await store.decidePermit(p.id, true);
                      toast.success(`${p.zone} approved.`);
                    }}
                  >
                    <IconCheck size={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reject">
                  <IconButton color="error" onClick={() => setToReject(p)}>
                    <IconX size={18} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title="Remove">
              <IconButton color="error" onClick={() => setToRemove(p)}>
                <IconTrash size={18} />
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
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
  });

  const fleet = vehicles.filter((v) => v.status !== "archived");
  const vehicleOptions = fleet
    .filter((v) => all.some((p) => p.vehicle_id === v.id))
    .map((v) => ({ value: String(v.id), label: v.registration }));
  const stateOptions = (Object.keys(PERMIT_STATE) as PermitState[]).map((s) => ({ value: s, label: PERMIT_STATE[s].label }));

  const cards: { key: Focus; label: string; count: number; hint: string; icon: React.ReactNode; color: "primary" | "success" | "warning" }[] = [
    { key: "all", label: "Permits", count: counts.all, hint: "Across the fleet", icon: <IconParking size={22} />, color: "primary" },
    { key: "active", label: "Active", count: counts.active, hint: "Valid today", icon: <IconCircleCheck size={22} />, color: "success" },
    {
      key: "attention",
      label: "Needs attention",
      count: counts.attention,
      hint: counts.pending ? `${counts.pending} waiting for approval` : "Ending soon or ended",
      icon: <IconAlertTriangle size={22} />,
      color: "warning",
    },
  ];

  if (store.noCompany) return <NoCompany />;

  return (
    <Box sx={{ minHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <FleetNav data={store} />

      <Box px={2} pt={2}>
        <Typography variant="h5" fontWeight={700}>
          Parking permits
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Every parking permit across the fleet. Drivers can request one in the app; you approve it here or on the
          vehicle. A renewal reminder shows 30 days before a permit ends.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ px: 2, pt: 2 }}>
        {cards.map((card) => (
          <Grid key={card.key} size={{ xs: 12, sm: 4 }}>
            <StatCard
              icon={card.icon}
              tone={CARD_TONE[card.color]}
              value={card.count}
              label={`${card.label} · ${card.hint}`}
              active={focus === card.key && card.key !== "all"}
              onClick={() => {
                setFocus(focus === card.key && card.key !== "all" ? "all" : card.key);
                setSelected(new Set());
              }}
            />
          </Grid>
        ))}
      </Grid>

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" mx={2} my={1.5} spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Search vehicle, zone, issuer or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: { sm: 320 } }}
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
            onApply={(v) => setFilters({ state: v.state ?? "", vehicle: v.vehicle ?? "" })}
            fields={[
              { key: "state", label: "Status", options: stateOptions },
              { key: "vehicle", label: "Vehicle", options: vehicleOptions },
            ]}
          />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<IconDownload size={18} />} onClick={exportCsv}>
            {selected.size ? `Export ${selected.size} selected` : "Export CSV"}
          </Button>
          <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => setAdding(true)} disabled={!fleet.length}>
            Add permit
          </Button>
        </Stack>
      </Stack>
      <Divider />

      {!loading && rows.length === 0 ? (
        <Stack alignItems="center" spacing={1} py={6}>
          <Typography variant="h6">{all.length ? "Nothing here" : "No parking permits yet"}</Typography>
          <Typography color="textSecondary">
            {all.length ? "No permits match this view." : "Add a permit, or approve one a driver requests in the app."}
          </Typography>
        </Stack>
      ) : (
        <>
          <InventoryTable table={table} loading={loading} rowCount={rows.length} onRowClick={openVehicle} />
          <Divider />
          <TablePaginationFooter table={table} totalRows={rows.length} selectedCount={selected.size} />
        </>
      )}

      <PermitDrawer open={adding} vehicles={fleet} onClose={() => setAdding(false)} onAdd={store.addPermit} />

      <PermitRejectDialog
        permit={toReject}
        onClose={() => setToReject(null)}
        onReject={(id, reason) => store.decidePermit(id, false, reason)}
      />

      <ConfirmDialog
        open={!!toRemove}
        title="Remove permit"
        message={
          toRemove ? `Remove ${toRemove.zone} from ${byId.get(toRemove.vehicle_id)?.registration ?? "this vehicle"}?` : ""
        }
        onClose={() => setToRemove(null)}
        onConfirm={async () => {
          if (!toRemove) return;
          await store.removePermit(toRemove.id);
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(toRemove.id);
            return next;
          });
          toast.success("Permit removed.");
          setToRemove(null);
        }}
      />
    </Box>
  );
};

export default PermitsPage;
