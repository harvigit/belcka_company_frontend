"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Chip, Divider, Grid, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import { IconArrowBackUp, IconChevronRight, IconCircleCheck, IconClipboardList, IconInbox, IconProgress, IconSearch } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import InventoryTable from "@/app/components/apps/inventory-new/shared/InventoryTable";
import { CARD_TONE, StatCard } from "@/app/components/apps/vehicles/detail/common";
import { DriverName } from "@/app/components/apps/vehicles/shared";
import SurveyNav from "../nav";
import { apiMessage } from "../settings/nhf-rates/types";
import { dateTime } from "../list/types";
import { QsRow, gbp } from "./types";

type Tile = "all" | "todo" | "review" | "rework" | "done";
const TILES: { key: Tile; label: string; hint: string; icon: React.ReactNode; color: keyof typeof CARD_TONE }[] = [
  { key: "all", label: "All", hint: "Every survey sent to the QS", icon: <IconClipboardList size={22} />, color: "secondary" },
  { key: "todo", label: "To review", hint: "Submitted by the surveyor, waiting for the QS", icon: <IconInbox size={22} />, color: "warning" },
  { key: "review", label: "In review", hint: "The QS is pricing", icon: <IconProgress size={22} />, color: "primary" },
  { key: "rework", label: "Sent back", hint: "Sent back to the surveyor for rework", icon: <IconArrowBackUp size={22} />, color: "error" },
  { key: "done", label: "Completed", hint: "Review completed, prices locked", icon: <IconCircleCheck size={22} />, color: "success" },
];
const columnHelper = createColumnHelper<QsRow>();

// QS review: surveys submitted by the surveyors. Open one to price its works from NHF rates plus the project uplift.
const QsList: React.FC = () => {
  const router = useRouter();
  const [data, setData] = useState<QsRow[]>([]);
  const [counts, setCounts] = useState<Record<Tile, number>>({ all: 0, todo: 0, review: 0, rework: 0, done: 0 });
  const [tile, setTile] = useState<Tile>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const open = (id: number) => router.push(`/apps/surveys/qs/${id}`);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tile, page: String(pagination.pageIndex + 1), limit: String(pagination.pageSize), ...(search.trim() ? { search: search.trim() } : {}) });
      const res = await api.get(`survey-qs?${params}`);
      setData(res.data.data);
      setCounts(res.data.counts);
      setTotalRows(res.data.total);
      setPageCount(Math.ceil(res.data.total / pagination.pageSize));
    } catch (e) {
      toast.error(apiMessage(e, "Could not load the QS list."));
    }
    setLoading(false);
  };

  const columns = [
    columnHelper.accessor("reference", {
      header: "Reference",
      cell: ({ getValue }) => (
        <Typography className="f-14" fontWeight={700} noWrap>
          {getValue()}
        </Typography>
      ),
    }),
    columnHelper.accessor("title", {
      header: "Survey",
      cell: ({ row }) => (
        <Box sx={{ minWidth: 220 }}>
          <Typography className="f-14" fontWeight={600} color="primary">
            {row.original.title}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {row.original.address?.name ?? "–"} · {row.original.project?.name ?? ""}
          </Typography>
          {row.original.rework_notes && (
            <Typography variant="caption" color="error.main" display="block">
              Rework: {row.original.rework_notes}
            </Typography>
          )}
        </Box>
      ),
    }),
    columnHelper.display({
      id: "surveyor",
      header: "Surveyor",
      cell: ({ row }) => (row.original.surveyor ? <DriverName name={row.original.surveyor.name} /> : <Typography className="f-14">–</Typography>),
    }),
    columnHelper.accessor("submitted_at", {
      header: "Submitted",
      cell: ({ row }) => (
        <Typography className="f-14" noWrap>
          {row.original.submitted_at ? dateTime(row.original.submitted_at) : "–"}
        </Typography>
      ),
    }),
    columnHelper.display({
      id: "lines",
      header: "Reviewed",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <Stack spacing={0.25}>
            <Typography className="f-14" fontWeight={600}>
              {r.reviewed} / {r.lines}
            </Typography>
            {r.no_rate > 0 && <Typography variant="caption" color="warning.dark">{r.no_rate} without a rate</Typography>}
          </Stack>
        );
      },
    }),
    columnHelper.accessor("total", {
      header: "Total ex VAT",
      cell: ({ getValue }) => (
        <Typography className="f-14" fontWeight={700}>
          {gbp(getValue())}
        </Typography>
      ),
    }),
    columnHelper.accessor("status_label", {
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        return row.original.rework_notes && s === "in_progress" ? (
          <Chip size="small" color="error" variant="outlined" label="Rework requested" />
        ) : (
          <Chip size="small" color={s === "submitted" ? "warning" : s === "qs_review" ? "primary" : s === "completed" ? "success" : "default"} label={row.original.status_label} />
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button size="small" sx={{ whiteSpace: "nowrap" }} variant={row.original.status === "submitted" ? "contained" : "outlined"} endIcon={<IconChevronRight size={16} />} onClick={() => open(row.original.id)}>
          {row.original.status === "submitted" ? "Start review" : "Open"}
        </Button>
      ),
    }),
  ];

  const { table, pagination, setPageCount, totalRows, setTotalRows } = useServerTable({
    data,
    columns,
    fetchData: fetchRows,
    debounceDependencies: [search, tile],
    enableSorting: false,
  });

  return (
    <Box>
      <SurveyNav value="qs" />
      <Box sx={{ px: 2, pt: 2 }}>
        <Typography variant="h5">QS review</Typography>
        <Typography variant="body2" color="textSecondary">
          Surveys submitted by the surveyors. Open one to check the works and price them from NHF rates plus the project uplift.
        </Typography>
      </Box>
      <Grid container spacing={2} sx={{ px: 2, pt: 2, pb: 1 }}>
        {TILES.map((t) => (
          <Grid key={t.key} size={{ xs: 6, sm: 4, md: "grow" }}>
            <StatCard icon={t.icon} tone={CARD_TONE[t.color]} value={counts[t.key] ?? 0} label={t.label} hint={t.hint} active={tile === t.key} title={tile === t.key && t.key !== "all" ? "Show all" : t.hint} onClick={() => setTile(tile === t.key ? "all" : t.key)} />
          </Grid>
        ))}
      </Grid>
      <Stack direction="row" mx={2} my={1.5}>
        <TextField
          size="small"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: { sm: 300 } }}
          slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconSearch size={16} /></InputAdornment> } }}
        />
      </Stack>
      <Divider />
      {!loading && !data.length ? (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Box component="img" src="/images/no-data.png" alt="" sx={{ width: 120, opacity: 0.8, mb: 1 }} />
          <Typography color="textSecondary">
            {search.trim() ? "No survey matches the search." : tile === "all" ? "No survey has been submitted to the QS yet." : tile === "todo" ? "No survey is waiting for the QS." : "Nothing here."}
          </Typography>
        </Box>
      ) : (
        <InventoryTable table={table} loading={loading} rowCount={data.length} onRowClick={(row: QsRow) => open(row.id)} />
      )}
      <Divider />
      <TablePaginationFooter table={table} totalRows={totalRows} />
    </Box>
  );
};

export default QsList;
