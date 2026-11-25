"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  ListItemText,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import Alert from "@/app/components/apps/surveys/shared/SurveyAlert";
import { IconChevronDown, IconChevronRight, IconUpload } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { NhfSheet, apiMessage, money, uomLabel } from "../nhf-rates/types";
import Chip from "@/app/components/apps/surveys/shared/SurveyChip";

type Mapping = { room: number; groups: number[]; works: number; code: number; uom: number; qty: number; vo: number; comment: number; rate: number };
type SowNode = { kind: string; name: string; children: SowNode[]; elements: { name: string; code: string | null }[] };
type Missing = { code: string; name: string; uom: string | null; where: string; count: number; file_rate: number | null };
type Preview = {
  file_name: string;
  sheets: string[];
  sheet: string;
  header_row: number;
  heading_options: { index: number; label: string }[];
  columns: { index: number; label: string }[];
  mapping: Mapping;
  template_name: string;
  existing: { id: number; name: string } | null;
  stats: { rooms: number; groups: number; elements: number; filled: number; duplicates: number; skipped: number };
  warnings: { row: number; message: string }[];
  warnings_total: number;
  tree: SowNode[];
  nhf: { ok: number; no_code: number; missing: Missing[] };
};
type Act = { act: "add" | "norate" | "skip"; rate: string };

const countEls = (n: SowNode): number => n.elements.length + n.children.reduce((a, c) => a + countEls(c), 0);
const SINGLE: { key: keyof Mapping; label: string; required?: boolean }[] = [
  { key: "room", label: "Location (area)", required: true },
  { key: "works", label: "Works name", required: true },
  { key: "code", label: "Code" },
  { key: "uom", label: "UOM" },
  { key: "qty", label: "Q-ty" },
  { key: "vo", label: "VO / Main" },
  { key: "comment", label: "Comments" },
];

interface Props {
  open: boolean;
  templateNames: string[];
  onClose: () => void;
  onImported: (templateId: number) => void;
}

