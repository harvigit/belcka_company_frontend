"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import {
  IconClock,
  IconDotsVertical,
  IconEdit,
  IconFileImport,
  IconInfoCircle,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import InventoryTable from "@/app/components/apps/inventory-new/shared/InventoryTable";
import ColumnVisibilityButton from "@/app/components/apps/inventory-new/shared/ColumnVisibilityButton";
import FilterButton from "@/app/components/apps/inventory-new/shared/FilterButton";
import ConfirmDialog from "@/app/components/apps/inventory-new/shared/ConfirmDialog";
import ImportDialog from "./ImportDialog";
import { CodeDrawer, SheetDrawer, VersionsDialog } from "./Dialogs";
import { NhfCode, NhfSheet, apiMessage, money, shortDate, uomLabel } from "./types";

const columnHelper = createColumnHelper<NhfCode>();
const SHEET_KEY = "belcka.nhfRates.sheet";
const readSheet = () => {
  try {
    return Number(localStorage.getItem(SHEET_KEY)) || null;
  } catch {
    return null;
  }
};
const text = (v?: string | null) => <Typography className="f-14">{v || "-"}</Typography>;

// Survey › Settings › NHF rates: one list of codes per uploaded NHF sheet, with versions.
// Same layout as the other lists: search + filter, columns (eye) and ⋮ menu, table, pagination footer.
const NhfRates: React.FC = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const { columnVisibility, onColumnVisibilityChange } = usePersistentColumnVisibility({
    storageKey: `cv_${user?.company_id}_${user?.id}_survey_nhf_rates`,
    enabled: !!user?.id,
    defaultVisibility: { long_description: false, element_2: false, element_3: false },
    alwaysVisibleColumns: ["code", "actions"],
  });

  const [sheets, setSheets] = useState<NhfSheet[] | null>(null);
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [data, setData] = useState<NhfCode[]>([]);
  const [elements, setElements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<{ element_1: string }>({ element_1: "" });
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  // dialogs / drawers
  const [importFor, setImportFor] = useState<NhfSheet | null | undefined>(undefined);
  const [codeDrawer, setCodeDrawer] = useState<{ code: NhfCode | null } | null>(null);
  const [sheetDrawer, setSheetDrawer] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ kind: "sheet" } | { kind: "code"; code: NhfCode } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sheet = useMemo(() => sheets?.find((s) => s.id === sheetId) ?? null, [sheets, sheetId]);

  const loadSheets = useCallback(async (select?: number | null) => {
    try {
      const res = await api.get("nhf-rates/sheets");
      const list: NhfSheet[] = res.data.data;
      setSheets(list);
      setSheetId((cur) => [select, cur, readSheet()].find((id) => id && list.some((s) => s.id === id)) ?? list[0]?.id ?? null);
    } catch (e) {
      toast.error(apiMessage(e, "Could not load the NHF sheets."));
      setSheets([]);
    }
  }, []);
  useEffect(() => {
    loadSheets();
  }, [loadSheets]);
  useEffect(() => {
    try {
      if (sheetId) localStorage.setItem(SHEET_KEY, String(sheetId));
    } catch {
      /* not remembered */
    }
  }, [sheetId]);

  const fetchCodes = async () => {
    if (!sheetId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pagination.pageIndex + 1), limit: String(pagination.pageSize) });
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (filters.element_1) params.set("element_1", filters.element_1);
      const res = await api.get(`nhf-rates/sheets/${sheetId}/codes?${params.toString()}`);
      setData(res.data.data);
      setElements(res.data.elements);
      setTotalRows(res.data.total);
      setPageCount(Math.ceil(res.data.total / pagination.pageSize));
    } catch (e) {
      toast.error(apiMessage(e, "Could not load the NHF codes."));
    }
    setLoading(false);
  };

  const columns = [
    columnHelper.accessor("code", {
      header: "Code",
      meta: { label: "Code" },
      cell: ({ row }) => (
        <Box>
          <Typography className="f-14" fontWeight={600}>{row.original.code}</Typography>
          {row.original.source !== "import" && (
            <Chip size="small" color="secondary" variant="outlined" label={row.original.source_note || "By hand"} sx={{ mt: 0.5 }} />
          )}
        </Box>
      ),
    }),
    columnHelper.accessor("short_name", { header: "Short name", meta: { label: "Short name" }, cell: ({ getValue }) => text(getValue()) }),
    columnHelper.accessor("long_description", {
      header: "Long description",
      meta: { label: "Long description" },
      cell: ({ getValue }) =>
        getValue() ? (
          <Tooltip title={getValue()} placement="top-start">
            <Typography className="f-14" color="textSecondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: 420 }}>
              {getValue()}
            </Typography>
          </Tooltip>
        ) : (
          text(null)
        ),
    }),
    columnHelper.accessor("element_1", { header: "Element 1", meta: { label: "Element 1" }, cell: ({ getValue }) => text(getValue()) }),
    columnHelper.accessor("element_2", { header: "Element 2", meta: { label: "Element 2" }, cell: ({ getValue }) => text(getValue()) }),
    columnHelper.accessor("element_3", { header: "Element 3", meta: { label: "Element 3" }, cell: ({ getValue }) => text(getValue()) }),
    columnHelper.accessor("uom", { header: "UOM", meta: { label: "UOM" }, cell: ({ getValue }) => text(uomLabel(getValue())) }),
    columnHelper.accessor("rate", {
      header: "Rate",
      meta: { label: "Rate" },
      cell: ({ getValue }) => <Typography className="f-14" fontWeight={600}>{money(getValue())}</Typography>,
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit">
            <IconButton color="primary" onClick={() => setCodeDrawer({ code: row.original })}>
              <IconEdit size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="error" onClick={() => setToDelete({ kind: "code", code: row.original })}>
              <IconTrash size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    }),
  ];

  const { table, pagination, setPageCount, totalRows, setTotalRows } = useServerTable({
    data,
    columns,
    fetchData: fetchCodes,
    debounceDependencies: [searchTerm, filters, sheetId],
    state: { columnVisibility },
    onColumnVisibilityChange,
    enableSorting: false,
  });

  const refresh = async (select?: number) => {
    await loadSheets(select);
    await fetchCodes();
  };

  const doDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      if (toDelete.kind === "sheet" && sheet) {
        const res = await api.delete(`nhf-rates/sheets/${sheet.id}`);
        toast.success(res.data.message);
        setSheetId(null);
        await loadSheets(null);
      } else if (toDelete.kind === "code") {
        const res = await api.delete(`nhf-rates/codes/${toDelete.code.id}`);
        toast.success(res.data.message);
        await refresh();
      }
      setToDelete(null);
    } catch (e) {
      toast.error(apiMessage(e, "Could not delete."));
    }
    setDeleting(false);
  };

  const menuItem = (icon: React.ReactNode, label: string, onClick: () => void, color?: string) => (
    <MenuItem
      onClick={() => {
        setMenuAnchor(null);
        onClick();
      }}
      sx={color ? { color } : undefined}
    >
      <ListItemIcon sx={color ? { color } : undefined}>{icon}</ListItemIcon>
      {label}
    </MenuItem>
  );

  if (sheets === null) {
    return (
      <Box textAlign="center" py={6}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Sheet bar */}
      <Stack mx={2} mb={1.5} direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} gap={1.5}>
        {sheets.length > 0 && sheet && (
          <>
            <CustomSelect
              size="small"
              value={sheet.id}
              onChange={(e: any) => {
                setSheetId(Number(e.target.value));
                setSearchTerm("");
                setFilters({ element_1: "" });
              }}
              sx={{ minWidth: 260 }}
            >
              {sheets.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} · v{s.current_version?.version ?? 0}
                </MenuItem>
              ))}
            </CustomSelect>
            <Stack direction="row" flexWrap="wrap" columnGap={2} rowGap={0.5} alignItems="center">
              <Typography className="f-14" color="textSecondary">
                <b>{sheet.codes_count.toLocaleString("en-GB")}</b> codes
              </Typography>
              <Typography className="f-14" color="textSecondary">
                Effective <b>{shortDate(sheet.effective_date)}</b>
              </Typography>
              <Typography className="f-14" color="textSecondary">
                Version <b>v{sheet.current_version?.version ?? 0}</b>
                {sheet.current_version?.note ? ` · ${sheet.current_version.note}` : ""}
              </Typography>
              <Typography className="f-14" color="textSecondary">
                Used by <b>{sheet.used_by_template_lines}</b> template lines
              </Typography>
            </Stack>
          </>
        )}
        <Stack direction="row" gap={1} ml={{ md: "auto" }} alignItems="center">
          <Button color="inherit" startIcon={<IconInfoCircle size={18} />} onClick={() => setShowNotes((x) => !x)} sx={{ color: "text.secondary" }}>
            How it works
          </Button>
          <Button variant="contained" startIcon={<IconUpload width={18} />} onClick={() => setImportFor(null)}>
            Upload NHF sheet
          </Button>
        </Stack>
      </Stack>

      <Collapse in={showNotes}>
        <Alert severity="info" icon={<IconInfoCircle size={20} />} onClose={() => setShowNotes(false)} sx={{ mx: 2, mb: 2 }}>
          <Box component="ul" sx={{ m: 0, pl: 2, "& li": { mb: 0.5 } }}>
            <li><b>One list per uploaded NHF sheet.</b> The name is the sheet tab name in the Excel (e.g. “NHF 7.2”); you can rename it.</li>
            <li><b>The code is the link.</b> Templates keep only the code; the description, UOM and rate are read from here, so a change here shows in every template at once.</li>
            <li><b>Base rate only.</b> The sheet’s UPLIFT and PRICE columns are not imported. Uplift is set on each project (Project › Settings).</li>
            <li><b>Versions, nothing is lost.</b> Uploading the same sheet again makes a new version (v1 → v2). Old versions stay under ⋮ › Versions and can be restored.</li>
            <li><b>Two sheets, same code?</b> The sheet with the later effective date is used. Codes without a rate in the file (e.g. DCK105) are skipped; add them with ⋮ › Add element.</li>
          </Box>
        </Alert>
      </Collapse>

      {!sheets.length ? (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 6, gap: 1 }}>
          <Image src="/images/no-data.png" alt="No NHF sheet" width={160} height={160} />
          <Typography variant="h6">No NHF sheet uploaded yet</Typography>
          <Typography className="f-14" color="textSecondary">Upload the NHF Excel. Each sheet you upload shows here under its tab name.</Typography>
          <Button variant="contained" startIcon={<IconUpload width={18} />} onClick={() => setImportFor(null)} sx={{ mt: 1 }}>
            Upload NHF sheet
          </Button>
        </Box>
      ) : (
        <>
          <Divider />
          {/* Toolbar: same as the other lists */}
          <Stack mx={2} my={2} justifyContent="space-between" direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2 }}>
            <Grid display="flex" gap={1} alignItems="center">
              <TextField
                size="small"
                variant="outlined"
                placeholder="Search code or description..."
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
              {elements.length > 1 && (
                <FilterButton
                  value={filters}
                  onApply={(v) => setFilters({ element_1: v.element_1 ?? "" })}
                  fields={[{ key: "element_1", label: "Element 1", options: elements.map((x) => ({ value: x, label: x })) }]}
                />
              )}
            </Grid>
            <Stack direction="row" alignItems="center" justifyContent="end">
              <ColumnVisibilityButton table={table} />
              <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
                <IconDotsVertical width={18} />
              </IconButton>
              <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
                {menuItem(<IconPlus width={18} />, "Add element", () => setCodeDrawer({ code: null }))}
                {menuItem(<IconFileImport width={18} />, "Import again", () => setImportFor(sheet))}
                {menuItem(<IconClock width={18} />, `Versions${sheet && sheet.versions_count > 1 ? ` (${sheet.versions_count})` : ""}`, () => setVersionsOpen(true))}
                {menuItem(<IconEdit width={18} />, "Edit name and date", () => setSheetDrawer(true))}
                <Divider />
                {menuItem(<IconTrash width={18} />, "Delete this sheet", () => setToDelete({ kind: "sheet" }), "#e53935")}
              </Menu>
            </Stack>
          </Stack>
          <Divider />
          <InventoryTable table={table} loading={loading} rowCount={data.length} />
          <Divider />
          <TablePaginationFooter table={table} totalRows={totalRows} />
        </>
      )}

      <ImportDialog
        open={importFor !== undefined}
        target={importFor ?? null}
        onClose={() => setImportFor(undefined)}
        onImported={async (id) => {
          setImportFor(undefined);
          setSearchTerm("");
          setFilters({ element_1: "" });
          await refresh(id);
        }}
      />
      <CodeDrawer
        open={!!codeDrawer}
        sheet={sheet}
        code={codeDrawer?.code ?? null}
        onClose={() => setCodeDrawer(null)}
        onSaved={async () => {
          setCodeDrawer(null);
          await refresh();
        }}
      />
      <SheetDrawer
        open={sheetDrawer}
        sheet={sheet}
        onClose={() => setSheetDrawer(false)}
        onSaved={async () => {
          setSheetDrawer(false);
          await loadSheets();
        }}
      />
      <VersionsDialog open={versionsOpen} sheet={sheet} onClose={() => setVersionsOpen(false)} onRestored={() => refresh()} />
      <ConfirmDialog
        open={!!toDelete}
        title={toDelete?.kind === "sheet" ? "Delete NHF sheet" : "Delete element"}
        confirmLabel="Delete"
        confirmColor="error"
        busy={deleting}
        onClose={() => setToDelete(null)}
        onConfirm={doDelete}
        message={
          toDelete?.kind === "sheet" ? (
            <>
              Delete <b>{sheet?.name}</b> ({sheet?.codes_count.toLocaleString("en-GB")} codes)? Its versions are deleted too.
            </>
          ) : toDelete?.kind === "code" ? (
            <>
              Delete element <b>{toDelete.code.code}</b> from {sheet?.name}?
            </>
          ) : (
            ""
          )
        }
      >
        {toDelete?.kind === "sheet" && !!sheet?.used_by_template_lines && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {sheet.used_by_template_lines} template lines read their rate from this sheet. They will show <b>no rate</b> unless another sheet has the same codes.
          </Alert>
        )}
      </ConfirmDialog>
    </Box>
  );
};

export default NhfRates;
