"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Autocomplete,
  Box,
  Button,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import Alert from "@/app/components/apps/surveys/shared/SurveyAlert";
import { IconArrowBackUp, IconArrowLeft, IconBan, IconCheck, IconChecks, IconEdit, IconLockOpen, IconPhoto, IconSearch } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import BlankCard from "@/app/components/shared/BlankCard";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "@/app/components/apps/inventory-new/shared/FormDrawer";
import FormField from "@/app/components/apps/inventory-new/shared/FormField";
import ConfirmDialog from "@/app/components/apps/inventory-new/shared/ConfirmDialog";
import { StatTile } from "@/app/components/apps/vehicles/shared/common";
import { PhotoThumbs } from "@/app/components/apps/vehicles/shared";
import { apiMessage, uomLabel } from "../settings/nhf-rates/types";
import { NhfHit } from "../settings/templates/types";
import { dateTime } from "../list/types";
import { LINE_META, QsDetail, QsLine, RATE_SOURCE, gbp } from "./types";
import Chip from "@/app/components/apps/surveys/shared/SurveyChip";
import { WARN_TEXT } from "@/app/components/apps/surveys/shared/colors";

type Filter = "all" | "pending" | "approved" | "excluded" | "no_rate" | "changed";
const qtyText = (q: number | null, u: string | null) => (q === null ? "–" : `${q.toLocaleString("en-GB")} ${uomLabel(u)}`);

