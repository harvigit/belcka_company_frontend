"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { IconRestore } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "@/app/components/apps/inventory-new/shared/FormDrawer";
import FormField from "@/app/components/apps/inventory-new/shared/FormField";
import { NhfCode, NhfSheet, NhfVersion, UOM_OPTIONS, apiMessage, shortDate, uomLabel } from "./types";

// ---------- Add / edit an element (code) of the selected sheet: right-hand drawer like the other forms ----------
export const CodeDrawer: React.FC<{
  open: boolean;
  sheet: NhfSheet | null;
  code: NhfCode | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, sheet, code, onClose, onSaved }) => {
  const empty = { code: "", short_name: "", long_description: "", element_1: "", element_2: "", element_3: "", uom: "it", rate: "" };
  const [f, setF] = useState<Record<string, string>>(empty);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr({});
    setF(
      code
        ? {
            code: code.code,
            short_name: code.short_name ?? "",
            long_description: code.long_description ?? "",
            element_1: code.element_1 ?? "",
            element_2: code.element_2 ?? "",
            element_3: code.element_3 ?? "",
            uom: code.uom ?? "it",
            rate: code.rate === null ? "" : String(code.rate),
          }
        : empty,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, code]);

  const set = (k: string, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setErr((x) => ({ ...x, [k]: "" }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.code.trim()) er.code = "Enter a code";
    if (!f.short_name.trim()) er.short_name = "Enter a short name";
    if (f.rate.trim() === "" || Number.isNaN(Number(f.rate))) er.rate = "Enter the base rate as a number";
    setErr(er);
    if (Object.keys(er).length || !sheet) return;
    setBusy(true);
    try {
      const body = { ...f, rate: Number(f.rate) };
      const res = code ? await api.put(`nhf-rates/codes/${code.id}`, body) : await api.post(`nhf-rates/sheets/${sheet.id}/codes`, body);
      toast.success(res.data.message);
      onSaved();
    } catch (x) {
      const m = apiMessage(x, "Could not save the code.");
      if (/already in/i.test(m)) setErr({ code: m });
      else toast.error(m);
    }
    setBusy(false);
  };

  const input = (k: string, label: string, opts: { ph?: string; hint?: string; multiline?: boolean; required?: boolean } = {}) => (
    <FormField label={`${label}${opts.required ? " *" : ""}`} hint={err[k] ? undefined : opts.hint}>
      <CustomTextField
        fullWidth
        size="small"
        value={f[k]}
        placeholder={opts.ph}
        multiline={opts.multiline}
        minRows={opts.multiline ? 3 : undefined}
        onChange={(e: any) => set(k, e.target.value)}
        error={!!err[k]}
        helperText={err[k] || undefined}
        inputProps={k === "rate" ? { inputMode: "decimal" } : undefined}
      />
    </FormField>
  );

  return (
    <FormDrawer
      open={open}
      title={code ? `Edit element · ${sheet?.name ?? ""}` : `Add element · ${sheet?.name ?? ""}`}
      onClose={onClose}
      onSubmit={save}
      isSaving={busy}
      submitLabel={code ? "Save" : "Add element"}
    >
      {input("code", "Code", { required: true, ph: "e.g. 432899" })}
      {input("short_name", "Short name", { required: true, ph: "e.g. towel rail: renew heated" })}
      {input("long_description", "Long description", { ph: "Optional", multiline: true })}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6 }}>
          <FormField label="UOM">
            <CustomTextField select fullWidth size="small" value={f.uom} onChange={(e: any) => set("uom", e.target.value)}>
              {UOM_OPTIONS.map((u) => (
                <MenuItem key={u} value={u}>{uomLabel(u)}</MenuItem>
              ))}
            </CustomTextField>
          </FormField>
        </Grid>
        <Grid size={{ xs: 6 }}>{input("rate", "Base rate (£)", { required: true, ph: "0.00", hint: "No uplift: it is added per project" })}</Grid>
      </Grid>
      {input("element_1", "Element 1", { ph: "Optional" })}
      {input("element_2", "Element 2", { ph: "Optional" })}
      {input("element_3", "Element 3", { ph: "Optional" })}
      {code && (
        <Typography variant="caption" color="textSecondary">
          Templates using code {code.code} pick up the new rate straight away.
        </Typography>
      )}
    </FormDrawer>
  );
};

