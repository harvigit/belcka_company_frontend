"use client";

import React, { useCallback, useState } from "react";
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
import { IconEdit, IconEye, IconFileImport, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import InventoryTable from "@/app/components/apps/inventory-new/shared/InventoryTable";
import ConfirmDialog from "@/app/components/apps/inventory-new/shared/ConfirmDialog";
import { apiMessage, shortDate } from "../nhf-rates/types";
import { NameDrawer } from "./drawers";
import ImportTemplateDialog from "./ImportTemplateDialog";
import TemplateDetail from "./TemplateDetail";
import { TemplateRow, plural } from "./types";

const columnHelper = createColumnHelper<TemplateRow>();
const num = (v: number) => <Typography className="f-14">{v.toLocaleString("en-GB")}</Typography>;

// Survey › Settings › Templates: the list; a template opens in the same place.
const Templates: React.FC = () => {
  const [openId, setOpenId] = useState<number | null>(null);
  const [all, setAll] = useState<TemplateRow[]>([]);
  const [data, setData] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [nameDlg, setNameDlg] = useState<{ row: TemplateRow | null } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TemplateRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get("survey-templates");
      const rows: TemplateRow[] = res.data.data;
      setAll(rows);
      const q = searchTerm.trim().toLowerCase();
      const list = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
      const start = pagination.pageIndex * pagination.pageSize;
      setData(list.slice(start, start + pagination.pageSize));
      setTotalRows(list.length);
      setPageCount(Math.ceil(list.length / pagination.pageSize));
    } catch (e) {
      toast.error(apiMessage(e, "Could not load the templates."));
    }
    setLoading(false);
  };

  const columns = [
    columnHelper.accessor("name", {
      header: "Template",
      cell: ({ row }) => (
        <Box sx={{ cursor: "pointer" }} onClick={() => setOpenId(row.original.id)}>
          <Typography className="f-14" fontWeight={600} color="primary">{row.original.name}</Typography>
          <Typography variant="caption" color="textSecondary">
            {row.original.source === "import" ? `Imported${row.original.source_file ? ` · ${row.original.source_file}` : ""}` : "Made by hand"}
          </Typography>
        </Box>
      ),
    }),
    columnHelper.accessor("rooms", { header: "Rooms", cell: ({ getValue }) => num(getValue()) }),
    columnHelper.accessor("groups", { header: "Groups", cell: ({ getValue }) => num(getValue()) }),
    columnHelper.accessor("elements", { header: "Elements", cell: ({ getValue }) => num(getValue()) }),
    columnHelper.display({
      id: "nhf",
      header: "NHF check",
      cell: ({ row }) =>
        row.original.not_in_nhf ? (
          <Tooltip title="Elements whose code is not in any NHF sheet (no price yet)">
            <Chip size="small" color="warning" variant="outlined" label={`${row.original.not_in_nhf} not in NHF`} />
          </Tooltip>
        ) : row.original.elements ? (
          <Chip size="small" color="success" variant="outlined" label="All priced" />
        ) : (
          <Typography className="f-14">-</Typography>
        ),
    }),
    columnHelper.accessor("updated_at", { header: "Updated", cell: ({ getValue }) => <Typography className="f-14">{shortDate(getValue())}</Typography> }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Open"><IconButton color="primary" onClick={() => setOpenId(row.original.id)}><IconEye size={18} /></IconButton></Tooltip>
          <Tooltip title="Rename"><IconButton color="primary" onClick={() => setNameDlg({ row: row.original })}><IconEdit size={18} /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton color="error" onClick={() => setToDelete(row.original)}><IconTrash size={18} /></IconButton></Tooltip>
        </Stack>
      ),
    }),
  ];

  const { table, pagination, setPageCount, totalRows, setTotalRows } = useServerTable({
    data,
    columns,
    fetchData: fetchTemplates,
    debounceDependencies: [searchTerm, openId],
    enableSorting: false,
  });

  const saveName = async (name: string): Promise<string | null> => {
    try {
      if (nameDlg?.row) {
        const res = await api.put(`survey-templates/${nameDlg.row.id}`, { name });
        toast.success(res.data.message);
        setNameDlg(null);
        fetchTemplates();
      } else {
        const res = await api.post("survey-templates", { name });
        toast.success(res.data.message);
        setNameDlg(null);
        setOpenId(res.data.data.id);
      }
      return null;
    } catch (e) {
      return apiMessage(e, "Could not save.");
    }
  };

  const doDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await api.delete(`survey-templates/${toDelete.id}`);
      toast.success(res.data.message);
      setToDelete(null);
      fetchTemplates();
    } catch (e) {
      toast.error(apiMessage(e, "Could not delete the template."));
    }
    setDeleting(false);
  };

  const back = useCallback(() => setOpenId(null), []);
  if (openId) return <TemplateDetail id={openId} onBack={back} />;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack mx={2} mb={2} justifyContent="space-between" direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2 }}>
        <Grid display="flex" gap={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconSearch size={16} /></InputAdornment> } }}
          />
        </Grid>
        <Stack direction="row" alignItems="center" justifyContent="end" gap={1}>
          <Button variant="outlined" startIcon={<IconFileImport width={18} />} onClick={() => setImportOpen(true)}>
            Import from Excel
          </Button>
          <Button variant="contained" startIcon={<IconPlus width={18} />} onClick={() => setNameDlg({ row: null })}>
            Add template
          </Button>
        </Stack>
      </Stack>
      <Divider />
      <InventoryTable table={table} loading={loading} rowCount={data.length} />
      <Divider />
      <TablePaginationFooter table={table} totalRows={totalRows} />

      <NameDrawer
        open={!!nameDlg}
        title={nameDlg?.row ? "Rename template" : "Add template"}
        label="Template name"
        placeholder="e.g. Camden Voids SOW"
        hint={nameDlg?.row ? undefined : "Then add the rooms, groups and elements, or import them from Excel."}
        initial={nameDlg?.row?.name ?? ""}
        submitLabel={nameDlg?.row ? "Save" : "Add template"}
        onClose={() => setNameDlg(null)}
        onSave={saveName}
      />
      <ImportTemplateDialog
        open={importOpen}
        templateNames={all.map((t) => t.name)}
        onClose={() => setImportOpen(false)}
        onImported={(id) => {
          setImportOpen(false);
          setOpenId(id);
        }}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete template"
        confirmLabel="Delete"
        confirmColor="error"
        busy={deleting}
        onClose={() => setToDelete(null)}
        onConfirm={doDelete}
        message={toDelete ? <>Delete the template <b>{toDelete.name}</b> with {plural(toDelete.rooms, "room")} and {plural(toDelete.elements, "element")}?</> : ""}
      />
    </Box>
  );
};

export default Templates;
