"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
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
import { IconFileSpreadsheet, IconUpload } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { NhfSheet, apiMessage, money, uomLabel } from "./types";

type Mapping = Record<string, number>;
type Preview = {
  file_name: string;
  sheets: string[];
  sheet: string;
  header_row: number;
  heading_options: { index: number; label: string }[];
  columns: { index: number; label: string }[];
  mapping: Mapping;
  has_price_column: boolean;
  has_uplift_column: boolean;
  stats: { codes: number; no_rate: number; duplicates: number };
  sample: any[];
  target: { id: number; name: string } | null;
  compare: {
    current_version: number | null;
    current_codes: number;
    added: number;
    changed: number;
    removed: number;
    added_by_hand_not_in_file: { code: string; source_note: string | null }[];
    changes: { code: string; short_name: string; old_rate: number | null; new_rate: number }[];
  } | null;
};

const FIELDS: { key: string; label: string; required?: boolean; help?: string }[] = [
  { key: "code", label: "Code", required: true },
  { key: "rate", label: "Rate (base, no uplift)", required: true },
  { key: "short_name", label: "Short name" },
  { key: "long_description", label: "Long description" },
  { key: "uom", label: "UOM" },
  { key: "element_1", label: "Element 1" },
  { key: "element_2", label: "Element 2" },
  { key: "element_3", label: "Element 3" },
];

