"use client";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
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
import { IconArrowBackUp, IconCheck, IconFileText, IconSearch, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import InventoryTable from "../inventory-new/shared/InventoryTable";
import ConfirmDialog from "../inventory-new/shared/ConfirmDialog";
import FilterButton from "../inventory-new/shared/FilterButton";
import { selectColumn } from "../inventory-new/shared/selectColumn";
import FleetNav from "./fleet-nav";
import { RegPlate, NoCompany } from "./shared";
import { StatTile } from "./detail/common";
import { EVENT_KINDS, EXPENSE_STATUS, ExpenseStatus, formatDate, money, VehicleEvent } from "./types";
import { useVehicles } from "./useVehicles";

type View = ExpenseStatus | "all";

const describe = (e: VehicleEvent) =>
  e.kind === "mileage_claim"
    ? `${e.claim_miles ?? 0} business miles × ${e.claim_rate ?? 0}p${e.note ? ` · ${e.note}` : ""}`
    : [e.supplier, e.note].filter(Boolean).join(" · ") || "-";

const Expenses: React.FC = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null; id?: number; name?: string | null };
  const store = useVehicles(user?.company_id, user?.name || "You");
  const { vehicles, loading } = store;
  const byId = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const [view, setView] = useState<View>("pending");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ kind: "", vehicle: "" });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [openId, setOpenId] = useState<number | null>(null);
  const [toReject, setToReject] = useState<number[]>([]);
  const [reason, setReason] = useState("");

  // Expenses are what drivers send from the app (they have a status).
  const all = useMemo(
    () => store.events.filter((e) => e.status).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    [store.events],
  );
  const pending = all.filter((e) => e.status === "pending");
  const monthStart = dayjs().startOf("month").format("YYYY-MM-DD");
  const approvedMonth = all.filter((e) => e.status === "approved" && (e.decided_at ?? e.date) >= monthStart);
  const claimMiles = all
    .filter((e) => e.kind === "mileage_claim" && e.status !== "rejected" && e.date >= monthStart)
    .reduce((s, e) => s + (e.claim_miles ?? 0), 0);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((e) => {
      if (view !== "all" && e.status !== view) return false;
      if (filters.kind && e.kind !== filters.kind) return false;
      if (filters.vehicle && String(e.vehicle_id) !== filters.vehicle) return false;
      if (!term) return true;
      return [byId.get(e.vehicle_id)?.registration ?? "", e.submitted_by ?? "", e.supplier, e.note, e.project ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [all, view, filters, search, byId]);

  const selectedPending = [...selected].filter((id) => pending.some((p) => p.id === id));

  const approve = async (ids: number[]) => {
    await store.decideExpenses(ids, true);
    toast.success(ids.length > 1 ? `${ids.length} expenses approved.` : "Expense approved.");
    setSelected(new Set());
    setOpenId(null);
  };

  const reject = async () => {
    if (!reason.trim()) {
      toast.error("Please add a reason for rejecting!");
      return;
    }
    await store.decideExpenses(toReject, false, reason.trim());
    toast.success(toReject.length > 1 ? `${toReject.length} expenses rejected.` : "Expense rejected.");
    setToReject([]);
    setReason("");
    setSelected(new Set());
    setOpenId(null);
  };

  const columnHelper = createColumnHelper<VehicleEvent>();
  const columns = [
    ...(view === "pending" ? [selectColumn(rows, selected, setSelected) as any] : []),
    columnHelper.accessor("date", {
      header: "Date",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {formatDate(row.original.date)}
        </Typography>
      ),
    }),
    columnHelper.accessor((e) => byId.get(e.vehicle_id)?.registration ?? "", {
      id: "vehicle",
      header: "Vehicle",
      cell: ({ row }) => (
        <Box sx={{ pl: 1 }}>
          <RegPlate registration={byId.get(row.original.vehicle_id)?.registration ?? "-"} />
        </Box>
      ),
    }),
    columnHelper.accessor((e) => e.submitted_by ?? "", {
      id: "driver",
      header: "Sent by",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }} noWrap>
          {row.original.submitted_by ?? "-"}
        </Typography>
      ),
    }),
    columnHelper.accessor("kind", {
      header: "Type",
      cell: ({ row }) => (
        <Chip size="small" variant="outlined" color={EVENT_KINDS[row.original.kind].color} label={EVENT_KINDS[row.original.kind].label} />
      ),
    }),
    columnHelper.accessor((e) => describe(e), {
      id: "details",
      header: "Details",
      cell: ({ row }) => (
        <Box sx={{ pl: 1, maxWidth: 300 }}>
          <Typography className="f-14">{describe(row.original)}</Typography>
          {row.original.project && (
            <Typography variant="caption" color="textSecondary">
              {row.original.project}
            </Typography>
          )}
        </Box>
      ),
    }),
    columnHelper.accessor((e) => e.file_name ?? "", {
      id: "receipt",
      header: "Receipt",
      cell: ({ row }) =>
        row.original.file_name ? (
          <Tooltip title={row.original.file_name}>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ pl: 1 }}>
              <IconFileText size={16} />
              <Typography variant="body2">Photo</Typography>
            </Stack>
          </Tooltip>
        ) : row.original.kind === "mileage_claim" ? (
          <Typography variant="body2" color="textSecondary" sx={{ pl: 1 }}>
            Not needed
          </Typography>
        ) : (
          <Chip size="small" color="warning" variant="outlined" label="Missing" />
        ),
    }),
    columnHelper.accessor("cost", {
      header: "Amount",
      cell: ({ row }) => (
        <Typography className="f-14" fontWeight={700} sx={{ pl: 1, fontVariantNumeric: "tabular-nums" }}>
          {money(row.original.cost)}
        </Typography>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ row }) => {
        const e = row.original;
        const s = EXPENSE_STATUS[e.status ?? "pending"];
        return (
          <Tooltip
            title={
              e.status === "rejected" && e.reject_reason
                ? `Reason: ${e.reject_reason}`
                : e.decided_by
                  ? `${s.label} by ${e.decided_by} · ${formatDate(e.decided_at)}`
                  : ""
            }
          >
            <Chip size="small" color={s.color} label={s.label} />
          </Tooltip>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) =>
        row.original.status === "pending" ? (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Approve">
              <IconButton color="success" onClick={() => approve([row.original.id])}>
                <IconCheck size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reject">
              <IconButton
                color="error"
                onClick={() => {
                  setReason("");
                  setToReject([row.original.id]);
                }}
              >
                <IconX size={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Typography variant="body2" color="textSecondary">
            -
          </Typography>
        ),
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

  const open = all.find((e) => e.id === openId) ?? null;
  const vehicleOptions = vehicles
    .filter((v) => all.some((e) => e.vehicle_id === v.id))
    .map((v) => ({ value: String(v.id), label: v.registration }));
  const kindOptions = [...new Set(all.map((e) => e.kind))].map((k) => ({ value: k, label: EVENT_KINDS[k].label }));

  if (store.noCompany) return <NoCompany />;

  return (
    <Box sx={{ minHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <FleetNav data={store} />

      <Box px={2} pt={2}>
        <Typography variant="h5" fontWeight={700}>
          Expenses
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Costs and mileage claims drivers send from the app. Approved ones are added to the vehicle&apos;s costs; the driver sees the decision in the app.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ px: 2, pt: 2 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatTile tone="blue"
            label="Waiting for approval"
            value={pending.length}
            sub={pending.length ? money(pending.reduce((s, e) => s + (e.cost ?? 0), 0)) : "Nothing to approve"}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatTile tone="purple"
            label="Approved this month"
            value={money(approvedMonth.reduce((s, e) => s + (e.cost ?? 0), 0))}
            sub={`${approvedMonth.length} expense${approvedMonth.length === 1 ? "" : "s"}`}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatTile tone="green" label="Mileage claimed this month" value={`${claimMiles} mi`} sub="Private cars, not rejected" />
        </Grid>
      </Grid>

      <Tabs
        value={view}
        onChange={(_, v: View) => {
          setView(v);
          setSelected(new Set());
        }}
        sx={{ px: 2, mt: 1 }}
      >
        <Tab value="pending" label={`Waiting (${pending.length})`} />
        <Tab value="approved" label="Approved" />
        <Tab value="rejected" label="Rejected" />
        <Tab value="all" label="All" />
      </Tabs>
      <Divider />

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" mx={2} my={1.5} spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Search vehicle, driver, supplier or project..."
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
            onApply={(v) => setFilters({ kind: v.kind ?? "", vehicle: v.vehicle ?? "" })}
            fields={[
              { key: "kind", label: "Type", options: kindOptions },
              { key: "vehicle", label: "Vehicle", options: vehicleOptions },
            ]}
          />
        </Stack>
        {view === "pending" && selectedPending.length > 0 && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="success" startIcon={<IconCheck size={18} />} onClick={() => approve(selectedPending)}>
              Approve {selectedPending.length}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<IconX size={18} />}
              onClick={() => {
                setReason("");
                setToReject(selectedPending);
              }}
            >
              Reject {selectedPending.length}
            </Button>
          </Stack>
        )}
      </Stack>
      <Divider />

      {!loading && rows.length === 0 ? (
        <Stack alignItems="center" spacing={1} py={6}>
          <Typography variant="h6">{view === "pending" ? "All caught up" : "Nothing here"}</Typography>
          <Typography color="textSecondary">
            {view === "pending" && !search && !filters.kind && !filters.vehicle
              ? "No expenses are waiting for approval."
              : "No expenses match this view."}
          </Typography>
        </Stack>
      ) : (
        <>
          <InventoryTable table={table} loading={loading} rowCount={rows.length} onRowClick={(e: VehicleEvent) => setOpenId(e.id)} />
          <Divider />
          <TablePaginationFooter table={table} totalRows={rows.length} selectedCount={selectedPending.length} />
        </>
      )}

      {open && (
        <Dialog open onClose={() => setOpenId(null)} fullWidth maxWidth="xs">
          <DialogTitle>
            <Stack direction="row" spacing={1} alignItems="center">
              <span>{EVENT_KINDS[open.kind].label}</span>
              <RegPlate registration={byId.get(open.vehicle_id)?.registration ?? "-"} />
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Typography variant="h4" fontWeight={700} mb={1}>
              {money(open.cost)}
            </Typography>
            <Stack spacing={0.75}>
              {[
                ["Date", formatDate(open.date)],
                ["Sent by", open.submitted_by ?? "-"],
                ["Project", open.project ?? "-"],
                ...(open.kind === "mileage_claim"
                  ? [["Claim", `${open.claim_miles} business miles × ${open.claim_rate}p per mile`]]
                  : [["Supplier", open.supplier || "-"]]),
                ["Note", open.note || "-"],
                ["Receipt", open.file_name ?? (open.photos?.length ? "Photo" : open.kind === "mileage_claim" ? "Not needed" : "Missing")],
              ].map(([label, value]) => (
                <Stack key={label} direction="row" justifyContent="space-between" spacing={2}>
                  <Typography variant="body2" color="textSecondary">
                    {label}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} textAlign="right">
                    {value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            {!open.file_name && !open.photos?.length && open.kind !== "mileage_claim" && open.status === "pending" && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No receipt photo. Ask the driver for one before approving.
              </Alert>
            )}
            {open.status !== "pending" && (
              <Alert severity={open.status === "approved" ? "success" : "error"} sx={{ mt: 2 }}>
                {EXPENSE_STATUS[open.status ?? "pending"].label} by {open.decided_by} · {formatDate(open.decided_at)}
                {open.reject_reason ? `. Reason: ${open.reject_reason}` : ""}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            {open.status === "pending" ? (
              <>
                <Button
                  color="error"
                  onClick={() => {
                    setReason("");
                    setToReject([open.id]);
                  }}
                  sx={{ mr: "auto" }}
                >
                  Reject
                </Button>
                <Button variant="outlined" onClick={() => setOpenId(null)}>
                  Close
                </Button>
                <Button variant="contained" color="success" onClick={() => approve([open.id])}>
                  Approve
                </Button>
              </>
            ) : (
              <>
                <Tooltip title="Use this if it was approved or rejected by mistake. The driver sees it as waiting again.">
                  <Button
                    sx={{ mr: "auto" }}
                    startIcon={<IconArrowBackUp size={16} />}
                    onClick={async () => {
                      await store.reopenExpense(open.id);
                      toast.success("Moved back to Waiting for approval.");
                      setOpenId(null);
                      setView("pending");
                    }}
                  >
                    Move back to waiting
                  </Button>
                </Tooltip>
                <Button variant="outlined" onClick={() => setOpenId(null)}>
                  Close
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      )}

      <ConfirmDialog
        open={toReject.length > 0}
        title={toReject.length > 1 ? `Reject ${toReject.length} expenses` : "Reject expense"}
        message="The driver sees your reason in the app."
        confirmLabel="Reject"
        onClose={() => {
          setToReject([]);
          setReason("");
        }}
        onConfirm={reject}
      >
        <CustomTextField
          autoFocus
          fullWidth
          multiline
          minRows={2}
          placeholder="Reason..."
          value={reason}
          onChange={(e: any) => setReason(e.target.value.slice(0, 200))}
          sx={{ mt: 2 }}
        />
      </ConfirmDialog>
    </Box>
  );
};

export default Expenses;
