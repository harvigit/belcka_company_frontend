"use client";

import React, { useCallback, useEffect, useState } from "react";
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
import { createColumnHelper } from "@tanstack/react-table";
import {
  IconCircleCheck,
  IconClipboardList,
  IconEdit,
  IconEye,
  IconFileText,
  IconPencil,
  IconPlus,
  IconProgress,
  IconSearch,
  IconSend,
  IconSettings,
  IconTrash,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import api from "@/utils/axios";
import { User } from "next-auth";
import { useServerTable } from "@/hooks/useServerTable";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import InventoryTable from "@/app/components/apps/inventory-new/shared/InventoryTable";
import ColumnVisibilityButton from "@/app/components/apps/inventory-new/shared/ColumnVisibilityButton";
import FilterButton from "@/app/components/apps/inventory-new/shared/FilterButton";
import ConfirmDialog from "@/app/components/apps/inventory-new/shared/ConfirmDialog";
import { CARD_TONE, StatCard } from "@/app/components/apps/vehicles/detail/common";
import { DriverName } from "@/app/components/apps/vehicles/shared";
import SurveySettings from "../settings";
import SurveyNav from "../nav";
import { apiMessage } from "../settings/nhf-rates/types";
import SurveyForm from "./SurveyForm";
import { AssignDialog } from "./dialogs";
import { STATUS_META, SurveyOptions, SurveyRow, longDate } from "./types";

const columnHelper = createColumnHelper<SurveyRow>();
type Tile = "all" | "draft" | "assigned" | "in_progress" | "review" | "completed";
const TILES: { key: Tile; label: string; icon: React.ReactNode; color: keyof typeof CARD_TONE; hint: string }[] = [
  { key: "all", label: "All surveys", icon: <IconClipboardList size={22} />, color: "primary", hint: "Every survey" },
  { key: "draft", label: "Draft", icon: <IconPencil size={22} />, color: "secondary", hint: "Created, no surveyor yet" },
  { key: "assigned", label: "Assigned", icon: <IconUserCheck size={22} />, color: "info", hint: "Surveyor assigned, not started" },
  { key: "in_progress", label: "In progress", icon: <IconProgress size={22} />, color: "warning", hint: "Surveyor is on site" },
  { key: "review", label: "Submitted / QS", icon: <IconSend size={22} />, color: "error", hint: "Sent to the QS, or the QS is pricing" },
  { key: "completed", label: "Completed", icon: <IconCircleCheck size={22} />, color: "success", hint: "Approved and finished" },
];
const text = (v?: string | null) => <Typography className="f-14">{v || "-"}</Typography>;

// Surveys (Admin): status tiles, then the list with search, filters, columns and the ⋮ menu.
const SurveyList: React.FC = () => {
  const session = useSession();
  const router = useRouter();
  const openSurvey = (id: number) => router.push(`/apps/surveys/view/${id}`);
  const user = session.data?.user as User & { company_id?: number | null };
  const { columnVisibility, onColumnVisibilityChange } = usePersistentColumnVisibility({
    storageKey: `cv_${user?.company_id}_${user?.id}_surveys_list`,
    enabled: !!user?.id,
    defaultVisibility: {},
    alwaysVisibleColumns: ["reference", "actions"],
  });

  const [data, setData] = useState<SurveyRow[]>([]);
  const [counts, setCounts] = useState<Record<Tile, number>>({ all: 0, draft: 0, assigned: 0, in_progress: 0, review: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [tile, setTile] = useState<Tile>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<{ project_id: string; surveyor_id: string }>({ project_id: "", surveyor_id: "" });
  const [options, setOptions] = useState<SurveyOptions | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [formFor, setFormFor] = useState<{ id: number | null } | null>(null);
  const [assignFor, setAssignFor] = useState<SurveyRow | null>(null);
  const [toDelete, setToDelete] = useState<SurveyRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadOptions = useCallback(async () => {
    try {
      const res = await api.get("surveys/options");
      setOptions(res.data.data);
    } catch (e) {
      toast.error(apiMessage(e, "Could not load the survey options."));
    }
  }, []);
  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tile,
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
        ...(filters.project_id ? { project_id: filters.project_id } : {}),
        ...(filters.surveyor_id ? { surveyor_id: filters.surveyor_id } : {}),
      });
      const res = await api.get(`surveys?${params}`);
      setData(res.data.data);
      setCounts(res.data.counts);
      setTotalRows(res.data.total);
      setPageCount(Math.ceil(res.data.total / pagination.pageSize));
    } catch (e) {
      toast.error(apiMessage(e, "Could not load the surveys."));
    }
    setLoading(false);
  };

  const columns = [
    columnHelper.accessor("reference", {
      header: "Reference",
      cell: ({ row }) => (
        <Typography className="f-14" fontWeight={700} noWrap>
          {row.original.reference}
        </Typography>
      ),
    }),
    columnHelper.accessor("title", {
      header: "Survey",
      cell: ({ row }) => (
        <Box sx={{ cursor: "pointer", minWidth: 220 }} onClick={() => openSurvey(row.original.id)}>
          <Typography className="f-14" fontWeight={600} color="primary">
            {row.original.title}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {row.original.address?.name ?? "–"} · {row.original.project?.name ?? ""}
          </Typography>
        </Box>
      ),
    }),
    columnHelper.display({
      id: "surveyor",
      header: "Surveyor",
      cell: ({ row }) =>
        row.original.surveyor ? (
          <DriverName name={row.original.surveyor.name} image={row.original.surveyor.image} />
        ) : row.original.editable ? (
          <Button size="small" variant="outlined" startIcon={<IconUsers size={14} />} onClick={() => setAssignFor(row.original)}>
            Assign
          </Button>
        ) : (
          text("-")
        ),
    }),
    columnHelper.accessor("survey_date", {
      header: "Survey date",
      cell: ({ getValue }) => (
        <Typography className="f-14" noWrap>
          {longDate(getValue())}
        </Typography>
      ),
    }),
    columnHelper.accessor("template_name", { header: "Template", cell: ({ getValue }) => text(getValue()) }),
    columnHelper.display({
      id: "property_detail",
      header: "Property detail",
      cell: ({ row }) =>
        row.original.has_property_detail ? (
          <Tooltip title={row.original.pd_shared ? "Shared with the surveyor" : "Not shared with the surveyor"}>
            <Chip size="small" variant="outlined" icon={<IconFileText size={14} />} label={row.original.pd_shared ? "Shared" : "Admin only"} />
          </Tooltip>
        ) : (
          text("-")
        ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => {
        const m = STATUS_META[getValue()];
        return (
          <Tooltip title={m.hint}>
            <Chip size="small" color={m.color} label={m.label} />
          </Tooltip>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const ed = row.original.editable;
        return (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="View">
              <IconButton color="primary" onClick={() => openSurvey(row.original.id)}>
                <IconEye size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title={ed ? "Edit" : "Started surveys cannot be edited"}>
              <span>
                <IconButton color="primary" disabled={!ed} onClick={() => setFormFor({ id: row.original.id })}>
                  <IconEdit size={18} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={ed ? "Delete" : "Started surveys cannot be deleted"}>
              <span>
                <IconButton color="error" disabled={!ed} onClick={() => setToDelete(row.original)}>
                  <IconTrash size={18} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        );
      },
    }),
  ];

  const { table, pagination, setPageCount, totalRows, setTotalRows } = useServerTable({
    data,
    columns,
    fetchData: fetchSurveys,
    debounceDependencies: [searchTerm, filters, tile],
    state: { columnVisibility },
    onColumnVisibilityChange,
    enableSorting: false,
  });

  const refresh = () => {
    fetchSurveys();
    loadOptions();
  };

  const doDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await api.delete(`surveys/${toDelete.id}`);
      toast.success(res.data.message);
      setToDelete(null);
      refresh();
    } catch (e) {
      toast.error(apiMessage(e, "Could not delete the survey."));
    }
    setDeleting(false);
  };

  const hasFilters = !!(searchTerm.trim() || filters.project_id || filters.surveyor_id || tile !== "all");

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <SurveyNav value="surveys" />
      <Stack direction="row" alignItems="center" sx={{ px: 2, pt: 2 }}>
        <Box>
          <Typography variant="h5">Surveys</Typography>
          <Typography variant="body2" color="textSecondary">
            Create a survey for a project address, choose its template and property detail, and assign a surveyor.
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={2} sx={{ px: 2, pt: 2, pb: 1 }}>
        {TILES.map((t) => (
          <Grid key={t.key} size={{ xs: 6, sm: 4, lg: 2 }}>
            <StatCard
              icon={t.icon}
              tone={CARD_TONE[t.color]}
              value={counts[t.key] ?? 0}
              label={t.label}
              hint={t.hint}
              active={tile === t.key}
              title={tile === t.key && t.key !== "all" ? "Show all surveys" : `Show: ${t.label}`}
              onClick={() => setTile(tile === t.key ? "all" : t.key)}
            />
          </Grid>
        ))}
      </Grid>

      <Stack mx={2} my={1.5} justifyContent="space-between" direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2 }}>
        <Grid display="flex" gap={1} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: { sm: 280 } }}
            slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconSearch size={16} /></InputAdornment> } }}
          />
          <FilterButton
            value={filters}
            onApply={(v) => setFilters({ project_id: v.project_id ?? "", surveyor_id: v.surveyor_id ?? "" })}
            fields={[
              { key: "project_id", label: "Project", searchable: true, options: (options?.projects ?? []).map((p) => ({ value: String(p.id), label: p.name })) },
              { key: "surveyor_id", label: "Surveyor", avatar: true, options: (options?.surveyors ?? []).map((u) => ({ value: String(u.id), label: u.name, image: u.image })) },
            ]}
          />
        </Grid>
        <Stack direction="row" alignItems="center" justifyContent="end" gap={1}>
          <Button variant="contained" startIcon={<IconPlus width={18} />} onClick={() => setFormFor({ id: null })}>
            Create survey
          </Button>
          <ColumnVisibilityButton table={table} />
          <Tooltip title="Settings: templates and NHF rates">
            <IconButton aria-label="Settings" onClick={() => setSettingsOpen(true)}>
              <IconSettings size={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      <Divider />
      {!loading && !data.length ? (
        <Box sx={{ py: 6, px: 2, textAlign: "center" }}>
          <Box component="img" src="/images/no-data.png" alt="" sx={{ width: 120, opacity: 0.8, mb: 1 }} />
          <Typography color="textSecondary">
            {hasFilters ? "No survey matches these filters." : "No surveys yet. Use Create survey above to add the first one."}
          </Typography>
        </Box>
      ) : (
        <InventoryTable table={table} loading={loading} rowCount={data.length} onRowClick={(row: SurveyRow) => openSurvey(row.id)} />
      )}
      <Divider />
      <TablePaginationFooter table={table} totalRows={totalRows} />

      <SurveyForm
        open={!!formFor}
        surveyId={formFor?.id ?? null}
        options={options}
        onClose={() => setFormFor(null)}
        onSaved={() => {
          setFormFor(null);
          refresh();
        }}
      />
      <AssignDialog
        survey={assignFor}
        surveyors={options?.surveyors ?? []}
        onClose={() => setAssignFor(null)}
        onAssigned={() => {
          setAssignFor(null);
          refresh();
        }}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete survey"
        confirmLabel="Delete"
        confirmColor="error"
        busy={deleting}
        onClose={() => setToDelete(null)}
        onConfirm={doDelete}
        message={
          toDelete ? (
            <>
              Delete <b>{toDelete.reference}</b> · {toDelete.title}?
            </>
          ) : (
            ""
          )
        }
      />
      <SurveySettings
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          loadOptions();
        }}
      />
    </Box>
  );
};

export default SurveyList;
