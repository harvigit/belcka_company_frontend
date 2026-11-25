"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { IconListSearch, IconPencil, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import api from "@/utils/axios";
import Alert from "@/app/components/apps/surveys/shared/SurveyAlert";
import { NhfSheet, UOM_OPTIONS, apiMessage, money, uomLabel } from "../nhf-rates/types";
import { NhfHit, TemplateDetail, TplNode, pathOf } from "./types";
import { Highlight, matchGroup, queryWords } from "@/app/components/apps/surveys/shared/Highlight";

type RowType = "nhf" | "custom";
type CodeState = "none" | "checking" | "found" | "missing";
type Row = {
  key: string;
  type: RowType;
  name: string;
  /** NHF row: the search text; Custom row: the code (optional) */
  code: string;
  uom: string;
  vo: "Main" | "VO";
  /** Custom row: rate in £ (text while typing) */
  rate: string;
  hit: NhfHit | null;
  state: CodeState;
  note?: string;
  err?: string;
};

let seq = 0;
const newRow = (type: RowType = "nhf"): Row => ({ key: `r${++seq}`, type, name: "", code: "", uom: "it", vo: "Main", rate: "", hit: null, state: "none" });
const isBlank = (r: Row) => !r.name.trim() && !r.code.trim() && !r.rate.trim();
const keyOf = (s: string) => s.trim().toLowerCase();
/** One word with a digit in it, e.g. 432805 or DCK120: looks like a code rather than a name. */
const looksLikeCode = (s: string) => /^[a-z]*\d[\w-]*$/i.test(s.trim());

// "m2" / "m²" / "item" / "nr" … → the app's UOM codes
const UOM_ALIAS: Record<string, string> = { m2: "sm", "m²": "sm", sqm: "sm", m: "lm", lm: "lm", item: "it", items: "it", nr: "no", no: "no", hrs: "hr", hour: "hr", week: "wk", pair: "pr" };
const toUom = (v: string) => {
  const k = v.trim().toLowerCase();
  return UOM_OPTIONS.includes(k) ? k : UOM_ALIAS[k] ?? "it";
};
const isNum = (s: string) => s.trim() !== "" && !Number.isNaN(Number(s.replace(/[£,\s]/g, "")));
const toNum = (s: string) => Number(s.replace(/[£,\s]/g, ""));

// Two-option switch: the chosen option is filled in the primary colour.
const toggleSx = {
  "& .MuiToggleButton-root": { gap: 0.5, textTransform: "none", fontWeight: 500, color: "text.secondary", borderColor: "divider", py: 0.6, px: 1, fontSize: 13 },
  "& .MuiToggleButton-root.Mui-selected": { bgcolor: "primary.main", color: "#fff", fontWeight: 600, borderColor: "primary.main" },
  "& .MuiToggleButton-root.Mui-selected:hover": { bgcolor: "primary.dark" },
} as const;

/** Every area and group of the template, as "Area › Group › Sub-group". */
export function allPlaces(rooms: TplNode[]) {
  const out: { id: number; label: string; depth: number; kind: TplNode["kind"] }[] = [];
  const walk = (n: TplNode, p: string[], depth: number) => {
    out.push({ id: n.id, label: [...p, n.name].join(" › "), depth, kind: n.kind });
    n.children.forEach((c) => walk(c, [...p, n.name], depth + 1));
  };
  rooms.forEach((r) => walk(r, [], 0));
  return out;
}