interface Props {
  open: boolean;
  /** "Import again" into this sheet; null = upload a new or same-named sheet. */
  target: NhfSheet | null;
  onClose: () => void;
  onImported: (sheetId: number) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

// Upload NHF sheet: 1 Upload (file + effective date) → 2 Map columns → 3 Preview → save as a new version.
const ImportDialog: React.FC<Props> = ({ open, target, onClose, onImported }) => {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [effective, setEffective] = useState(today());
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState<number | null>(null);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [keepAdded, setKeepAdded] = useState(true);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setFile(null);
    setPreview(null);
    setSheetName("");
    setHeaderRow(null);
    setMapping(null);
    setKeepAdded(true);
    setEffective(target?.effective_date || today());
  }, [open, target]);

  const form = (over: { sheet?: string; head?: number | null; map?: Mapping | null } = {}) => {
    const f = new FormData();
    if (file) f.append("file", file);
    const sh = over.sheet !== undefined ? over.sheet : sheetName;
    const hd = over.head !== undefined ? over.head : headerRow;
    const mp = over.map !== undefined ? over.map : mapping;
    if (sh) f.append("sheet_name", sh);
    if (hd !== null && hd !== undefined) f.append("header_row", String(hd));
    if (mp) f.append("mapping", JSON.stringify(mp));
    if (target) f.append("target_sheet_id", String(target.id));
    return f;
  };

  const read = async (over: { sheet?: string; head?: number | null; map?: Mapping | null } = {}) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await api.post("nhf-rates/import/preview", form(over));
      const d: Preview = res.data.data;
      setPreview(d);
      setSheetName(d.sheet);
      setHeaderRow(d.header_row);
      setMapping(d.mapping);
      if (step === 0) setStep(1);
    } catch (e) {
      toast.error(apiMessage(e, "This file could not be read."));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!file || !mapping) return;
    setBusy(true);
    try {
      const f = form();
      f.append("effective_date", effective);
      f.append("keep_added", keepAdded ? "true" : "false");
      const res = await api.post("nhf-rates/import", f);
      toast.success(res.data.message);
      onImported(res.data.data.sheet_id);
    } catch (e) {
      toast.error(apiMessage(e, "The file could not be imported."));
    } finally {
      setBusy(false);
    }
  };

  const missing = !mapping || mapping.code < 0 || mapping.rate < 0;
  const p = preview;
  const nextVersion = p?.compare?.current_version ? p.compare.current_version + 1 : null;

  const targetNote = !p ? null : p.target ? (
    <Alert severity="warning" icon={<IconFileSpreadsheet size={20} />}>
      {target ? (
        <>Import again into <b>{target.name}</b>.</>
      ) : (
        <>A sheet called <b>{p.target.name}</b> already exists.</>
      )}{" "}
      This file becomes <b>{nextVersion ? `v${nextVersion}` : "a new version"}</b>. The current
      {p.compare?.current_version ? ` v${p.compare.current_version}` : " version"} is kept under <b>Versions</b>, so
      you can restore it if this was a mistake.
    </Alert>
  ) : (
    <Alert severity="info" icon={<IconFileSpreadsheet size={20} />}>
      Name in the dropdown: <b>{p.sheet}</b> (sheet tab name). New entry; other uploads stay as they are.
    </Alert>
  );

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{target ? `Import again into ${target.name}` : "Upload NHF sheet"}</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {["Upload", "Map columns", "Preview"].map((l) => (
            <Step key={l}>
              <StepLabel>{l}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {step === 0 && (
          <Stack spacing={2}>
            <Alert severity={target ? "warning" : "info"}>
              {target ? (
                <>
                  Import again into <b>{target.name}</b>. The file becomes a new version (v
                  {(target.current_version?.version ?? 0) + 1}). The current version is kept under <b>Versions</b>.
                </>
              ) : (
                <>
                  The name shown in the dropdown is taken from the <b>sheet tab name</b> (e.g. “NHF 7.2”). A new tab
                  name adds a new entry; an existing tab name makes a new version of that entry.
                </>
              )}
            </Alert>
            <Box>
              <Typography className="f-14" fontWeight={600} mb={0.5}>
                Effective from
              </Typography>
              <CustomTextField type="date" value={effective} onChange={(e: any) => setEffective(e.target.value)} sx={{ maxWidth: 240 }} />
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                The date these rates start. Used when two sheets have the same code.
              </Typography>
            </Box>
            <Box
              component="label"
              sx={{
                border: "1.5px dashed",
                borderColor: "divider",
                borderRadius: 2,
                p: 4,
                textAlign: "center",
                cursor: "pointer",
                "&:hover": { borderColor: "primary.main", bgcolor: "primary.light" },
              }}
            >
              <IconUpload size={28} />
              <Typography fontWeight={600} mt={1}>
                {file ? file.name : "Choose the NHF Excel file"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                .xlsx or .csv
              </Typography>
              <input
                type="file"
                hidden
                accept=".xlsx,.csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Box>
            <Typography variant="subtitle2">Expected layout (like the NHF sheet)</Typography>
            <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {["NHF Code", "Short name", "Long description", "Element 1", "Element 2", "Element 3", "UOM", "Rate"].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>432805</TableCell>
                    <TableCell>carpet:renew to domestic areas</TableCell>
                    <TableCell>Carpet:Renew tight woven…</TableCell>
                    <TableCell>Wall and Floor…</TableCell>
                    <TableCell>Floor Finishes</TableCell>
                    <TableCell>Carpet</TableCell>
                    <TableCell>sm</TableCell>
                    <TableCell align="right">20.88</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="body2" color="text.secondary">
              One row per code. Only <b>Code</b> and <b>Rate</b> are required. <b>Rate</b> is the base rate without
              uplift. Uplift and price columns are not imported; uplift is set on each project.
            </Typography>
          </Stack>
        )}

        {step === 1 && p && mapping && (
          <Stack spacing={2}>
            {targetNote}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography className="f-14" fontWeight={600} mb={0.5}>File</Typography>
                <CustomTextField value={p.file_name} disabled fullWidth />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography className="f-14" fontWeight={600} mb={0.5}>Sheet tab</Typography>
                <CustomTextField
                  select
                  fullWidth
                  value={sheetName}
                  onChange={(e: any) => {
                    setSheetName(e.target.value);
                    read({ sheet: e.target.value, head: null, map: null });
                  }}
                >
                  {p.sheets.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography className="f-14" fontWeight={600} mb={0.5}>Heading row</Typography>
                <CustomTextField
                  select
                  fullWidth
                  value={headerRow ?? 0}
                  onChange={(e: any) => {
                    const h = Number(e.target.value);
                    setHeaderRow(h);
                    read({ head: h, map: null });
                  }}
                >
                  {p.heading_options.map((o) => (
                    <MenuItem key={o.index} value={o.index}>
                      Row {o.index + 1}: {o.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
              {FIELDS.map((f) => (
                <Grid key={f.key} size={{ xs: 12, sm: 6 }}>
                  <Typography className="f-14" fontWeight={600} mb={0.5}>
                    {f.label} {f.required && <Box component="span" color="error.main">*</Box>}
                  </Typography>
                  <CustomTextField
                    select
                    fullWidth
                    value={mapping[f.key] ?? -1}
                    onChange={(e: any) => {
                      const next = { ...mapping, [f.key]: Number(e.target.value) };
                      setMapping(next);
                      read({ map: next });
                    }}
                  >
                    <MenuItem value={-1}>{f.required ? "– choose –" : "– none –"}</MenuItem>
                    {p.columns.map((c) => (
                      <MenuItem key={c.index} value={c.index}>{c.label}</MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>
              ))}
            </Grid>
            {(p.has_price_column || p.has_uplift_column) && (
              <Alert severity="info">
                This file also has <b>UPLIFT</b> and <b>PRICE</b> columns. They are not imported: we import the base{" "}
                <b>RATE</b> only, and the uplift is set on each project.
              </Alert>
            )}
            {missing ? (
              <Alert severity="error">Choose the <b>Code</b> and <b>Rate</b> columns to continue.</Alert>
            ) : (
              <>
                <Typography variant="subtitle2">First rows read with this mapping</Typography>
                <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Code</TableCell>
                        <TableCell>Short name</TableCell>
                        <TableCell>Element 1</TableCell>
                        <TableCell>UOM</TableCell>
                        <TableCell align="right">Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {p.sample.slice(0, 5).map((r) => (
                        <TableRow key={r.code}>
                          <TableCell>{r.code}</TableCell>
                          <TableCell>{r.short_name || (r.long_description || "").slice(0, 80)}</TableCell>
                          <TableCell>{r.element_1 || "–"}</TableCell>
                          <TableCell>{uomLabel(r.uom)}</TableCell>
                          <TableCell align="right">{money(r.rate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Stack>
        )}

        {step === 2 && p && (
          <Stack spacing={2}>
            {targetNote}
            <Box>
              <Typography className="f-14" fontWeight={600} mb={0.5}>Effective from</Typography>
              <CustomTextField type="date" value={effective} onChange={(e: any) => setEffective(e.target.value)} sx={{ maxWidth: 240 }} />
            </Box>
            <Grid container spacing={1.5}>
              {[
                ["Codes to import", p.stats.codes],
                ...(p.compare
                  ? [
                      ["New codes", p.compare.added],
                      ["Rate changed", p.compare.changed],
                      ["Removed (not in file)", p.compare.removed],
                    ]
                  : []),
                ...(p.stats.no_rate ? [["Without a rate (skipped)", p.stats.no_rate]] : []),
                ...(p.stats.duplicates ? [["Duplicate codes (first kept)", p.stats.duplicates]] : []),
              ].map(([l, n]) => (
                <Grid key={String(l)} size={{ xs: 6, sm: 4 }}>
                  <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">{l}</Typography>
                    <Typography variant="h5">{Number(n).toLocaleString("en-GB")}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            {!!p.compare?.added_by_hand_not_in_file.length && (
              <Alert severity="warning">
                <b>
                  {p.compare.added_by_hand_not_in_file.length}{" "}
                  {p.compare.added_by_hand_not_in_file.length === 1 ? "code was" : "codes were"} added by hand or from a
                  template
                </b>{" "}
                and {p.compare.added_by_hand_not_in_file.length === 1 ? "is" : "are"} not in this file (
                {p.compare.added_by_hand_not_in_file.slice(0, 4).map((x) => x.code).join(", ")}
                {p.compare.added_by_hand_not_in_file.length > 4 ? "…" : ""}).
                <Box mt={1}>
                  <ToggleButtonGroup size="small" exclusive value={keepAdded ? "keep" : "remove"} onChange={(_, v) => v && setKeepAdded(v === "keep")}>
                    <ToggleButton value="keep">Keep them</ToggleButton>
                    <ToggleButton value="remove">Remove them</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Alert>
            )}
            {!!p.compare?.removed && (
              <Alert severity="warning">
                {p.compare.removed.toLocaleString("en-GB")} codes are not in the new version. Template lines with those
                codes will show <b>no rate</b> unless another sheet has them. They stay in v{p.compare.current_version}{" "}
                under Versions.
              </Alert>
            )}
            <Typography variant="subtitle2">{p.compare?.changes.length ? `Rate changes (first ${p.compare.changes.length})` : "Preview"}</Typography>
            <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  {p.compare?.changes.length ? (
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Short name</TableCell>
                      <TableCell align="right">Old</TableCell>
                      <TableCell align="right">New</TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Short name</TableCell>
                      <TableCell>Element 1</TableCell>
                      <TableCell>UOM</TableCell>
                      <TableCell align="right">Rate</TableCell>
                    </TableRow>
                  )}
                </TableHead>
                <TableBody>
                  {p.compare?.changes.length
                    ? p.compare.changes.map((c) => (
                        <TableRow key={c.code}>
                          <TableCell>{c.code}</TableCell>
                          <TableCell>{c.short_name}</TableCell>
                          <TableCell align="right">{money(c.old_rate)}</TableCell>
                          <TableCell align="right"><b>{money(c.new_rate)}</b></TableCell>
                        </TableRow>
                      ))
                    : p.sample.map((r) => (
                        <TableRow key={r.code}>
                          <TableCell>{r.code}</TableCell>
                          <TableCell>{r.short_name || (r.long_description || "").slice(0, 80)}</TableCell>
                          <TableCell>{r.element_1 || "–"}</TableCell>
                          <TableCell>{uomLabel(r.uom)}</TableCell>
                          <TableCell align="right">{money(r.rate)}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
            {!p.stats.codes && <Alert severity="error">No codes were found. Go back and check the column mapping.</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>Cancel</Button>
        {step === 0 && (
          <Button variant="contained" disabled={!file || busy} onClick={() => read({ sheet: "", head: null, map: null })} startIcon={busy ? <CircularProgress size={16} /> : null}>
            Next
          </Button>
        )}
        {step === 1 && (
          <>
            <Button onClick={() => setStep(0)} disabled={busy}>Back</Button>
            <Button variant="contained" disabled={missing || busy} onClick={() => setStep(2)}>Preview</Button>
          </>
        )}
        {step === 2 && (
          <>
            <Button onClick={() => setStep(1)} disabled={busy}>Back</Button>
            <Button variant="contained" disabled={!p?.stats.codes || busy} onClick={save} startIcon={busy ? <CircularProgress size={16} /> : null}>
              {p?.target && nextVersion ? `Save as v${nextVersion}` : `Import ${p?.stats.codes.toLocaleString("en-GB")} codes`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;