// ---------- Sheet name and effective date ----------
export const SheetDrawer: React.FC<{ open: boolean; sheet: NhfSheet | null; onClose: () => void; onSaved: () => void }> = ({
  open,
  sheet,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open && sheet) {
      setName(sheet.name);
      setDate(sheet.effective_date ?? "");
      setErr("");
    }
  }, [open, sheet]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr("Enter a name");
    if (!sheet) return;
    setBusy(true);
    try {
      await api.put(`nhf-rates/sheets/${sheet.id}`, { name: name.trim(), effective_date: date || undefined });
      toast.success("Saved");
      onSaved();
    } catch (x) {
      const m = apiMessage(x, "Could not save.");
      if (/name/i.test(m)) setErr(m);
      else toast.error(m);
    }
    setBusy(false);
  };
  return (
    <FormDrawer open={open} title={`Edit ${sheet?.name ?? ""}`} onClose={onClose} onSubmit={save} isSaving={busy}>
      <FormField label="Name *" hint={err ? undefined : "Shown in the dropdown. First taken from the sheet tab."}>
        <CustomTextField
          fullWidth
          size="small"
          value={name}
          onChange={(e: any) => {
            setName(e.target.value);
            setErr("");
          }}
          error={!!err}
          helperText={err || undefined}
        />
      </FormField>
      <FormField label="Effective from" hint="When two sheets have the same code, the later date wins.">
        <CustomTextField type="date" fullWidth size="small" value={date} onChange={(e: any) => setDate(e.target.value)} />
      </FormField>
    </FormDrawer>
  );
};

// ---------- Versions of a sheet, with Restore ----------
export const VersionsDialog: React.FC<{ open: boolean; sheet: NhfSheet | null; onClose: () => void; onRestored: () => void }> = ({
  open,
  sheet,
  onClose,
  onRestored,
}) => {
  const [rows, setRows] = useState<NhfVersion[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const load = async () => {
    if (!sheet) return;
    setRows(null);
    try {
      const res = await api.get(`nhf-rates/sheets/${sheet.id}/versions`);
      setRows(res.data.data);
    } catch (e) {
      toast.error(apiMessage(e, "Could not load the versions."));
      setRows([]);
    }
  };
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sheet?.id]);
  const restore = async (v: NhfVersion) => {
    if (!sheet) return;
    setBusy(v.id);
    try {
      const res = await api.post(`nhf-rates/sheets/${sheet.id}/versions/${v.id}/restore`);
      toast.success(res.data.message);
      await load();
      onRestored();
    } catch (e) {
      toast.error(apiMessage(e, "Could not restore the version."));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Versions of {sheet?.name}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Each import makes a new version. Old versions are kept, so a wrong import can be undone with <b>Restore</b>.
          Restoring also makes a new version, so nothing is lost.
        </Typography>
        {!rows ? (
          <Box textAlign="center" py={3}><CircularProgress size={24} /></Box>
        ) : (
          <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Version</TableCell>
                  <TableCell>File</TableCell>
                  <TableCell>Imported</TableCell>
                  <TableCell>Effective</TableCell>
                  <TableCell align="right">Codes</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <b>v{v.version}</b> {v.current && <Chip size="small" color="success" label="Current" sx={{ ml: 0.5 }} />}
                      {v.note && <Typography variant="caption" display="block" color="text.secondary">{v.note}</Typography>}
                    </TableCell>
                    <TableCell>{v.file_name || "–"}</TableCell>
                    <TableCell>
                      {shortDate(v.created_at)}
                      {v.created_by && <Typography variant="caption" display="block" color="text.secondary">{v.created_by}</Typography>}
                    </TableCell>
                    <TableCell>{shortDate(v.effective_date)}</TableCell>
                    <TableCell align="right">{v.codes_count.toLocaleString("en-GB")}</TableCell>
                    <TableCell align="right">
                      {v.current ? (
                        <Typography variant="body2" color="text.secondary">In use</Typography>
                      ) : (
                        <Button size="small" variant="outlined" startIcon={busy === v.id ? <CircularProgress size={14} /> : <IconRestore size={14} />} disabled={busy !== null} onClick={() => restore(v)}>
                          Restore
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