/** Add element › several rows at once. Each row is an NHF code (searched) or Custom (own name, code and rate). */
const MultiAddDialog: React.FC<{
  open: boolean;
  template: TemplateDetail;
  nodeId: number | null;
  sheets: NhfSheet[];
  onClose: () => void;
  onSaved: (message: string, ids: number[]) => void;
  /** The detailed form for one element (description, comment, skipped suggestions). */
  onMoreOptions: (nodeId: number) => void;
}> = ({ open, template, nodeId, sheets, onClose, onSaved, onMoreOptions }) => {
  const [place, setPlace] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [nhfSheet, setNhfSheet] = useState(""); // "" = custom codes stay in this template only
  const nhfDone = useRef<Set<string>>(new Set()); // custom codes already added to NHF (a retry skips them)
  const nameRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const focusKey = useRef<string | null>(null);
  const places = useMemo(() => allPlaces(template.rooms), [template]);

  useEffect(() => {
    if (!open) return;
    const first = newRow();
    setPlace(nodeId);
    setRows([first]);
    setFormErr("");
    setNhfSheet("");
    nhfDone.current = new Set();
    focusKey.current = first.key;
  }, [open, nodeId]);

  // focus a row that was just added
  useEffect(() => {
    if (focusKey.current && nameRefs.current[focusKey.current]) {
      nameRefs.current[focusKey.current]?.focus();
      focusKey.current = null;
    }
  });

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch, err: "err" in patch ? patch.err : undefined } : r)));
  const addRow = () => {
    const last = rows[rows.length - 1];
    const r = newRow(last?.type ?? "nhf");
    focusKey.current = r.key;
    setRows((rs) => [...rs, r]);
  };
  const removeRow = (key: string) => setRows((rs) => (rs.length === 1 ? [newRow()] : rs.filter((r) => r.key !== key)));
  const setType = (r: Row, type: RowType) => {
    if (type === r.type) return;
    if (type === "custom") {
      // keep what was typed: a code-like search becomes the code, words become the name
      const text = r.hit ? "" : r.code.trim();
      const autoName = r.hit && r.name === (r.hit.short_name || r.hit.code);
      update(r.key, {
        type,
        hit: null,
        state: "none",
        note: undefined,
        code: text && looksLikeCode(text) ? text : "",
        name: autoName ? "" : r.name || (text && !looksLikeCode(text) ? text : ""),
      });
    } else update(r.key, { type, code: "", rate: "", note: undefined });
  };

  // look typed / pasted codes up in NHF rates: found = NHF row, not found = Custom row
  const lookup = async (list: { key: string; code: string }[]) => {
    const codes = [...new Set(list.map((l) => l.code.trim()).filter(Boolean))];
    if (!codes.length) return;
    setRows((rs) => rs.map((r) => (list.some((l) => l.key === r.key && l.code.trim()) ? { ...r, state: "checking" } : r)));
    try {
      const res = await api.get(`nhf-rates/lookup?codes=${encodeURIComponent(codes.join(","))}`);
      const found: Record<string, any> = {};
      (res.data.data as any[]).forEach((h) => (found[String(h.code).toLowerCase()] = h));
      setRows((rs) =>
        rs.map((r) => {
          if (!list.some((l) => l.key === r.key) || !r.code.trim()) return r;
          const h = found[keyOf(r.code)];
          if (!h?.found) return { ...r, type: "custom", hit: null, state: "missing", note: `${r.code.trim()} is not in NHF rates, so this row is Custom.` };
          const hit: NhfHit = { code: h.code, short_name: h.short_name, element_1: h.element_1 ?? null, uom: h.uom, rate: h.rate, sheet_id: h.sheet_id, sheet_name: h.sheet_name };
          return { ...r, type: "nhf", hit, state: "found", code: h.code, uom: h.uom ?? r.uom, rate: "", name: r.name || h.short_name || h.code, note: undefined };
        }),
      );
    } catch {
      setRows((rs) => rs.map((r) => (r.state === "checking" ? { ...r, state: "none" } : r)));
    }
  };

  // rows copied from Excel: Name, Code, UOM, Main/VO, Rate (tab separated).
  // The old order Name, Code, UOM, Qty, Main/VO still works (the qty is ignored).
  const onPaste = (key: string) => (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (!/[\t\n]/.test(text.trim())) return;
    e.preventDefault();
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
    const parsed = lines.map((l) => {
      const cells = l.split("\t").map((c) => c.trim());
      const [name = "", code = "", uom = ""] = cells;
      const old = cells.length >= 5 && isNum(cells[3]) && /^(main|vo)$/i.test(cells[4]);
      const vo = (old ? cells[4] : cells[3]) ?? "";
      const rate = old ? "" : (cells[4] ?? "").replace(/[£,\s]/g, "");
      return { ...newRow(code ? "nhf" : "custom"), name, code, uom: uom ? toUom(uom) : "it", vo: /^vo$/i.test(vo) ? "VO" : "Main", rate } as Row;
    });
    setRows((rs) => {
      const at = rs.findIndex((r) => r.key === key);
      const cur = rs[at];
      return [...rs.slice(0, at), ...(isBlank(cur) ? [] : [cur]), ...parsed, ...rs.slice(at + 1).filter((r) => !isBlank(r))];
    });
    lookup(parsed.filter((p) => p.code).map((p) => ({ key: p.key, code: p.code })));
  };

  const filled = rows.filter((r) => !isBlank(r));
  const customWithCode = filled.filter((r) => r.type === "custom" && r.code.trim());
  const nhfWithoutPick = filled.filter((r) => r.type === "nhf" && !r.hit);
  const counts = { nhf: filled.filter((r) => r.type === "nhf").length, custom: filled.filter((r) => r.type === "custom").length };
  const target = place ? pathOf(template.rooms, place).slice(-1)[0] : null;

  const submit = async () => {
    setFormErr("");
    if (!place || !target) return setFormErr("Choose where the elements go");
    if (!filled.length) return setFormErr("Add at least one element");
    const addToNhf = !!nhfSheet && customWithCode.length > 0;
    // checks on this page first, so nothing is saved half way
    const here = new Set(target.elements.map((e) => `${keyOf(e.name)}|${keyOf(e.code ?? "")}`));
    const seen = new Set<string>();
    const errs: Record<string, string> = {};
    filled.forEach((r) => {
      const code = r.type === "nhf" ? r.hit?.code ?? "" : r.code;
      const k = `${keyOf(r.name)}|${keyOf(code)}`;
      if (!r.name.trim()) errs[r.key] = "Enter the works name";
      else if (r.type === "nhf" && !r.hit) errs[r.key] = "Pick a code from the list, or switch this row to Custom";
      else if (r.type === "custom" && r.rate.trim() && !isNum(r.rate)) errs[r.key] = "The rate must be a number";
      else if (addToNhf && r.type === "custom" && r.code.trim() && !r.rate.trim()) errs[r.key] = "Enter the rate to add this code to NHF";
      else if (here.has(k)) errs[r.key] = `“${r.name.trim()}” is already in ${target.name}`;
      else if (seen.has(k)) errs[r.key] = `“${r.name.trim()}” is twice in the list`;
      seen.add(k);
    });
    setRows((rs) => rs.map((r) => (isBlank(r) ? r : { ...r, err: errs[r.key] })));
    if (Object.keys(errs).length) return setFormErr(Object.keys(errs).length === 1 ? "One row needs a look (marked in red)" : `${Object.keys(errs).length} rows need a look (marked in red)`);
    setBusy(true);
    try {
      // 1. custom codes into the NHF sheet (every template and the QS can then price them)
      if (addToNhf) {
        const toAdd = customWithCode.filter((r) => !nhfDone.current.has(keyOf(r.code)));
        if (toAdd.length) {
          try {
            await api.post(`nhf-rates/sheets/${nhfSheet}/codes/bulk`, {
              codes: toAdd.map((r) => ({ code: r.code.trim(), short_name: r.name.trim(), uom: r.uom, rate: toNum(r.rate), source: "template", source_note: `Template: ${template.name}` })),
            });
            toAdd.forEach((r) => nhfDone.current.add(keyOf(r.code)));
          } catch (x: any) {
            const rowErrors: { index: number; message: string }[] | undefined = x?.response?.data?.row_errors;
            if (rowErrors?.length) {
              const byKey: Record<string, string> = {};
              rowErrors.forEach((e) => toAdd[e.index] && (byKey[toAdd[e.index].key] = `${e.message}. Pick it as an NHF row instead.`));
              setRows((rs) => rs.map((r) => (byKey[r.key] ? { ...r, err: byKey[r.key] } : r)));
            }
            setFormErr(apiMessage(x, "Could not add the codes to NHF rates. Nothing was saved."));
            setBusy(false);
            return;
          }
        }
      }
      // 2. the elements
      const res = await api.post(`survey-templates/${template.id}/elements/bulk`, {
        node_id: place,
        elements: filled.map((r) =>
          r.type === "nhf"
            ? { name: r.name.trim(), code: r.hit!.code, uom: r.hit!.uom ?? r.uom, default_qty: 0, vo_main: r.vo }
            : {
                name: r.name.trim(),
                code: r.code.trim() || undefined,
                uom: r.uom,
                default_qty: 0,
                vo_main: r.vo,
                // a code added to NHF is priced from NHF; otherwise the rate is kept on the element
                custom_rate: addToNhf && r.code.trim() ? undefined : r.rate.trim() ? toNum(r.rate) : undefined,
              },
        ),
      });
      onSaved(res.data.message, res.data.data?.ids ?? []);
    } catch (x: any) {
      const rowErrors: { index: number; message: string }[] | undefined = x?.response?.data?.row_errors;
      if (rowErrors?.length) {
        const byKey: Record<string, string> = {};
        rowErrors.forEach((e) => filled[e.index] && (byKey[filled[e.index].key] = e.message));
        setRows((rs) => rs.map((r) => (byKey[r.key] ? { ...r, err: byKey[r.key] } : r)));
      }
      setFormErr(apiMessage(x, "Could not add the elements.") + (nhfDone.current.size ? " The codes are already in NHF rates; fix the rows in red and save again." : ""));
    }
    setBusy(false);
  };

  const placeLabel = places.find((p) => p.id === place)?.label ?? "";
  const COLS: [string, number][] = [["#", 24], ["Type", 150], ["Works name *", 0], ["NHF code / Code", 230], ["UOM", 90], ["Main / VO", 96], ["Rate (£)", 100], ["", 34]];

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle component="div" sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5">Add elements</Typography>
          <Typography variant="body2" color="textSecondary">Add one or many. Press <b>Enter</b> for a new row.</Typography>
        </Box>
        <IconButton onClick={onClose} disabled={busy} aria-label="Close"><IconX size={20} /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <b>NHF</b>: search by code, words or both (e.g. <i>4328 carpet</i>); the name, UOM and rate come from NHF rates.{" "}
          <b>Custom</b>: a work with no NHF code yet; type its name, and the code and rate if you know them.
          <Box component="span" sx={{ display: "block", mt: 0.5 }}>
            Tip: paste rows from Excel in this order: Name, Code, UOM, Main/VO, Rate. A code found in NHF becomes an NHF row, any other becomes Custom.
          </Box>
        </Alert>
        <TextField
          select
          size="small"
          label="Add to"
          value={place ?? ""}
          onChange={(e) => setPlace(Number(e.target.value))}
          sx={{ minWidth: { xs: "100%", sm: 380 }, mb: 2 }}
          slotProps={{ select: { renderValue: () => placeLabel } }}
        >
          {places.map((p) => (
            <MenuItem key={p.id} value={p.id} sx={{ pl: 2 + p.depth * 2, fontWeight: p.kind === "room" ? 600 : 400 }}>
              {p.kind === "room" ? p.label : p.label.split(" › ").slice(-1)[0]}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: 960 }}>
            <Stack direction="row" gap={1} sx={{ px: 1, pb: 0.75, borderBottom: 1, borderColor: "divider" }}>
              {COLS.map(([l, w]) => (
                <Typography key={l || "x"} variant="subtitle2" sx={w ? { width: w, flexShrink: 0, textAlign: l === "Rate (£)" ? "right" : "left" } : { flex: 1 }}>{l}</Typography>
              ))}
            </Stack>
            {rows.map((r, i) => (
              <Box key={r.key} sx={{ px: 1, py: 0.75, borderBottom: 1, borderColor: "divider", bgcolor: r.err ? "#fff5f5" : undefined }}>
                <Stack direction="row" gap={1} alignItems="flex-start">
                  <Typography className="f-14" color="textSecondary" sx={{ width: 24, flexShrink: 0, pt: 1 }}>{i + 1}</Typography>
                  <ToggleButtonGroup exclusive size="small" value={r.type} onChange={(_, v) => v && setType(r, v)} sx={{ ...toggleSx, width: 150, flexShrink: 0 }}>
                    <ToggleButton value="nhf" sx={{ flex: 1 }} aria-label="NHF code"><IconListSearch size={15} />NHF</ToggleButton>
                    <ToggleButton value="custom" sx={{ flex: 1 }} aria-label="Custom"><IconPencil size={15} />Custom</ToggleButton>
                  </ToggleButtonGroup>
                  <TextField
                    size="small"
                    sx={{ flex: 1 }}
                    placeholder={r.type === "nhf" ? "Filled from the code (you can change it)" : "e.g. Renew letterplate"}
                    value={r.name}
                    inputRef={(el) => (nameRefs.current[r.key] = el)}
                    onChange={(e) => update(r.key, { name: e.target.value })}
                    onPaste={onPaste(r.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (i === rows.length - 1) addRow();
                        else nameRefs.current[rows[i + 1].key]?.focus();
                      }
                    }}
                    error={!!r.err}
                  />
                  {r.type === "nhf" ? (
                    <CodeCell
                      row={r}
                      onPick={(hit) => update(r.key, { hit, code: hit.code, state: "found", uom: hit.uom ?? r.uom, name: r.name || hit.short_name || hit.code })}
                      onType={(code) => update(r.key, { code, hit: null, state: "none" })}
                      onUseCustom={() => setType(r, "custom")}
                    />
                  ) : (
                    <TextField
                      size="small"
                      placeholder={nhfSheet ? "Code (to add to NHF)" : "Code (optional)"}
                      value={r.code}
                      onChange={(e) => update(r.key, { code: e.target.value, note: undefined })}
                      onPaste={onPaste(r.key)}
                      sx={{ width: 230, flexShrink: 0 }}
                    />
                  )}
                  {r.type === "nhf" && r.hit ? (
                    <Tooltip title="From the NHF code">
                      <TextField size="small" value={uomLabel(r.hit.uom ?? r.uom)} slotProps={{ input: { readOnly: true } }} sx={{ width: 90, flexShrink: 0, "& .MuiInputBase-root": { bgcolor: "#f4f6f8" } }} />
                    </Tooltip>
                  ) : (
                    <TextField select size="small" value={r.uom} onChange={(e) => update(r.key, { uom: e.target.value })} sx={{ width: 90, flexShrink: 0 }}>
                      {UOM_OPTIONS.map((u) => <MenuItem key={u} value={u}>{uomLabel(u)}</MenuItem>)}
                    </TextField>
                  )}
                  <TextField select size="small" value={r.vo} onChange={(e) => update(r.key, { vo: e.target.value as Row["vo"] })} sx={{ width: 96, flexShrink: 0 }}>
                    <MenuItem value="Main">Main</MenuItem>
                    <MenuItem value="VO">VO</MenuItem>
                  </TextField>
                  <Box sx={{ width: 100, flexShrink: 0, textAlign: "right" }}>
                    {r.type === "custom" ? (
                      <TextField size="small" placeholder="0.00" value={r.rate} onChange={(e) => update(r.key, { rate: e.target.value })} slotProps={{ htmlInput: { inputMode: "decimal", style: { textAlign: "right" } } }} />
                    ) : r.state === "checking" ? (
                      <CircularProgress size={16} sx={{ mt: 1 }} />
                    ) : (
                      <Tooltip title={r.hit ? `Base rate from ${r.hit.sheet_name}` : "Pick a code to see its rate"}>
                        <Typography className="f-14" fontWeight={600} sx={{ pt: 1 }}>{r.hit ? money(r.hit.rate) : "–"}</Typography>
                      </Tooltip>
                    )}
                  </Box>
                  <Tooltip title="Remove row">
                    <IconButton size="small" color="error" onClick={() => removeRow(r.key)} sx={{ mt: 0.5 }}><IconTrash size={17} /></IconButton>
                  </Tooltip>
                </Stack>
                {(r.err || r.note) && (
                  <Typography variant="caption" display="block" sx={{ pl: "190px", pt: 0.5, color: r.err ? "error.main" : "text.secondary" }}>{r.err ?? r.note}</Typography>
                )}
              </Box>
            ))}
            <Stack direction="row" alignItems="center" gap={1.5} sx={{ mt: 1, flexWrap: "wrap" }}>
              <Button startIcon={<IconPlus size={16} />} onClick={addRow}>Add row</Button>
              {nhfWithoutPick.some((r) => r.name.trim()) && (
                <Button size="small" variant="outlined" onClick={() => nhfWithoutPick.forEach((r) => setType(r, "custom"))}>
                  Make the {nhfWithoutPick.length === 1 ? "row" : `${nhfWithoutPick.length} rows`} without an NHF code Custom
                </Button>
              )}
            </Stack>
          </Box>
        </Box>

        {customWithCode.length > 0 && sheets.length > 0 && (
          <Box sx={{ mt: 2, p: 1.5, border: 1, borderColor: "divider", borderRadius: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ sm: "center" }}>
              <Typography className="f-14" fontWeight={600} sx={{ flex: 1 }}>
                Also add the custom {customWithCode.length === 1 ? "code" : `${customWithCode.length} codes`} to an NHF sheet?
                <Typography component="span" variant="caption" color="textSecondary" display="block" fontWeight={400}>
                  Then every template and the QS can use them. Each code must be new in that sheet and needs a rate.
                </Typography>
              </Typography>
              <TextField select size="small" value={nhfSheet} onChange={(e) => setNhfSheet(e.target.value)} sx={{ minWidth: 240 }} slotProps={{ select: { displayEmpty: true } }}>
                <MenuItem value="">No, this template only</MenuItem>
                {sheets.map((s) => <MenuItem key={s.id} value={String(s.id)}>Add to {s.name}</MenuItem>)}
              </TextField>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5, gap: 1, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          {formErr ? (
            <Typography className="f-14" color="error.main">{formErr}</Typography>
          ) : (
            <Typography className="f-14" color="textSecondary">
              {filled.length} {filled.length === 1 ? "element" : "elements"}
              {filled.length ? ` (${counts.nhf} NHF · ${counts.custom} custom)` : ""}
              {" · "}
              <Link component="button" type="button" onClick={() => place && onMoreOptions(place)} sx={{ verticalAlign: "baseline" }}>
                One element with more options
              </Link>
            </Typography>
          )}
        </Box>
        <Button onClick={onClose} disabled={busy} color="inherit">Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <IconPlus size={16} />}>
          {filled.length > 1 ? `Add ${filled.length} elements` : "Add element"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/** NHF code: smart search (code, words or both); pick a code to fill the name, UOM and rate. */
const CodeCell: React.FC<{ row: Row; onPick: (h: NhfHit) => void; onType: (text: string) => void; onUseCustom: () => void }> = ({ row, onPick, onType, onUseCustom }) => {
  const [opts, setOpts] = useState<NhfHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [text, setText] = useState(row.code);
  useEffect(() => setText(row.code), [row.code]);
  useEffect(() => {
    const q = text.trim();
    setSearched(false);
    if (q.length < 2 || (row.hit && row.hit.code === q)) return setOpts([]);
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`nhf-rates/search?${new URLSearchParams({ q, limit: "8" })}`);
        setOpts(res.data.data);
      } catch {
        setOpts([]);
      }
      setLoading(false);
      setSearched(true);
    }, 300);
    return () => clearTimeout(t);
  }, [text, row.hit]);
  const noMatch = searched && !loading && !opts.length && !row.hit && text.trim().length >= 2;
  return (
    <Box sx={{ width: 230, flexShrink: 0 }}>
      <Autocomplete
        freeSolo
        size="small"
        options={opts}
        filterOptions={(x) => x}
        loading={loading}
        inputValue={text}
        value={row.hit}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.code)}
        isOptionEqualToValue={(a, b) => a.code === b.code}
        groupBy={queryWords(text).length > 1 ? matchGroup : undefined}
        onInputChange={(_, v, reason) => {
          if (reason === "reset") return;
          setText(v);
          onType(v);
        }}
        onChange={(_, v) => v && typeof v !== "string" && onPick(v)}
        renderOption={(props, o) => (
          <li {...props} key={`${o.sheet_id}-${o.code}`}>
            <Box sx={{ minWidth: 0 }}>
              <Typography className="f-14" fontWeight={600}><Highlight text={o.code} words={queryWords(text)} /> · {money(o.rate)}</Typography>
              <Typography variant="caption" color="textSecondary" noWrap display="block"><Highlight text={o.short_name} words={queryWords(text)} /> · {o.sheet_name}</Typography>
            </Box>
          </li>
        )}
        renderInput={(p) => <TextField {...p} placeholder="Search code or words" error={noMatch} />}
      />
      {noMatch && (
        <Typography variant="caption" color="textSecondary" display="block" sx={{ pt: 0.25 }}>
          No NHF code found.{" "}
          <Link component="button" type="button" onClick={onUseCustom} sx={{ verticalAlign: "baseline", fontSize: "inherit" }}>
            Use as Custom
          </Link>
        </Typography>
      )}
    </Box>
  );
};

export default MultiAddDialog;