// ---------- edit one line ----------
const LineDrawer: React.FC<{ line: QsLine | null; uplift: number; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<boolean> }> = ({
  line,
  uplift,
  onClose,
  onSave,
}) => {
  const [code, setCode] = useState<NhfHit | null>(null);
  const [codeText, setCodeText] = useState("");
  const [useSurveyCode, setUseSurveyCode] = useState(true);
  const [hits, setHits] = useState<NhfHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [qty, setQty] = useState("");
  const [rateMode, setRateMode] = useState<"auto" | "manual">("auto");
  const [rate, setRate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!line) return;
    setCode(null);
    setCodeText("");
    setUseSurveyCode(!line.code_changed);
    setQty(line.qty === null ? "" : String(line.qty));
    setRateMode(line.rate_source === "manual" ? "manual" : "auto");
    setRate(line.rate_source === "manual" && line.rate !== null ? String(line.rate) : "");
    setNote(line.note ?? "");
    setErr("");
  }, [line]);

  useEffect(() => {
    if (!line || codeText.trim().length < 2) return setHits([]);
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`nhf-rates/search?${new URLSearchParams({ q: codeText.trim(), limit: "20" })}`);
        setHits(res.data.data);
      } catch {
        setHits([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [codeText, line]);

  if (!line) return null;
  const effectiveRate = rateMode === "manual" ? (rate === "" ? null : Number(rate)) : code ? code.rate : line.rate_source === "manual" ? line.nhf?.rate ?? line.template_rate : line.rate;
  const q = qty === "" ? null : Number(qty);
  const preview = effectiveRate !== null && q !== null && !Number.isNaN(q) ? Math.round(q * effectiveRate * (1 + uplift / 100) * 100) / 100 : null;

  const body = () => {
    const b: Record<string, unknown> = { note };
    if (code) b.code = code.code;
    else if (useSurveyCode && line.code_changed) b.code = "";
    if (q === null || q === line.surveyor.qty) {
      if (line.qty_changed) b.qty = null;
    } else b.qty = q;
    if (rateMode === "manual") b.rate = rate === "" ? null : Number(rate);
    else if (line.rate_source === "manual") b.rate = null;
    return b;
  };
  const save = async (approve: boolean) => {
    if (q !== null && !(q > 0)) return setErr("The quantity must be more than 0");
    if (rateMode === "manual" && (rate === "" || Number.isNaN(Number(rate)))) return setErr("Enter the manual rate");
    setErr("");
    setBusy(true);
    const ok = await onSave({ ...body(), ...(approve ? { status: "approved" } : {}) });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <FormDrawer
      open={!!line}
      title="Price this line"
      width={560}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
      isSaving={busy}
      submitLabel="Save"
      secondaryAction={{ label: "Save and approve", onClick: () => save(true) }}
    >
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Typography variant="caption" color="textSecondary">
          {[line.room, ...line.path, line.element].join(" › ")}
        </Typography>
        <Typography fontWeight={700}>{line.work_name}</Typography>
        <Typography className="f-14" color="textSecondary">
          Surveyor: {qtyText(line.surveyor.qty, line.surveyor.unit)} · {line.surveyor.qty_status === "ver" ? "Verified" : "Estimated"}
          {line.surveyor.vo === "VO" ? " · VO" : ""}
          {line.surveyor.also_rooms.length ? ` · also in ${line.surveyor.also_rooms.join(", ")}` : ""}
        </Typography>
        {line.surveyor.note && (
          <Typography className="f-14" mt={0.5}>
            “{line.surveyor.note}”
          </Typography>
        )}
        {!!line.photos.length && (
          <Box mt={1}>
            <PhotoThumbs photos={line.photos.map((p) => p.url ?? "Photo")} size={52} />
          </Box>
        )}
      </Paper>

      <FormField label="NHF code">
        <Stack spacing={0.75}>
          <Typography className="f-14">
            {code ? (
              <>
                New code <b>{code.code}</b> · {code.short_name ?? ""} · {gbp(code.rate)} / {uomLabel(code.uom)} · {code.sheet_name}
              </>
            ) : line.code ? (
              <>
                <b>{line.code}</b>
                {line.nhf ? ` · ${line.nhf.short_name ?? ""} · ${gbp(line.nhf.rate)} / ${uomLabel(line.nhf.uom)} · ${line.nhf.sheet}` : " · not in NHF rates"}
                {line.code_changed ? " (changed by the QS)" : ""}
              </>
            ) : (
              "No code"
            )}
          </Typography>
          <Autocomplete
            size="small"
            options={hits}
            value={code}
            onChange={(_, v) => setCode(v)}
            inputValue={codeText}
            onInputChange={(_, v) => setCodeText(v)}
            filterOptions={(x) => x}
            loading={searching}
            getOptionLabel={(o) => `${o.code} · ${o.short_name ?? ""}`}
            isOptionEqualToValue={(a, b) => a.code === b.code && a.sheet_id === b.sheet_id}
            getOptionKey={(o) => `${o.sheet_id}-${o.code}`}
            noOptionsText={codeText.trim().length < 2 ? "Type a code or words" : "No NHF code found"}
            renderOption={(props, o) => {
              const { key: _k, ...rest } = props as any;
              return (
                <Box component="li" key={`${o.sheet_id}-${o.code}`} {...rest}>
                  <Box>
                    <Typography className="f-14" fontWeight={600}>
                      {o.code} · {o.short_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {gbp(o.rate)} / {uomLabel(o.uom)} · {o.sheet_name}
                    </Typography>
                  </Box>
                </Box>
              );
            }}
            renderInput={(params) => (
              <CustomTextField
                {...params}
                placeholder="Change code: type a code or words, e.g. worktop"
                slotProps={{ ...(params as any).slotProps, input: { ...params.InputProps, endAdornment: <InputAdornment position="end"><IconSearch size={16} /></InputAdornment> } }}
              />
            )}
          />
          {(line.code_changed || code) && (
            <Link
              component="button"
              type="button"
              className="f-14"
              onClick={() => {
                setCode(null);
                setUseSurveyCode(true);
              }}
              sx={{ alignSelf: "flex-start" }}
            >
              Use the code from the survey
            </Link>
          )}
        </Stack>
      </FormField>

      <FormField label="Quantity" hint={`Surveyor: ${qtyText(line.surveyor.qty, line.surveyor.unit)}. Leave it as it is to keep the surveyor's quantity.`}>
        <CustomTextField
          fullWidth
          value={qty}
          onChange={(e: any) => /^\d{0,8}(\.\d{0,3})?$/.test(e.target.value) && setQty(e.target.value)}
          slotProps={{ input: { endAdornment: <InputAdornment position="end">{uomLabel(line.unit)}</InputAdornment> } }}
        />
        {line.uom_mismatch && (
          <Typography variant="caption" color={WARN_TEXT} display="block">
            The NHF code is priced per {uomLabel(line.nhf?.uom)}, the surveyor measured in {uomLabel(line.unit)}.
          </Typography>
        )}
      </FormField>

      <FormField label="Rate (before uplift)">
        <ToggleButtonGroup exclusive size="small" value={rateMode} onChange={(_, v) => v && setRateMode(v)} sx={{ mb: 1 }}>
          <ToggleButton value="auto">{line.template_rate !== null && !line.nhf && !code ? "Template rate" : "NHF rate"}</ToggleButton>
          <ToggleButton value="manual">Manual rate</ToggleButton>
        </ToggleButtonGroup>
        {rateMode === "manual" ? (
          <CustomTextField
            fullWidth
            value={rate}
            placeholder="0.00"
            onChange={(e: any) => /^-?\d{0,8}(\.\d{0,4})?$/.test(e.target.value) && setRate(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">£</InputAdornment> } }}
          />
        ) : (
          <Typography className="f-14" color={effectiveRate === null ? WARN_TEXT : "textPrimary"}>
            {effectiveRate === null ? "No rate for this code. Pick another code or use a manual rate." : `${gbp(effectiveRate)} per ${uomLabel(code?.uom ?? line.nhf?.uom ?? line.unit)}`}
          </Typography>
        )}
      </FormField>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, backgroundColor: "primary.light" }}>
        <Typography variant="caption" color="textSecondary">
          Amount = quantity × rate × (1 + uplift {uplift}%)
        </Typography>
        <Typography variant="h6" fontWeight={700}>
          {preview === null ? "No price yet" : gbp(preview)}
        </Typography>
      </Paper>

      <FormField label="Note (optional)">
        <CustomTextField fullWidth multiline minRows={2} value={note} onChange={(e: any) => setNote(e.target.value.slice(0, 2000))} placeholder="Why the code, quantity or rate changed" />
      </FormField>
      {err && <Alert severity="error">{err}</Alert>}
    </FormDrawer>
  );
};

// ---------- note dialog (rework / reopen) and exclude dialog ----------
const NoteDialog: React.FC<{ open: boolean; title: string; text: string; label: string; button: string; color?: "primary" | "error"; onClose: () => void; onSave: (notes: string) => Promise<boolean> }> = ({
  open,
  title,
  text,
  label,
  button,
  color = "primary",
  onClose,
  onSave,
}) => {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (open) {
      setNotes("");
      setErr("");
    }
  }, [open]);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography color="textSecondary" className="f-14" mb={1.5}>
          {text}
        </Typography>
        <FormField label={label}>
          <CustomTextField fullWidth multiline minRows={3} autoFocus value={notes} onChange={(e: any) => setNotes(e.target.value.slice(0, 2000))} error={!!err} helperText={err} />
        </FormField>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={color}
          disabled={busy}
          onClick={async () => {
            if (!notes.trim()) return setErr("Write a note");
            setBusy(true);
            const ok = await onSave(notes.trim());
            setBusy(false);
            if (ok) onClose();
          }}
        >
          {button}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ExcludeDialog: React.FC<{ line: QsLine | null; reasons: string[]; onClose: () => void; onSave: (reason: string, note: string) => Promise<boolean> }> = ({ line, reasons, onClose, onSave }) => {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setReason("");
    setNote("");
  }, [line]);
  return (
    <Dialog open={!!line} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Exclude line</DialogTitle>
      <DialogContent>
        <Typography className="f-14" color="textSecondary" mb={1.5}>
          {line?.work_name} · {line?.room}. An excluded line is not priced and not in the total.
        </Typography>
        <FormField label="Reason *">
          <TextField select fullWidth size="small" value={reason} onChange={(e) => setReason(e.target.value)}>
            {reasons.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
        </FormField>
        <Box mt={2}>
          <FormField label="Note (optional)">
            <CustomTextField fullWidth multiline minRows={2} value={note} onChange={(e: any) => setNote(e.target.value.slice(0, 2000))} />
          </FormField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={!reason || busy}
          onClick={async () => {
            setBusy(true);
            const ok = await onSave(reason, note);
            setBusy(false);
            if (ok) onClose();
          }}
        >
          Exclude
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ---------- the workspace ----------
const QsWorkspace: React.FC<{ surveyId: number }> = ({ surveyId }) => {
  const router = useRouter();
  const [d, setD] = useState<QsDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [edit, setEdit] = useState<QsLine | null>(null);
  const [exclude, setExclude] = useState<QsLine | null>(null);
  const [ask, setAsk] = useState<"rework" | "reopen" | "complete" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`survey-qs/${surveyId}`);
      setD(res.data.data);
    } catch (e: any) {
      if ([400, 404].includes(e?.response?.status)) setMissing(true);
      else toast.error(apiMessage(e, "Could not load the review."));
    }
  }, [surveyId]);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<any>, fallback: string) => {
    setBusy(true);
    try {
      const res = await fn();
      toast.success(res.data.message);
      await load();
      setBusy(false);
      return true;
    } catch (e) {
      toast.error(apiMessage(e, fallback));
      setBusy(false);
      return false;
    }
  };
  const saveLine = (itemId: number, body: Record<string, unknown>) => run(() => api.put(`survey-qs/${surveyId}/lines/${itemId}`, body), "Could not save the line.");

  const shown = useMemo(() => {
    if (!d) return [];
    return d.lines.filter((l) =>
      filter === "all" ? true : filter === "no_rate" ? l.rate === null && l.status !== "excluded" : filter === "changed" ? l.changed_after_review : l.status === filter,
    );
  }, [d, filter]);

  if (missing)
    return (
      <BlankCard>
        <CardContent sx={{ textAlign: "center", py: 6 }}>
          <Typography variant="h6" mb={1}>
            Survey not found
          </Typography>
          <Button variant="contained" onClick={() => router.push("/apps/surveys/qs")}>
            Back to QS review
          </Button>
        </CardContent>
      </BlankCard>
    );
  if (!d)
    return (
      <BlankCard>
        <CardContent sx={{ textAlign: "center", py: 8 }}>
          <CircularProgress size={28} />
        </CardContent>
      </BlankCard>
    );

  const s = d.survey;
  const t = d.totals;
  const readyToApprove = d.lines.filter((l) => l.status === "pending" && l.amount !== null).length;
  const rooms = [...new Set(shown.map((l) => l.room))];

  return (
    <BlankCard>
      <CardContent sx={{ pt: 1.5 }}>
        {/* header */}
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5} minWidth={0}>
            <Tooltip title="Back to QS review">
              <IconButton onClick={() => router.push("/apps/surveys/qs")}>
                <IconArrowLeft />
              </IconButton>
            </Tooltip>
            <Box minWidth={0}>
              <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
                {s.reference} · {s.title}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mt={0.5}>
                <Chip size="small" color={s.status === "qs_review" ? "primary" : s.status === "completed" ? "success" : s.status === "submitted" ? "warning" : "default"} label={s.status_label} />
                <Typography variant="body2" color="textSecondary">
                  {s.address?.name ?? "–"} · {s.project?.name ?? ""} · Surveyor {s.surveyor?.name ?? "–"}
                </Typography>
                <Link component="button" className="f-14" onClick={() => router.push(`/apps/surveys/view/${s.id}`)}>
                  Open survey
                </Link>
              </Stack>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {d.can_start && (
              <Button variant="contained" disabled={busy} onClick={() => run(() => api.post(`survey-qs/${s.id}/start`), "Could not start the review.")}>
                Start review
              </Button>
            )}
            {d.can_rework && (
              <Button variant="outlined" color="error" startIcon={<IconArrowBackUp size={16} />} onClick={() => setAsk("rework")}>
                Send back for rework
              </Button>
            )}
            {d.can_edit && (
              <Tooltip title={d.can_complete ? "" : "Review every line first: approve or exclude it"}>
                <span>
                  <Button variant="contained" color="success" startIcon={<IconChecks size={16} />} disabled={!d.can_complete || busy} onClick={() => setAsk("complete")}>
                    Complete review
                  </Button>
                </span>
              </Tooltip>
            )}
            {d.can_reopen && (
              <Button variant="outlined" startIcon={<IconLockOpen size={16} />} onClick={() => setAsk("reopen")}>
                Reopen
              </Button>
            )}
          </Stack>
        </Stack>

        {s.status === "submitted" && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Submitted by {s.surveyor?.name ?? "the surveyor"}
            {s.submitted_at ? ` on ${dateTime(s.submitted_at)}` : ""}. Start the review to price the lines. The project uplift ({d.uplift_percent}%) is fixed for this survey when the review starts.
          </Alert>
        )}
        {s.status === "in_progress" && s.rework_notes && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Sent back to the surveyor for rework: {s.rework_notes}
          </Alert>
        )}
        {s.status === "completed" && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Review completed{s.qs_completed_by ? ` by ${s.qs_completed_by}` : ""}
            {s.qs_completed_at ? ` on ${dateTime(s.qs_completed_at)}` : ""}. Prices are locked; reopen the review to change them.
          </Alert>
        )}
        {t.changed_after_review > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {t.changed_after_review} {t.changed_after_review === 1 ? "line was" : "lines were"} changed by the surveyor after the rework and {t.changed_after_review === 1 ? "is" : "are"} back to review. Other lines keep their decision.
          </Alert>
        )}

        {/* totals */}
        <Grid container spacing={2} mt={0.5}>
          <Grid size={{ xs: 6, md: 2 }}>
            <StatTile label="Lines reviewed" value={`${t.approved + t.excluded} / ${t.lines}`} sub={`${t.approved} approved · ${t.excluded} excluded`} />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <StatTile label="Net" value={gbp(t.net)} sub="quantity × rate" />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <StatTile label={`Uplift ${d.uplift_percent}%`} value={gbp(t.uplift)} sub="project uplift" />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <StatTile label="Total ex VAT" value={gbp(t.total)} sub="approved lines" />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <StatTile
              label="VAT 20%"
              value={t.vat_on ? gbp(t.vat) : "–"}
              sub={
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Switch size="small" checked={t.vat_on} disabled={!d.can_edit || busy} onChange={(e) => run(() => api.put(`survey-qs/${s.id}/vat`, { vat: e.target.checked }), "Could not change VAT.")} />
                  <span>{t.vat_on ? "added" : "not added"}</span>
                </Stack>
              }
            />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", height: "100%", borderColor: "primary.main", backgroundColor: "primary.light" }}>
              <Typography variant="caption" color="textSecondary" sx={{ textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>
                Grand total
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {gbp(t.grand_total)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {t.vat_on ? "inc VAT" : "ex VAT"}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* filters */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} mt={3} mb={1.5} alignItems={{ sm: "center" }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {(
              [
                ["all", `All · ${t.lines}`],
                ["pending", `To review · ${t.pending}`],
                ["approved", `Approved · ${t.approved}`],
                ["excluded", `Excluded · ${t.excluded}`],
                ["no_rate", `No rate · ${t.no_rate}`],
                ...(t.changed_after_review ? [["changed", `Changed by surveyor · ${t.changed_after_review}`]] : []),
              ] as [Filter, string][]
            ).map(([k, l]) => (
              <Chip key={k} label={l} clickable color={filter === k ? "primary" : "default"} variant={filter === k ? "filled" : "outlined"} onClick={() => setFilter(k)} />
            ))}
          </Stack>
          {d.can_edit && (
            <Button
              variant="outlined"
              startIcon={<IconChecks size={16} />}
              disabled={!readyToApprove || busy}
              sx={{ ml: { sm: "auto" } }}
              onClick={() => run(() => api.post(`survey-qs/${s.id}/approve-priced`), "Could not approve the lines.")}
            >
              Approve all priced ({readyToApprove})
            </Button>
          )}
        </Stack>

        {/* lines */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Element", "Work", "Code", "Qty", "Rate", "Amount", "Status", ""].map((h, i) => (
                  <TableCell key={i} align={["Qty", "Rate", "Amount"].includes(h) ? "right" : "left"} sx={{ py: 1.25, whiteSpace: "nowrap" }}>
                    <Typography variant="subtitle2">{h}</Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms.map((room) => (
                <Fragment key={room}>
                  <TableRow>
                    <TableCell colSpan={8} sx={{ backgroundColor: "grey.100", py: 0.75 }}>
                      <Typography className="f-14" fontWeight={700}>
                        {room}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {shown
                    .filter((l) => l.room === room)
                    .map((l) => {
                      const m = LINE_META[l.status];
                      return (
                        <TableRow key={l.item_id} hover sx={{ opacity: l.status === "excluded" ? 0.6 : 1 }}>
                          <TableCell sx={{ minWidth: 150 }}>
                            <Typography className="f-14">{l.element}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {l.path.length ? l.path.join(" › ") : "In the room"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ minWidth: 200 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Typography className="f-14" fontWeight={600}>
                                {l.work_name}
                              </Typography>
                              {l.surveyor.vo === "VO" && <Chip size="small" color="error" variant="outlined" label="VO" sx={{ height: 20 }} />}
                              {l.ai_suggested && <Chip size="small" color="secondary" variant="outlined" label="AI" sx={{ height: 20 }} />}
                              {l.added_on_site && <Chip size="small" variant="outlined" label="Added on site" sx={{ height: 20 }} />}
                              {l.changed_after_review && <Chip size="small" color="warning" label="Changed after rework" sx={{ height: 20 }} />}
                            </Stack>
                            <Typography variant="caption" color="textSecondary" display="block">
                              Surveyor {qtyText(l.surveyor.qty, l.surveyor.unit)} · {l.surveyor.qty_status === "ver" ? "Verified" : "Estimated"}
                              {l.photos.length ? ` · ${l.photos.length} photo${l.photos.length === 1 ? "" : "s"}` : ""}
                            </Typography>
                            {l.surveyor.note && (
                              <Typography variant="caption" display="block">
                                “{l.surveyor.note}”
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {l.code ? (
                              <>
                                <Typography className="f-14" fontWeight={600}>
                                  {l.code}
                                  {l.code_changed && (
                                    <Typography component="span" variant="caption" color="primary">
                                      {" "}
                                      changed
                                    </Typography>
                                  )}
                                </Typography>
                                <Typography variant="caption" color={l.nhf ? "textSecondary" : WARN_TEXT}>
                                  {l.nhf ? l.nhf.short_name : "Not in NHF"}
                                </Typography>
                              </>
                            ) : (
                              <Typography variant="caption" color="textSecondary">
                                No code
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                            <Typography className="f-14" fontWeight={l.qty_changed ? 700 : 400}>
                              {qtyText(l.qty, l.unit)}
                            </Typography>
                            {l.qty_changed && <Typography variant="caption" color="primary">changed by QS</Typography>}
                            {l.uom_mismatch && (
                              <Tooltip title={`NHF priced per ${uomLabel(l.nhf?.uom)}`}>
                                <Typography variant="caption" color={WARN_TEXT} display="block">
                                  unit differs
                                </Typography>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                            <Typography className="f-14" color={l.rate === null ? WARN_TEXT : "textPrimary"}>
                              {l.rate === null ? "No rate" : gbp(l.rate)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {l.rate === null ? "" : RATE_SOURCE[l.rate_source]}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                            <Typography className="f-14" fontWeight={700}>
                              {l.status === "excluded" ? "–" : gbp(l.amount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" color={m.color} variant={l.status === "pending" ? "outlined" : "filled"} label={m.label} />
                            {l.reason && (
                              <Typography variant="caption" color="textSecondary" display="block">
                                {l.reason}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {d.can_edit && (
                              <Stack direction="row" spacing={0.25}>
                                {l.status !== "approved" && (
                                  <Tooltip title={l.amount === null ? "Add a rate first" : "Approve"}>
                                    <span>
                                      <IconButton color="success" disabled={l.amount === null || busy} onClick={() => saveLine(l.item_id, { status: "approved" })}>
                                        <IconCheck size={18} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                )}
                                {l.status !== "excluded" && (
                                  <Tooltip title="Exclude">
                                    <IconButton color="error" onClick={() => setExclude(l)}>
                                      <IconBan size={18} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {l.status !== "pending" && (
                                  <Tooltip title="Back to review">
                                    <IconButton onClick={() => saveLine(l.item_id, { status: "pending" })}>
                                      <IconArrowBackUp size={18} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="Change code, quantity or rate">
                                  <IconButton color="primary" onClick={() => setEdit(l)}>
                                    <IconEdit size={18} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            )}
                            {!d.can_edit && !!l.photos.length && <IconPhoto size={16} style={{ opacity: 0.5 }} />}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </Fragment>
              ))}
              {!shown.length && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="textSecondary">{d.lines.length ? "No line matches this filter." : "This survey has no works to price."}</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="textSecondary" display="block" mt={1}>
          Rates come from NHF rates (newest effective date wins) or the template; amounts include the {d.uplift_percent}% project uplift and are rounded to 2 decimals per line.
        </Typography>
      </CardContent>

      <LineDrawer line={edit} uplift={d.uplift_percent} onClose={() => setEdit(null)} onSave={(body) => saveLine(edit!.item_id, body)} />
      <ExcludeDialog line={exclude} reasons={d.exclude_reasons} onClose={() => setExclude(null)} onSave={(reason, note) => saveLine(exclude!.item_id, { status: "excluded", reason, note })} />
      <NoteDialog
        open={ask === "rework"}
        title={`Send ${s.reference} back for rework`}
        text={`${s.surveyor?.name ?? "The surveyor"} gets a notification and sees your note in the app. Lines you already reviewed keep their decision unless the surveyor changes them.`}
        label="What should the surveyor check or change? *"
        button="Send back"
        color="error"
        onClose={() => setAsk(null)}
        onSave={(notes) => run(() => api.post(`survey-qs/${s.id}/rework`, { notes }), "Could not send the survey back.")}
      />
      <NoteDialog
        open={ask === "reopen"}
        title={`Reopen ${s.reference}`}
        text="The prices become editable again. Complete the review again when you are done."
        label="Why is it reopened? *"
        button="Reopen"
        onClose={() => setAsk(null)}
        onSave={(notes) => run(() => api.post(`survey-qs/${s.id}/reopen`, { notes }), "Could not reopen the review.")}
      />
      <ConfirmDialog
        open={ask === "complete"}
        title={`Complete review of ${s.reference}`}
        confirmLabel="Complete review"
        confirmColor="success"
        busy={busy}
        onClose={() => setAsk(null)}
        onConfirm={async () => {
          if (await run(() => api.post(`survey-qs/${s.id}/complete`), "Could not complete the review.")) setAsk(null);
        }}
        message={
          <>
            {t.approved} approved and {t.excluded} excluded lines. Total <b>{gbp(t.total)}</b> ex VAT{t.vat_on ? <> · <b>{gbp(t.grand_total)}</b> inc VAT</> : null}. The prices are then locked.
          </>
        }
      />
    </BlankCard>
  );
};

export default QsWorkspace;
