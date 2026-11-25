"use client";

import React, { useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Link, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import api from "@/utils/axios";
import { NhfCode, NhfSheet, apiMessage, uomLabel } from "./types";
import { defaultUnit, unitFromText, useUnits } from "@/app/components/apps/surveys/shared/units";

type Row = { key: string; code: string; short_name: string; uom: string; rate: string; element_1: string; err?: string; note?: string; checking?: boolean };

let seq = 0;
const newRow = (): Row => ({ key: `c${++seq}`, code: "", short_name: "", uom: defaultUnit(), rate: "", element_1: "" });
const isBlank = (r: Row) => !r.code.trim() && !r.short_name.trim() && !r.rate.trim() && !r.element_1.trim();
const keyOf = (code: string) => code.trim().toLowerCase();

/** NHF rates › Add element: several codes at once. Each code must be new in this sheet (checked as you type). */
const MultiCodeDialog: React.FC<{
  open: boolean;
  sheet: NhfSheet | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  /** The full form for one code (long description, Element 2 and 3). */
  onMoreOptions: () => void;
}> = ({ open, sheet, onClose, onSaved, onMoreOptions }) => {
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [inSheet, setInSheet] = useState<Record<string, boolean>>({});
  const { codes } = useUnits();
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const focusKey = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const first = newRow();
    setRows([first]);
    setFormErr("");
    setInSheet({});
    focusKey.current = first.key;
  }, [open]);
  useEffect(() => {
    if (focusKey.current && refs.current[focusKey.current]) {
      refs.current[focusKey.current]?.focus();
      focusKey.current = null;
    }
  });

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch, err: "err" in patch ? patch.err : undefined } : r)));
  const addRow = () => {
    const r = newRow();
    focusKey.current = r.key;
    setRows((rs) => [...rs, r]);
  };
  const removeRow = (key: string) => setRows((rs) => (rs.length === 1 ? [newRow()] : rs.filter((r) => r.key !== key)));

  // is the code already in this sheet? (and is it in another sheet?)
  const check = async (codes: string[]) => {
    if (!sheet) return;
    const list = [...new Set(codes.map((c) => c.trim()).filter(Boolean))].filter((c) => inSheet[keyOf(c)] === undefined);
    if (!list.length) return;
    setRows((rs) => rs.map((r) => (list.some((c) => keyOf(c) === keyOf(r.code)) ? { ...r, checking: true } : r)));
    const found: Record<string, boolean> = {};
    const other: Record<string, string> = {};
    await Promise.all(
      list.map(async (c) => {
        try {
          const res = await api.get(`nhf-rates/sheets/${sheet.id}/codes?${new URLSearchParams({ search: c, page: "1", limit: "20" })}`);
          found[keyOf(c)] = (res.data.data as NhfCode[]).some((x) => keyOf(x.code) === keyOf(c));
        } catch {
          found[keyOf(c)] = false;
        }
      }),
    );
    try {
      const res = await api.get(`nhf-rates/lookup?codes=${encodeURIComponent(list.join(","))}`);
      (res.data.data as any[]).forEach((h) => h.found && h.sheet_id !== sheet.id && (other[keyOf(h.code)] = h.sheet_name));
    } catch {
      /* only a hint */
    }
    setInSheet((m) => ({ ...m, ...found }));
    setRows((rs) =>
      rs.map((r) =>
        list.some((c) => keyOf(c) === keyOf(r.code))
          ? { ...r, checking: false, note: other[keyOf(r.code)] ? `Also in ${other[keyOf(r.code)]}; the sheet with the later effective date is used.` : undefined }
          : r,
      ),
    );
  };

  // rows from Excel: Code, Short name, UOM, Base rate, Element 1 (tab separated)
  const onPaste = (key: string) => (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (!/[\t\n]/.test(text.trim())) return;
    e.preventDefault();
    const parsed = text
      .replace(/\r/g, "")
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        const [code = "", short_name = "", uom = "", rate = "", element_1 = ""] = l.split("\t").map((c) => c.trim());
        return { ...newRow(), code, short_name, uom: uom ? unitFromText(uom) || uom.trim().toLowerCase() : defaultUnit(), rate: rate.replace(/[£,\s]/g, ""), element_1 };
      });
    setRows((rs) => {
      const at = rs.findIndex((r) => r.key === key);
      const cur = rs[at];
      return [...rs.slice(0, at), ...(isBlank(cur) ? [] : [cur]), ...parsed, ...rs.slice(at + 1).filter((r) => !isBlank(r))];
    });
    check(parsed.map((p) => p.code));
  };

  const filled = rows.filter((r) => !isBlank(r));
  // problems shown live: code already in the sheet, or twice in the list
  const counts: Record<string, number> = {};
  filled.forEach((r) => r.code.trim() && (counts[keyOf(r.code)] = (counts[keyOf(r.code)] ?? 0) + 1));
  const liveErr = (r: Row) =>
    !r.code.trim() ? undefined : inSheet[keyOf(r.code)] ? `Code ${r.code.trim()} is already in ${sheet?.name}` : counts[keyOf(r.code)] > 1 ? `Code ${r.code.trim()} is twice in the list` : undefined;

  const submit = async () => {
    setFormErr("");
    if (!sheet) return;
    if (!filled.length) return setFormErr("Add at least one code");
    let bad = false;
    setRows((rs) =>
      rs.map((r) => {
        if (isBlank(r)) return r;
        const err = !r.code.trim()
          ? "Enter a code"
          : !r.short_name.trim()
            ? "Enter a short name"
            : r.rate.trim() === "" || Number.isNaN(Number(r.rate))
              ? "Enter the base rate as a number"
              : !codes.includes(r.uom)
                ? `Unit “${r.uom}” is not in Survey settings › Units. Add it there, or pick another unit.`
                : liveErr(r);
        if (err) bad = true;
        return { ...r, err };
      }),
    );
    if (bad) return;
    setBusy(true);
    try {
      const res = await api.post(`nhf-rates/sheets/${sheet.id}/codes/bulk`, {
        codes: filled.map((r) => ({ code: r.code.trim(), short_name: r.short_name.trim(), uom: r.uom, rate: Number(r.rate), element_1: r.element_1.trim() || undefined })),
      });
      onSaved(res.data.message);
    } catch (x: any) {
      const rowErrors: { index: number; message: string }[] | undefined = x?.response?.data?.row_errors;
      if (rowErrors?.length) {
        const byKey: Record<string, string> = {};
        rowErrors.forEach((e) => filled[e.index] && (byKey[filled[e.index].key] = e.message));
        setRows((rs) => rs.map((r) => (byKey[r.key] ? { ...r, err: byKey[r.key] } : r)));
      }
      setFormErr(apiMessage(x, "Could not add the codes."));
    }
    setBusy(false);
  };

  const enterNext = (i: number) => (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (i === rows.length - 1) addRow();
    else refs.current[rows[i + 1].key]?.focus();
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle component="div" sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5">Add elements · {sheet?.name}</Typography>
          <Typography variant="body2" color="textSecondary">
            Add one or many codes. Each code can be in this sheet once. Press <b>Enter</b> for a new row, or paste rows from Excel (Code, Short name, UOM, Base rate, Element 1).
          </Typography>
        </Box>
        <IconButton onClick={onClose} disabled={busy} aria-label="Close"><IconX size={20} /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: 900 }}>
            <Stack direction="row" gap={1} sx={{ px: 1, pb: 0.75, borderBottom: 1, borderColor: "divider" }}>
              {[["#", 28], ["Code *", 150], ["Short name *", 0], ["UOM", 90], ["Base rate (£) *", 120], ["Element 1", 180], ["", 36]].map(([l, w]) => (
                <Typography key={String(l) || "x"} variant="subtitle2" sx={w ? { width: Number(w), flexShrink: 0 } : { flex: 1 }}>{l}</Typography>
              ))}
            </Stack>
            {rows.map((r, i) => {
              const err = r.err ?? liveErr(r);
              return (
                <Box key={r.key} sx={{ px: 1, py: 0.75, borderBottom: 1, borderColor: "divider", bgcolor: err ? "#fff5f5" : undefined }}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Typography className="f-14" color="textSecondary" sx={{ width: 28, flexShrink: 0 }}>{i + 1}</Typography>
                    <TextField
                      size="small"
                      placeholder="e.g. 432899"
                      value={r.code}
                      inputRef={(el) => (refs.current[r.key] = el)}
                      onChange={(e) => update(r.key, { code: e.target.value, note: undefined })}
                      onBlur={() => r.code.trim() && check([r.code])}
                      onPaste={onPaste(r.key)}
                      onKeyDown={enterNext(i)}
                      error={!!err}
                      sx={{ width: 150, flexShrink: 0 }}
                      slotProps={{ input: { endAdornment: r.checking ? <CircularProgress size={14} /> : undefined } }}
                    />
                    <TextField size="small" sx={{ flex: 1 }} placeholder="e.g. towel rail: renew heated" value={r.short_name} onChange={(e) => update(r.key, { short_name: e.target.value })} onPaste={onPaste(r.key)} onKeyDown={enterNext(i)} />
                    <TextField select size="small" value={r.uom} onChange={(e) => update(r.key, { uom: e.target.value })} sx={{ width: 90, flexShrink: 0 }}>
                      {[...new Set([...codes, r.uom])].map((u) => <MenuItem key={u} value={u}>{codes.includes(u) ? uomLabel(u) : `${u} · not in the list`}</MenuItem>)}
                    </TextField>
                    <TextField size="small" placeholder="0.00" value={r.rate} onChange={(e) => update(r.key, { rate: e.target.value })} onKeyDown={enterNext(i)} sx={{ width: 120, flexShrink: 0 }} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
                    <TextField size="small" placeholder="Optional" value={r.element_1} onChange={(e) => update(r.key, { element_1: e.target.value })} onKeyDown={enterNext(i)} sx={{ width: 180, flexShrink: 0 }} />
                    <Tooltip title="Remove row"><IconButton size="small" color="error" onClick={() => removeRow(r.key)}><IconTrash size={17} /></IconButton></Tooltip>
                  </Stack>
                  {(err || r.note) && (
                    <Typography variant="caption" display="block" sx={{ pl: 4.5, pt: 0.5, color: err ? "error.main" : "text.secondary" }}>{err ?? r.note}</Typography>
                  )}
                </Box>
              );
            })}
            <Button startIcon={<IconPlus size={16} />} onClick={addRow} sx={{ mt: 1 }}>Add row</Button>
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>Base rate without uplift: the uplift is added per project.</Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5, gap: 1, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          {formErr ? (
            <Typography className="f-14" color="error.main">{formErr}</Typography>
          ) : (
            <Typography className="f-14" color="textSecondary">
              {filled.length} {filled.length === 1 ? "code" : "codes"} ·{" "}
              <Link component="button" type="button" onClick={onMoreOptions} sx={{ verticalAlign: "baseline" }}>One code with all details</Link>
            </Typography>
          )}
        </Box>
        <Button color="inherit" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <IconPlus size={16} />}>
          {filled.length > 1 ? `Add ${filled.length} elements` : "Add element"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MultiCodeDialog;
