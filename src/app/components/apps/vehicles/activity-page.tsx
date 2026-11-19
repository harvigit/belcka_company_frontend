"use client";
import React, { useMemo, useState } from "react";
import {
  Box,
  Chip,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
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
import { IconSearch } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import InventoryTable from "../inventory-new/shared/InventoryTable";
import FilterButton from "../inventory-new/shared/FilterButton";
import FleetNav from "./fleet-nav";
import { DriverName, RegPlate, NoCompany } from "./shared";
import { Activity, ACTIVITY_AREA, ActivityArea } from "./types";
import { useVehicles } from "./useVehicles";

type Period = "7" | "30" | "all";

const ActivityPage: React.FC = () => {
  const router = useRouter();
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null; name?: string | null };
  const store = useVehicles(user?.company_id, user?.name || "You");
  const { vehicles, loading } = store;
  const byId = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const [period, setPeriod] = useState<Period>("30");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ area: "", by: "", vehicle: "" });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

  const from = period === "all" ? "" : dayjs().subtract(Number(period), "day").toISOString();
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...store.activities]
      .filter((a) => {
        if (from && a.at < from) return false;
        if (filters.area && a.area !== filters.area) return false;
        if (filters.by && a.by !== filters.by) return false;
        if (filters.vehicle && String(a.vehicle_id) !== filters.vehicle) return false;
        if (!term) return true;
        return [a.action, a.detail, a.by, byId.get(a.vehicle_id ?? -1)?.registration ?? ""].join(" ").toLowerCase().includes(term);
      })
      .sort((a, b) => b.at.localeCompare(a.at) || b.id - a.id);
  }, [store.activities, from, filters, search, byId]);

  const people = [...new Set(store.activities.map((a) => a.by))].sort();
  const activeFilters = Object.values(filters).filter(Boolean).length;

  const columnHelper = createColumnHelper<Activity>();
  const columns = [
    columnHelper.accessor("at", {
      header: "When",
      cell: ({ row }) => (
        <Box sx={{ pl: 1 }}>
          <Typography className="f-14">{dayjs(row.original.at).format("DD/MM/YYYY")}</Typography>
          <Typography variant="caption" color="textSecondary">
            {dayjs(row.original.at).format("HH:mm")}
          </Typography>
        </Box>
      ),
    }),
    columnHelper.accessor("by", {
      header: "Who",
      cell: ({ row }) => <DriverName name={row.original.by} />,
    }),
    columnHelper.accessor("action", {
      header: "What",
      cell: ({ row }) => (
        <Box sx={{ pl: 1 }}>
          <Typography className="f-14" fontWeight={600}>
            {row.original.action}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {ACTIVITY_AREA[row.original.area]}
          </Typography>
        </Box>
      ),
    }),
    columnHelper.accessor((a) => byId.get(a.vehicle_id ?? -1)?.registration ?? "", {
      id: "vehicle",
      header: "Vehicle",
      cell: ({ row }) => {
        const v = row.original.vehicle_id ? byId.get(row.original.vehicle_id) : undefined;
        return v ? (
          <Box sx={{ pl: 1 }}>
            <RegPlate registration={v.registration} />
          </Box>
        ) : (
          <Typography className="f-14" color="textSecondary" sx={{ pl: 1 }}>
            -
          </Typography>
        );
      },
    }),
    columnHelper.accessor("detail", {
      header: "Details",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1, maxWidth: 460 }}>
          {row.original.detail || "-"}
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

  if (store.noCompany) return <NoCompany />;

  return (
    <Box sx={{ minHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <FleetNav data={store} />

      <Box px={2} pt={2}>
        <Typography variant="h5" fontWeight={700}>
          Activity
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Who changed what in Vehicles, newest first. Entries can&apos;t be edited or removed.
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" mx={2} my={1.5} spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search change, person or vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            onApply={(v) => setFilters({ area: v.area ?? "", by: v.by ?? "", vehicle: v.vehicle ?? "" })}
            fields={[
              {
                key: "area",
                label: "Area",
                options: (Object.keys(ACTIVITY_AREA) as ActivityArea[]).map((k) => ({ value: k, label: ACTIVITY_AREA[k] })),
              },
              { key: "by", label: "Person", options: people.map((p) => ({ value: p, label: p })) },
              {
                key: "vehicle",
                label: "Vehicle",
                options: vehicles.map((v) => ({ value: String(v.id), label: v.registration })),
              },
            ]}
          />
          <Typography variant="body2" color="textSecondary">
            {rows.length} change{rows.length === 1 ? "" : "s"}
            {activeFilters ? ` · ${activeFilters} filter${activeFilters > 1 ? "s" : ""} on` : ""}
          </Typography>
        </Stack>
        <ToggleButtonGroup exclusive size="small" color="primary" value={period} onChange={(_, v: Period | null) => v && setPeriod(v)}>
          <ToggleButton value="7" sx={{ textTransform: "none" }}>
            Last 7 days
          </ToggleButton>
          <ToggleButton value="30" sx={{ textTransform: "none" }}>
            Last 30 days
          </ToggleButton>
          <ToggleButton value="all" sx={{ textTransform: "none" }}>
            All time
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Divider />

      {!loading && rows.length === 0 ? (
        <Stack alignItems="center" spacing={1} py={6}>
          <Typography variant="h6">No activity</Typography>
          <Typography color="textSecondary">
            {store.activities.length ? "Nothing matches this period, search or filter." : "Changes in Vehicles appear here as people make them."}
          </Typography>
          {period !== "all" && store.activities.length > 0 && (
            <Chip label="Show all time" color="primary" variant="outlined" onClick={() => setPeriod("all")} />
          )}
        </Stack>
      ) : (
        <>
          <InventoryTable
            table={table}
            loading={loading}
            rowCount={rows.length}
            onRowClick={(a: Activity) => a.vehicle_id && router.push(`/apps/vehicles/${a.vehicle_id}`)}
          />
          <Divider />
          <TablePaginationFooter table={table} totalRows={rows.length} />
        </>
      )}
    </Box>
  );
};

export default ActivityPage;
