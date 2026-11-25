"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { IconEdit, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import Alert from "@/app/components/apps/surveys/shared/SurveyAlert";
import ConfirmDialog from "@/app/components/apps/inventory-new/shared/ConfirmDialog";
import FormDrawer from "@/app/components/apps/inventory-new/shared/FormDrawer";
import FormField from "@/app/components/apps/inventory-new/shared/FormField";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { loadUnits } from "@/app/components/apps/surveys/shared/units";
import { apiMessage } from "../nhf-rates/types";

type Usage = { nhf_codes: number; nhf_old_versions: number; template_elements: number; skipped_rows: number; surveys: number };
type UnitRow = { id: number; code: string; label: string; aliases: string; is_default: boolean; used: Usage; used_total: number; used_text: string };
const emptyForm = { code: "", label: "", aliases: "", is_default: false };

// Survey settings › Units (UOM): the units used on templates, NHF codes and in the surveyor app.
const Units: React.FC = () => {
  const [rows, setRows] = useState<UnitRow[] | null>(null);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<UnitRow | "new" | null>(null);
  const [f, setF] = useState(emptyForm);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<UnitRow | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("survey-units");
      setRows(res.data.data);
    } catch (e) {
      toast.error(apiMessage(e, "Could not load the units."));
      setRows([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const open = (row: UnitRow | "new") => {
    setErr({});
    setF(row === "new" ? emptyForm : { code: row.code, label: row.label, aliases: row.aliases, is_default: row.is_default });
    setEdit(row);
  };
  const set = (k: keyof typeof emptyForm, v: string | boolean) => {
    setF((x) => ({ ...x, [k]: v }));
    setErr((x) => ({ ...x, [k]: "" }));
  };
  const after = async (message: string) => {
    toast.success(message);
    await Promise.all([load(), loadUnits(true)]); // dropdowns everywhere get the new list
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.code.trim()) er.code = "Enter a code";
    else if (!/^[a-z0-9²³._-]+$/i.test(f.code.trim())) er.code = "Letters, numbers, ² ³ . - _ only (no spaces)";
    if (!f.label.trim()) er.label = "Enter a label";
    setErr(er);
    if (Object.keys(er).length || !edit) return;
    setBusy(true);
    try {
      const body = { code: f.code.trim(), label: f.label.trim(), aliases: f.aliases, is_default: f.is_default };
      const res = edit === "new" ? await api.post("survey-units", body) : await api.put(`survey-units/${edit.id}`, body);
      setEdit(null);
      await after(res.data.message);
    } catch (x) {
      const m = apiMessage(x, "Could not save the unit.");
      if (/code/i.test(m) && !/label/i.test(m)) setErr({ code: m });
      else if (/default/i.test(m)) setErr({ is_default: m });
      else setErr({ label: m });
    }
    setBusy(false);
  };

  const doDelete = async () => {
    if (!del) return;
    setBusy(true);
    try {
      const res = await api.delete(`survey-units/${del.id}`);
      setDel(null);
      await after(res.data.message);
    } catch (x) {
      toast.error(apiMessage(x, "Could not delete the unit."));
      setDel(null);
      await load();
    }
    setBusy(false);
  };

  const query = q.trim().toLowerCase();
  const shown = (rows ?? []).filter((r) => !query || [r.code, r.label, r.aliases].some((x) => x.toLowerCase().includes(query)));
  const editing = edit && edit !== "new" ? edit : null;
  const codeLocked = !!editing && editing.used_total > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Stack mx={2} mb={2} direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
        <TextField
          size="small"
          placeholder="Search units..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ minWidth: { sm: 280 } }}
          slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconSearch size={16} /></InputAdornment> } }}
        />
        <Button variant="contained" startIcon={<IconPlus width={18} />} onClick={() => open("new")}>Add unit</Button>
      </Stack>
      <Alert severity="info" sx={{ mx: 2, mb: 2 }}>
        Units are used on template elements, NHF codes and in the surveyor app. The <b>code</b> is what is saved; the <b>label</b> is what people see.
        <b> Other ways to write it</b> (e.g. m2, sqm) are matched when rows are pasted or imported from Excel. A unit that is in use cannot be deleted or get a new code.
      </Alert>
      <Divider />
      {!rows ? (
        <Box textAlign="center" py={6}><CircularProgress size={28} /></Box>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>Unit</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Other ways to write it</TableCell>
                <TableCell>Used by</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.map((r) => {
                const blocked = r.is_default ? "This is the default unit. Make another unit the default first." : r.used_total ? `Used by ${r.used_text}. Change those to another unit first.` : "";
                return (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Typography className="f-14" fontWeight={600}>{r.label}</Typography>
                        {r.is_default && <Chip size="small" color="primary" variant="outlined" label="Default" />}
                      </Stack>
                    </TableCell>
                    <TableCell><Chip size="small" variant="outlined" label={r.code} /></TableCell>
                    <TableCell>
                      <Typography className="f-14" color="textSecondary">{r.aliases || "–"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography className="f-14" color={r.used_total ? "textPrimary" : "textSecondary"}>{r.used_total ? r.used_text : "Not used"}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => open(r)} aria-label={`Edit ${r.label}`}><IconEdit size={18} /></IconButton></Tooltip>
                      <Tooltip title={blocked || "Delete"}>
                        <span>
                          <IconButton size="small" color="error" disabled={!!blocked} onClick={() => setDel(r)} aria-label={`Delete ${r.label}`}><IconTrash size={18} /></IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!shown.length && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography className="f-14" color="textSecondary" textAlign="center" py={3}>{query ? `No unit matches “${q.trim()}”.` : "No units yet."}</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      <FormDrawer open={!!edit} title={editing ? `Edit unit · ${editing.label}` : "Add unit"} onClose={() => setEdit(null)} onSubmit={save} isSaving={busy} submitLabel={editing ? "Save" : "Add unit"}>
        <FormField label="Label *" hint={err.label ? undefined : "What people see, e.g. m² or litre"}>
          <CustomTextField fullWidth size="small" autoFocus value={f.label} placeholder="e.g. litre" onChange={(e: any) => set("label", e.target.value)} error={!!err.label} helperText={err.label || undefined} />
        </FormField>
        <FormField label="Code *" hint={err.code ? undefined : codeLocked ? `Used by ${editing!.used_text}, so the code cannot change.` : "What is saved, e.g. sm or ltr. No spaces."}>
          <CustomTextField fullWidth size="small" value={f.code} placeholder="e.g. ltr" disabled={codeLocked} onChange={(e: any) => set("code", e.target.value)} error={!!err.code} helperText={err.code || undefined} />
        </FormField>
        <FormField label="Other ways to write it" hint="Comma separated, e.g. l, liter, litres. Used when rows are pasted or imported from Excel.">
          <CustomTextField fullWidth size="small" value={f.aliases} placeholder="Optional" onChange={(e: any) => set("aliases", e.target.value)} />
        </FormField>
        <FormField label="Default unit" hint={err.is_default || "New rows start with this unit. Only one unit is the default."}>
          <FormControlLabel
            control={<Switch checked={f.is_default} disabled={!!editing?.is_default} onChange={(e) => set("is_default", e.target.checked)} />}
            label={f.is_default ? "Yes, the default" : "No"}
          />
        </FormField>
      </FormDrawer>
      <ConfirmDialog
        open={!!del}
        title="Delete unit"
        confirmLabel="Delete"
        confirmColor="error"
        busy={busy}
        onClose={() => setDel(null)}
        onConfirm={doDelete}
        message={del ? <>Delete the unit <b>{del.label}</b> ({del.code})? It is not used anywhere.</> : ""}
      />
    </Box>
  );
};

export default Units;