// Import a template from a Scope of Works Excel: Upload → Map columns → Preview (tree + NHF check) → Import.
const ImportTemplateDialog: React.FC<Props> = ({ open, templateNames, onClose, onImported }) => {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [p, setP] = useState<Preview | null>(null);
  const [map, setMap] = useState<Mapping | null>(null);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [acts, setActs] = useState<Record<string, Act>>({});
  const [sheets, setSheets] = useState<NhfSheet[]>([]);
  const [nhfSheet, setNhfSheet] = useState("");
  const [openRooms, setOpenRooms] = useState<Record<string, boolean>>({});
  const [showWarn, setShowWarn] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setFile(null);
    setP(null);
    setMap(null);
    setName("");
    setNameTried(false);
    setMode("merge");
    setActs({});
    setOpenRooms({});
    setShowWarn(false);
    api
      .get("nhf-rates/sheets")
      .then((r) => {
        const list = (r.data.data as NhfSheet[]).filter((s) => s.current_version);
        setSheets(list);
        const newest = [...list].sort((a, b) => (b.effective_date ?? "").localeCompare(a.effective_date ?? ""))[0];
        setNhfSheet(newest ? String(newest.id) : "");
      })
      .catch(() => setSheets([]));
  }, [open]);

  const form = (over: { sheet?: string | null; head?: number | null; map?: Mapping | null } = {}) => {
    const f = new FormData();
    if (file) f.append("file", file);
    const sh = over.sheet !== undefined ? over.sheet : p?.sheet;
    const hd = over.head !== undefined ? over.head : p?.header_row;
    const mp = over.map !== undefined ? over.map : map;
    if (sh) f.append("sheet_name", sh);
    if (hd !== null && hd !== undefined) f.append("header_row", String(hd));
    if (mp) f.append("mapping", JSON.stringify(mp));
    if (name) f.append("template_name", name);
    return f;
  };

  const read = async (over: { sheet?: string | null; head?: number | null; map?: Mapping | null } = {}) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await api.post("survey-templates/import/preview", form(over));
      const d: Preview = res.data.data;
      setP(d);
      setMap(d.mapping);
      setActs((cur) => Object.fromEntries(d.nhf.missing.map((m) => [m.code, cur[m.code] ?? { act: "norate", rate: m.file_rate !== null ? String(m.file_rate) : "" }])));
      if (step === 0) setStep(1);
    } catch (e) {
      toast.error(apiMessage(e, "This file could not be read."));
    }
    setBusy(false);
  };

  const [nameTried, setNameTried] = useState(false);
  const nameError = nameTried && !name.trim();
  const exists = !!name.trim() && templateNames.some((n) => n.toLowerCase() === name.trim().toLowerCase());
  const missingCols = !map || map.room < 0 || map.works < 0;
  const adds = p ? p.nhf.missing.filter((m) => acts[m.code]?.act === "add") : [];
  const badRates = adds.filter((m) => acts[m.code].rate.trim() === "" || Number.isNaN(Number(acts[m.code].rate)));
  const cnt = (k: Act["act"]) => (p ? p.nhf.missing.filter((m) => acts[m.code]?.act === k).length : 0);

  const doImport = async () => {
    if (!p) return;
    if (!name.trim()) return toast.error("Enter a template name");
    if (badRates.length) return toast.error("Enter a base rate for every code you add to NHF");
    setBusy(true);
    try {
      const f = form();
      f.set("template_name", name.trim());
      f.append("mode", mode);
      f.append("nhf_actions", JSON.stringify(acts));
      if (adds.length && nhfSheet) f.append("nhf_sheet_id", nhfSheet);
      const res = await api.post("survey-templates/import", f);
      toast.success(res.data.message);
      onImported(res.data.data.template_id);
    } catch (e) {
      toast.error(apiMessage(e, "The template could not be imported."));
    }
    setBusy(false);
  };

  const tile = (label: string, value: number, sub: string, color?: string) => (
    <Box sx={{ border: 1, borderColor: color ?? "divider", borderRadius: 2, p: 1.5, height: "100%" }}>
      <Typography variant="body2" color="textSecondary">{label}</Typography>
      <Typography variant="h5" sx={{ color }}>{value.toLocaleString("en-GB")}</Typography>
      <Typography variant="caption" color="textSecondary">{sub}</Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Import template from Excel</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {["Upload", "Map columns", "Preview"].map((l) => (
            <Step key={l}><StepLabel>{l}</StepLabel></Step>
          ))}
        </Stepper>

        {step === 0 && (
          <Stack spacing={2}>
            <Alert severity="info">
              Use your Scope of Works sheet. Only the <b>areas, groups and elements</b> are imported (works name, code, qty, UOM, VO/Main, comments).
              Descriptions and rates come from <b>NHF rates</b> through the code.
            </Alert>
            <Box component="label" sx={{ border: "1.5px dashed", borderColor: "divider", borderRadius: 2, p: 4, textAlign: "center", cursor: "pointer", "&:hover": { borderColor: "primary.main", bgcolor: "primary.light" } }}>
              <IconUpload size={28} />
              <Typography fontWeight={600} mt={1}>{file ? file.name : "Choose the template Excel file"}</Typography>
              <Typography variant="body2" color="textSecondary">.xlsx or .csv</Typography>
              <input type="file" hidden accept=".xlsx,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Box>
            <Typography variant="subtitle2">Expected layout</Typography>
            <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>{["Location", "Element", "Works name", "Q-ty", "UOM", "Code", "VO/Main", "Comments"].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  <TableRow><TableCell>General</TableCell><TableCell /><TableCell /><TableCell /><TableCell /><TableCell /><TableCell /><TableCell /></TableRow>
                  <TableRow><TableCell>General</TableCell><TableCell>Common</TableCell><TableCell /><TableCell /><TableCell /><TableCell /><TableCell /><TableCell /></TableRow>
                  <TableRow><TableCell /><TableCell /><TableCell>clear out before works</TableCell><TableCell>1</TableCell><TableCell>it</TableCell><TableCell>460035</TableCell><TableCell>Main</TableCell><TableCell /></TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="body2" color="textSecondary">A row with only a Location (or Location + Element) is a heading: the rows below it go into that room / group.</Typography>
          </Stack>
        )}

        {step === 1 && p && map && (
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography className="f-14" mb={0.5}>File</Typography>
                <CustomTextField size="small" value={p.file_name} disabled fullWidth />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography className="f-14" mb={0.5}>Sheet tab</Typography>
                <CustomTextField select size="small" fullWidth value={p.sheet} onChange={(e: any) => read({ sheet: e.target.value, head: null, map: null })}>
                  {p.sheets.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography className="f-14" mb={0.5}>Heading row</Typography>
                <CustomTextField select size="small" fullWidth value={p.header_row} onChange={(e: any) => read({ head: Number(e.target.value), map: null })}>
                  {p.heading_options.map((o) => <MenuItem key={o.index} value={o.index}>Row {o.index + 1}: {o.label}</MenuItem>)}
                </CustomTextField>
              </Grid>
              {SINGLE.map((f) => (
                <Grid key={f.key} size={{ xs: 12, sm: 6 }}>
                  <Typography className="f-14" mb={0.5}>{f.label}{f.required && <Box component="span" color="error.main"> *</Box>}</Typography>
                  <CustomTextField
                    select
                    size="small"
                    fullWidth
                    value={map[f.key] as number}
                    onChange={(e: any) => {
                      const next = { ...map, [f.key]: Number(e.target.value) } as Mapping;
                      setMap(next);
                      read({ map: next });
                    }}
                  >
                    <MenuItem value={-1}>{f.required ? "– choose –" : "– none –"}</MenuItem>
                    {p.columns.map((c) => <MenuItem key={c.index} value={c.index}>{c.label}</MenuItem>)}
                  </CustomTextField>
                </Grid>
              ))}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography className="f-14" mb={0.5}>Group columns (outer first)</Typography>
                <CustomTextField
                  select
                  size="small"
                  fullWidth
                  SelectProps={{ multiple: true, renderValue: (v: any) => (v as number[]).map((i) => p.columns[i]?.label ?? i).join(", ") || "– none –", displayEmpty: true }}
                  value={map.groups}
                  onChange={(e: any) => {
                    const next = { ...map, groups: [...(e.target.value as number[])].sort((a, b) => a - b) };
                    setMap(next);
                    read({ map: next });
                  }}
                >
                  {p.columns.map((c) => (
                    <MenuItem key={c.index} value={c.index}>
                      <Checkbox size="small" checked={map.groups.includes(c.index)} />
                      <ListItemText primary={c.label} />
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
            </Grid>
            {missingCols ? (
              <Alert severity="error">Choose the <b>Location</b> and <b>Works name</b> columns to continue.</Alert>
            ) : (
              <Alert severity="success">
                Found {p.stats.rooms} areas, {p.stats.groups} groups and {p.stats.elements.toLocaleString("en-GB")} elements with this mapping.
              </Alert>
            )}
          </Stack>
        )}

        {step === 2 && p && (
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Typography className="f-14" mb={0.5}>Template name *</Typography>
                <CustomTextField
                  size="small"
                  fullWidth
                  autoFocus
                  placeholder="e.g. Flat void – standard"
                  value={name}
                  onChange={(e: any) => setName(e.target.value)}
                  error={nameError}
                  helperText={nameError ? "Enter a name for the template" : exists ? undefined : "Name the new template. Use an existing name to update that template instead."}
                />
              </Grid>
              {exists && (
                <Grid size={12}>
                  <Typography className="f-14" mb={0.5}>A template with this name exists</Typography>
                  <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)}>
                    <ToggleButton value="merge">Add what is new</ToggleButton>
                    <ToggleButton value="replace">Replace it</ToggleButton>
                  </ToggleButtonGroup>
                </Grid>
              )}
            </Grid>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6, sm: 3 }}>{tile("Areas", p.stats.rooms, "from Location")}</Grid>
              <Grid size={{ xs: 6, sm: 3 }}>{tile("Groups", p.stats.groups, "incl. sub-groups")}</Grid>
              <Grid size={{ xs: 6, sm: 3 }}>{tile("Elements", p.stats.elements, "works")}</Grid>
              <Grid size={{ xs: 6, sm: 3 }}>{tile("Duplicates", p.stats.duplicates, "same name + code, skipped")}</Grid>
            </Grid>
            {p.warnings_total > 0 && (
              <Alert severity="warning" action={<Button size="small" color="inherit" onClick={() => setShowWarn((x) => !x)}>{showWarn ? "Hide" : "Show"}</Button>}>
                {p.warnings_total} {p.warnings_total === 1 ? "row needs" : "rows need"} a look (the rest is fine).
                <Collapse in={showWarn}>
                  <Box component="ul" sx={{ m: 0, mt: 1, pl: 2 }}>
                    {p.warnings.map((w, i) => <li key={i}>Row {w.row}: {w.message}</li>)}
                  </Box>
                </Collapse>
              </Alert>
            )}

            {/* NHF check */}
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
                <Typography fontWeight={600}>NHF rate check</Typography>
                <Typography variant="body2" color="textSecondary">Every code is compared with all sheets in NHF rates. Prices in this Excel file are not used.</Typography>
              </Box>
              <Grid container spacing={1.5} sx={{ p: 2 }}>
                <Grid size={{ xs: 4 }}>{tile("Rate found", p.nhf.ok, "priced from NHF", "#13DEB9")}</Grid>
                <Grid size={{ xs: 4 }}>{tile("Not in NHF rates", p.nhf.missing.reduce((a, m) => a + m.count, 0), `${p.nhf.missing.length} ${p.nhf.missing.length === 1 ? "code" : "codes"} · no price yet`, p.nhf.missing.length ? "#FFAE1F" : undefined)}</Grid>
                <Grid size={{ xs: 4 }}>{tile("No code", p.nhf.no_code, "custom works · QS sets it")}</Grid>
              </Grid>
              {p.nhf.missing.length === 0 ? (
                <Alert severity="success" sx={{ mx: 2, mb: 2 }}>Every code in this sheet has a price in NHF rates.</Alert>
              ) : (
                <>
                  <Typography variant="body2" color="textSecondary" sx={{ px: 2 }}>
                    For each code choose: <b>Add to NHF</b> (enter the base rate; it is priced everywhere), <b>Without rate</b> (the QS or Admin adds it later) or <b>Skip</b> (not imported now; kept as a suggestion in Add element).
                  </Typography>
                  <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2">Set all to</Typography>
                    {([["add", "Add to NHF"], ["norate", "Without rate"], ["skip", "Skip"]] as const).map(([k, l]) => (
                      <Button key={k} size="small" variant="outlined" disabled={k === "add" && !sheets.length} onClick={() => setActs((a) => Object.fromEntries(Object.entries(a).map(([c, v]) => [c, { ...v, act: k }])))}>
                        {l}
                      </Button>
                    ))}
                    {cnt("add") > 0 && (
                      <Stack direction="row" alignItems="center" gap={1} ml="auto">
                        <Typography variant="body2">Add new codes to</Typography>
                        <CustomTextField select size="small" value={nhfSheet} onChange={(e: any) => setNhfSheet(e.target.value)} sx={{ minWidth: 160 }}>
                          {sheets.map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
                        </CustomTextField>
                      </Stack>
                    )}
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Code</TableCell>
                          <TableCell>Element</TableCell>
                          <TableCell>What to do</TableCell>
                          <TableCell align="right">Base rate (£)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {p.nhf.missing.map((m) => {
                          const a = acts[m.code] ?? { act: "norate", rate: "" };
                          const bad = a.act === "add" && (a.rate.trim() === "" || Number.isNaN(Number(a.rate)));
                          return (
                            <TableRow key={m.code} sx={{ opacity: a.act === "skip" ? 0.6 : 1 }}>
                              <TableCell><Chip size="small" variant="outlined" label={m.code} /></TableCell>
                              <TableCell>
                                <Typography className="f-14" fontWeight={600}>{m.name}</Typography>
                                <Typography variant="caption" color="textSecondary">{m.where} · {uomLabel(m.uom)}{m.count > 1 ? ` · ${m.count} rows` : ""}</Typography>
                              </TableCell>
                              <TableCell>
                                <ToggleButtonGroup size="small" exclusive value={a.act} onChange={(_, v) => v && setActs((s) => ({ ...s, [m.code]: { ...a, act: v } }))}>
                                  <ToggleButton value="add" disabled={!sheets.length}>Add to NHF</ToggleButton>
                                  <ToggleButton value="norate">Without rate</ToggleButton>
                                  <ToggleButton value="skip">Skip</ToggleButton>
                                </ToggleButtonGroup>
                              </TableCell>
                              <TableCell align="right" sx={{ width: 150 }}>
                                {a.act === "add" ? (
                                  <CustomTextField
                                    size="small"
                                    value={a.rate}
                                    placeholder="0.00"
                                    onChange={(e: any) => setActs((s) => ({ ...s, [m.code]: { ...a, rate: e.target.value } }))}
                                    error={bad}
                                    helperText={bad ? "Enter the rate" : m.file_rate !== null ? `In file: ${money(m.file_rate)}` : undefined}
                                  />
                                ) : (
                                  <Typography variant="caption" color="textSecondary">–</Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Typography variant="body2" color="textSecondary" sx={{ px: 2, py: 1.5 }}>
                    {cnt("add")} to add to NHF · {cnt("norate")} without rate · {cnt("skip")} skipped
                  </Typography>
                </>
              )}
            </Box>

            {/* tree preview */}
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
              <Typography fontWeight={600} sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>What will be imported</Typography>
              {p.tree.map((r) => (
                <Box key={r.name} sx={{ borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ px: 2, py: 1, cursor: "pointer" }} onClick={() => setOpenRooms((o) => ({ ...o, [r.name]: !o[r.name] }))}>
                    {openRooms[r.name] ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                    <Typography className="f-14" fontWeight={600} sx={{ flex: 1 }}>{r.name}</Typography>
                    <Typography variant="caption" color="textSecondary">{r.children.length} groups · {countEls(r)} elements</Typography>
                  </Stack>
                  <Collapse in={!!openRooms[r.name]} unmountOnExit>
                    <Box sx={{ pl: 5, pb: 1 }}>
                      {r.children.map((g) => (
                        <Typography key={g.name} variant="body2" color="textSecondary">{g.name} · {countEls(g)} elements</Typography>
                      ))}
                    </Box>
                  </Collapse>
                </Box>
              ))}
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>Cancel</Button>
        {step === 0 && (
          <Button variant="contained" disabled={!file || busy} onClick={() => read({ sheet: null, head: null, map: null })} startIcon={busy ? <CircularProgress size={16} /> : null}>Next</Button>
        )}
        {step === 1 && (
          <>
            <Button onClick={() => setStep(0)} disabled={busy}>Back</Button>
            <Button variant="contained" disabled={missingCols || busy || !p?.stats.elements} onClick={() => setStep(2)}>Preview</Button>
          </>
        )}
        {step === 2 && (
          <>
            <Button onClick={() => setStep(1)} disabled={busy}>Back</Button>
            <Button variant="contained" disabled={busy} onClick={() => (name.trim() ? doImport() : setNameTried(true))} startIcon={busy ? <CircularProgress size={16} /> : null}>
              {exists ? (mode === "replace" ? "Replace template" : "Update template") : "Create template"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportTemplateDialog;
