"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import Alert from "@/app/components/apps/surveys/shared/SurveyAlert";
import { IconCheck, IconSearch, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "@/app/components/apps/inventory-new/shared/FormDrawer";
import FormField from "@/app/components/apps/inventory-new/shared/FormField";
import { NhfSheet, UOM_OPTIONS, apiMessage, money, uomLabel } from "../nhf-rates/types";
import { NhfHit, TemplateDetail, TplElement, TplNode, TplSkipped, pathOf } from "./types";
import Chip from "@/app/components/apps/surveys/shared/SurveyChip";

// ---------- one name: new template, rename template, add / rename a room or group ----------
export const NameDrawer: React.FC<{
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  hint?: string;
  initial?: string;
  submitLabel?: string;
  onClose: () => void;
  onSave: (name: string) => Promise<string | null>; // returns an error message, or null when saved
}> = ({ open, title, label, placeholder, hint, initial = "", submitLabel = "Save", onClose, onSave }) => {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setName(initial);
      setErr("");
    }
  }, [open, initial]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr(`Enter the ${label.toLowerCase()}`);
    setBusy(true);
    const m = await onSave(name.trim());
    setBusy(false);
    if (m) setErr(m);
  };
  return (
    <FormDrawer open={open} title={title} onClose={onClose} onSubmit={submit} isSaving={busy} submitLabel={submitLabel}>
      <FormField label={`${label} *`} hint={err ? undefined : hint}>
        <CustomTextField
          fullWidth
          size="small"
          autoFocus
          value={name}
          placeholder={placeholder}
          onChange={(e: any) => {
            setName(e.target.value);
            setErr("");
          }}
          error={!!err}
          helperText={err || undefined}
        />
      </FormField>
    </FormDrawer>
  );
};

// ---------- add / edit an element ----------
type Mode = "nhf" | "custom";
const emptyForm = { name: "", uom: "it", default_qty: "", vo_main: "Main" as "Main" | "VO", comment: "", description: "", code: "", rate: "", addTo: "" };

export const ElementDrawer: React.FC<{
  open: boolean;
  template: TemplateDetail;
  /** Room or group the new element goes into (the drawer lets the user pick another place in the same room). */
  nodeId: number | null;
  element: TplElement | null;
  sheets: NhfSheet[];
  onClose: () => void;
  onSaved: (message: string) => void;
  onSkippedChanged: () => void;
}> = ({ open, template, nodeId, element, sheets, onClose, onSaved, onSkippedChanged }) => {
  const [mode, setMode] = useState<Mode>("nhf");
  const [place, setPlace] = useState<number | null>(null);
  const [sheetFilter, setSheetFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<NhfHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<NhfHit | null>(null);
  const [f, setF] = useState(emptyForm);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [skId, setSkId] = useState<number | null>(null);
  const [skAll, setSkAll] = useState(false);

  const path = useMemo(() => pathOf(template.rooms, element ? element.node_id : nodeId ?? 0), [template, element, nodeId]);
  const room = path[0];
  // every place in this room (the room itself and its groups)
  const places = useMemo(() => {
    const out: { id: number; label: string }[] = [];
    const walk = (n: TplNode, p: string[]) => {
      out.push({ id: n.id, label: [...p, n.name].join(" › ") });
      n.children.forEach((c) => walk(c, [...p, n.name]));
    };
    if (room) walk(room, []);
    return out;
  }, [room]);
  const newestSheet = sheets.length ? [...sheets].sort((a, b) => (b.effective_date ?? "").localeCompare(a.effective_date ?? ""))[0] : null;

  useEffect(() => {
    if (!open) return;
    setErr({});
    setQ("");
    setHits(null);
    setSkId(null);
    setSkAll(false);
    setSheetFilter("");
    if (element) {
      setPlace(element.node_id);
      const found = element.nhf && element.nhf.found ? element.nhf : null;
      setMode(found || !element.code ? (found ? "nhf" : "custom") : "custom");
      setPicked(found ? { code: element.code as string, short_name: found.short_name, element_1: null, uom: found.uom, rate: found.rate, sheet_id: found.sheet_id, sheet_name: found.sheet_name } : null);
      setF({
        name: element.name,
        uom: element.uom ?? "it",
        default_qty: element.default_qty === null ? "" : String(element.default_qty),
        vo_main: element.vo_main,
        comment: element.comment ?? "",
        description: found ? "" : element.description ?? "",
        code: found ? "" : element.code ?? "",
        rate: element.custom_rate === null ? "" : String(element.custom_rate),
        addTo: "",
      });
    } else {
      setPlace(nodeId);
      setMode("nhf");
      setPicked(null);
      setF({ ...emptyForm, addTo: newestSheet ? String(newestSheet.id) : "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, element, nodeId]);

  // search NHF codes after a short pause
  useEffect(() => {
    if (!open || mode !== "nhf" || picked) return;
    const text = q.trim();
    if (text.length < 2) {
      setHits(null);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: text, limit: "8" });
        if (sheetFilter) params.set("sheet_id", sheetFilter);
        const res = await api.get(`nhf-rates/search?${params.toString()}`);
        setHits(res.data.data);
      } catch {
        setHits([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q, sheetFilter, mode, picked, open]);

  const set = (k: keyof typeof emptyForm, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setErr((x) => ({ ...x, [k]: "" }));
  };

  const pick = (h: NhfHit) => {
    setPicked(h);
    setF((x) => ({ ...x, name: x.name || h.short_name || h.code, uom: h.uom ?? x.uom }));
    setErr({});
  };

  // "Skipped at import" suggestions for this room (or all rooms)
  const skipped = template.skipped.filter((s) => skAll || s.room_name === room?.name);
  const applySkipped = async (s: TplSkipped) => {
    setSkId(s.id);
    setF((x) => ({ ...x, name: s.name, uom: s.uom ?? "it", default_qty: s.qty === null ? "" : String(s.qty), vo_main: s.vo_main, comment: s.comment ?? "" }));
    if (s.in_nhf && s.code) {
      setMode("nhf");
      try {
        const res = await api.get(`nhf-rates/lookup?codes=${encodeURIComponent(s.code)}`);
        const h = res.data.data?.[0];
        if (h?.found) setPicked({ code: h.code, short_name: h.short_name, element_1: h.element_1, uom: h.uom, rate: h.rate, sheet_id: h.sheet_id, sheet_name: h.sheet_name });
      } catch {
        /* user can pick it by hand */
      }
    } else {
      setMode("custom");
      setPicked(null);
      setF((x) => ({ ...x, code: s.code ?? "", addTo: newestSheet ? String(newestSheet.id) : "" }));
    }
  };
  const dismissSkipped = async (s: TplSkipped) => {
    try {
      await api.delete(`survey-templates/${template.id}/skipped/${s.id}`);
      toast.success(`“${s.name}” removed from the skipped list`);
      if (skId === s.id) setSkId(null);
      onSkippedChanged();
    } catch (e) {
      toast.error(apiMessage(e, "Could not remove it."));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.name.trim()) er.name = "Enter the works name";
    if (mode === "nhf" && !picked) er.pick = "Pick an NHF code, or switch to Custom";
    if (f.default_qty !== "" && (Number.isNaN(Number(f.default_qty)) || Number(f.default_qty) < 0)) er.default_qty = "Enter a number";
    if (mode === "custom" && f.addTo) {
      if (!f.code.trim()) er.code = "Enter a code to add it to NHF rates";
      if (f.rate.trim() === "" || Number.isNaN(Number(f.rate))) er.rate = "Enter the base rate";
    }
    if (mode === "custom" && !f.addTo && f.rate !== "" && Number.isNaN(Number(f.rate))) er.rate = "Rate must be a number";
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      let code: string | null = mode === "nhf" ? picked!.code : f.code.trim() || null;
      if (mode === "custom" && f.addTo) {
        // add the code to the chosen NHF sheet first, so every template and the QS can price it
        const sheet = sheets.find((s) => String(s.id) === f.addTo);
        await api.post(`nhf-rates/sheets/${f.addTo}/codes`, {
          code,
          short_name: f.description.trim() || f.name.trim(),
          uom: f.uom,
          rate: Number(f.rate),
          source: "template",
          source_note: `Template: ${template.name}`,
        });
        toast.success(`Code ${code} added to ${sheet?.name ?? "NHF rates"}`);
      }
      const body: any = {
        node_id: place,
        name: f.name.trim(),
        code,
        uom: mode === "nhf" ? picked?.uom ?? f.uom : f.uom,
        default_qty: f.default_qty === "" ? undefined : Number(f.default_qty),
        vo_main: f.vo_main,
        comment: f.comment.trim() || undefined,
        description: mode === "custom" ? f.description.trim() || undefined : undefined,
        custom_rate: mode === "custom" && !f.addTo && f.rate !== "" ? Number(f.rate) : undefined,
        skipped_id: skId ?? undefined,
      };
      const res = element ? await api.put(`survey-templates/elements/${element.id}`, body) : await api.post(`survey-templates/${template.id}/elements`, body);
      onSaved(res.data.message);
    } catch (x) {
      const m = apiMessage(x, "Could not save the element.");
      if (/already in/i.test(m) && mode === "custom" && f.addTo && /code/i.test(m)) setErr({ code: `${m}. Use “Pick NHF code”.` });
      else if (/already/i.test(m)) setErr({ name: m });
      else toast.error(m);
    }
    setBusy(false);
  };

  const field = (k: keyof typeof emptyForm, label: string, opts: { ph?: string; hint?: string; multiline?: boolean } = {}) => (
    <FormField label={label} hint={err[k] ? undefined : opts.hint}>
      <CustomTextField
        fullWidth
        size="small"
        value={f[k]}
        placeholder={opts.ph}
        multiline={opts.multiline}
        minRows={opts.multiline ? 2 : undefined}
        onChange={(e: any) => set(k, e.target.value)}
        error={!!err[k]}
        helperText={err[k] || undefined}
      />
    </FormField>
  );

  return (
    <FormDrawer
      open={open}
      width={560}
      title={element ? "Edit element" : `Add element · ${room?.name ?? ""}`}
      onClose={onClose}
      onSubmit={submit}
      isSaving={busy}
      submitLabel={element ? "Save" : "Add element"}
    >
      {!element && template.skipped.length > 0 && (
        <Box sx={{ border: 1, borderColor: "warning.light", bgcolor: "#fffaf0", borderRadius: 2, overflow: "hidden" }}>
          <Stack direction="row" alignItems="center" gap={1} sx={{ px: 1.5, py: 1 }}>
            <Typography fontWeight={600}>Skipped at import</Typography>
            <Typography variant="caption" color="textSecondary">
              {template.skipped.filter((s) => s.room_name === room?.name).length} in {room?.name}
            </Typography>
            <Button size="small" sx={{ ml: "auto" }} onClick={() => setSkAll((x) => !x)}>
              {skAll ? "This room only" : `Show all (${template.skipped.length})`}
            </Button>
          </Stack>
          <Typography variant="caption" color="textSecondary" sx={{ px: 1.5, display: "block", pb: 1 }}>
            Rows skipped when the template was imported (their code was not in NHF rates). Use one to fill the form, or remove it.
          </Typography>
          {skipped.map((s) => (
            <Stack key={s.id} direction="row" alignItems="center" gap={1} sx={{ px: 1.5, py: 1, borderTop: 1, borderColor: "divider", bgcolor: skId === s.id ? "primary.light" : "background.paper" }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography className="f-14" fontWeight={600} noWrap>{s.name}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {s.code ? `${s.code} · ` : ""}{[s.room_name, s.path].filter(Boolean).join(" › ")} · {s.in_nhf ? "now in NHF" : "not in NHF"}
                </Typography>
              </Box>
              <Button size="small" variant={skId === s.id ? "contained" : "outlined"} startIcon={skId === s.id ? <IconCheck size={14} /> : undefined} onClick={() => applySkipped(s)}>
                {skId === s.id ? "Selected" : "Use"}
              </Button>
              <Tooltip title="Remove from this list">
                <IconButton size="small" onClick={() => dismissSkipped(s)}><IconX size={16} /></IconButton>
              </Tooltip>
            </Stack>
          ))}
          {!skipped.length && (
            <Typography variant="body2" color="textSecondary" sx={{ px: 1.5, py: 1, borderTop: 1, borderColor: "divider" }}>Nothing skipped in {room?.name}.</Typography>
          )}
        </Box>
      )}

      {places.length > 1 && (
        <FormField label="Add to">
          <CustomTextField select fullWidth size="small" value={place ?? ""} onChange={(e: any) => setPlace(Number(e.target.value))}>
            {places.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>
            ))}
          </CustomTextField>
        </FormField>
      )}

      <ToggleButtonGroup exclusive size="small" value={mode} onChange={(_, v) => v && setMode(v)} fullWidth>
        <ToggleButton value="nhf">Pick NHF code</ToggleButton>
        <ToggleButton value="custom">Custom</ToggleButton>
      </ToggleButtonGroup>

      {mode === "nhf" &&
        (picked ? (
          <Box sx={{ border: 1, borderColor: "primary.main", borderRadius: 2, p: 1.5, display: "flex", gap: 1.5, alignItems: "center" }}>
            <Chip label={picked.code} color="primary" variant="outlined" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography className="f-14" fontWeight={600}>{picked.short_name || "-"}</Typography>
              <Typography variant="caption" color="textSecondary">
                {uomLabel(picked.uom)} · {money(picked.rate)} · {picked.sheet_name}
              </Typography>
            </Box>
            <Button size="small" onClick={() => setPicked(null)}>Change</Button>
          </Box>
        ) : (
          <>
            {sheets.length > 1 && (
              <FormField label="Search in NHF sheet" hint="If a code is in two sheets, the one with the later effective date gives the rate.">
                <CustomTextField select fullWidth size="small" value={sheetFilter} onChange={(e: any) => setSheetFilter(e.target.value)} SelectProps={{ displayEmpty: true }}>
                  <MenuItem value="">All sheets</MenuItem>
                  {sheets.map((s) => (
                    <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
                  ))}
                </CustomTextField>
              </FormField>
            )}
            <FormField label="Search NHF codes *">
              <CustomTextField
                fullWidth
                size="small"
                autoFocus
                placeholder="Code (e.g. 4600) or words (e.g. carpet, door closer)"
                value={q}
                onChange={(e: any) => setQ(e.target.value)}
                error={!!err.pick}
                helperText={err.pick || (q.trim().length < 2 ? "Type at least 2 characters." : undefined)}
                InputProps={{ endAdornment: <InputAdornment position="end">{searching ? <CircularProgress size={16} /> : <IconSearch size={16} />}</InputAdornment> }}
              />
            </FormField>
            {hits && (
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
                {hits.map((h) => (
                  <Stack key={h.code} direction="row" alignItems="center" gap={1.5} onClick={() => pick(h)} sx={{ px: 1.5, py: 1, cursor: "pointer", borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 }, "&:hover": { bgcolor: "#f8fafc" } }}>
                    <Typography className="f-14" fontWeight={600} sx={{ minWidth: 70 }}>{h.code}</Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography className="f-14" noWrap>{h.short_name || "-"}</Typography>
                      <Typography variant="caption" color="textSecondary">{h.element_1 || "–"} · {uomLabel(h.uom)}{sheets.length > 1 ? ` · ${h.sheet_name}` : ""}</Typography>
                    </Box>
                    <Typography className="f-14" fontWeight={600}>{money(h.rate)}</Typography>
                  </Stack>
                ))}
                {!hits.length && (
                  <Alert severity="info" sx={{ borderRadius: 0 }}>No code matches “{q.trim()}”. Switch to <b>Custom</b> to add it by hand.</Alert>
                )}
              </Box>
            )}
          </>
        ))}

      {mode === "custom" && sheets.length > 0 && (
        <FormField
          label="Add this code to NHF sheet"
          hint={f.addTo ? "The code is added with its rate, so every template and the QS can use it." : "The rate is kept on this element only. The QS sets the price later."}
        >
          <CustomTextField select fullWidth size="small" value={f.addTo} onChange={(e: any) => set("addTo", e.target.value)} SelectProps={{ displayEmpty: true }}>
            <MenuItem value="">No, this template only</MenuItem>
            {sheets.map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
            ))}
          </CustomTextField>
        </FormField>
      )}

      {(mode === "custom" || picked) && (
        <>
          {mode === "custom" && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>{field("code", f.addTo ? "Code *" : "Code", { ph: f.addTo ? "e.g. DCK120" : "Optional" })}</Grid>
              <Grid size={{ xs: 6 }}>{field("rate", f.addTo ? "Base rate (£) *" : "Rate (£)", { ph: "0.00", hint: f.addTo ? "No uplift: it is added per project" : "Optional" })}</Grid>
            </Grid>
          )}
          {field("name", "Works name *", { ph: "e.g. renew letterplate", hint: "Short name the surveyor sees" })}
          {mode === "custom" && field("description", "Description", { ph: "Optional", multiline: true })}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <FormField label="UOM">
                <CustomTextField select fullWidth size="small" value={mode === "nhf" ? picked?.uom ?? f.uom : f.uom} disabled={mode === "nhf"} onChange={(e: any) => set("uom", e.target.value)}>
                  {[...new Set([...UOM_OPTIONS, f.uom, picked?.uom].filter(Boolean) as string[])].map((u) => (
                    <MenuItem key={u} value={u}>{uomLabel(u)}</MenuItem>
                  ))}
                </CustomTextField>
              </FormField>
            </Grid>
            <Grid size={{ xs: 6 }}>{field("default_qty", "Default qty", { ph: "Optional" })}</Grid>
          </Grid>
          <FormField label="Main or variation">
            <ToggleButtonGroup exclusive size="small" value={f.vo_main} onChange={(_, v) => v && set("vo_main", v)}>
              <ToggleButton value="Main">Main</ToggleButton>
              <ToggleButton value="VO">VO (variation)</ToggleButton>
            </ToggleButtonGroup>
          </FormField>
          {field("comment", "Comment", { ph: "e.g. 3 keys for each", multiline: true })}
        </>
      )}
    </FormDrawer>
  );
};

// ---------- add an element's code to NHF rates ----------
export const AddToNhfDrawer: React.FC<{
  open: boolean;
  template: TemplateDetail;
  element: TplElement | null;
  sheets: NhfSheet[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, template, element, sheets, onClose, onSaved }) => {
  const newest = sheets.length ? [...sheets].sort((a, b) => (b.effective_date ?? "").localeCompare(a.effective_date ?? ""))[0] : null;
  const [sheet, setSheet] = useState("");
  const [name, setName] = useState("");
  const [uom, setUom] = useState("it");
  const [rate, setRate] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open && element) {
      setSheet(newest ? String(newest.id) : "");
      setName(element.description || element.name);
      setUom(element.uom ?? "it");
      setRate(element.custom_rate === null ? "" : String(element.custom_rate));
      setErr({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, element]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!name.trim()) er.name = "Enter a description";
    if (rate.trim() === "" || Number.isNaN(Number(rate))) er.rate = "Enter the base rate";
    setErr(er);
    if (Object.keys(er).length || !element) return;
    setBusy(true);
    try {
      const res = await api.post(`nhf-rates/sheets/${sheet}/codes`, { code: element.code, short_name: name.trim(), uom, rate: Number(rate), source: "template", source_note: `Template: ${template.name}` });
      toast.success(`${res.data.message} · ${money(Number(rate))}`);
      onSaved();
    } catch (x) {
      toast.error(apiMessage(x, "Could not add the code."));
    }
    setBusy(false);
  };
  return (
    <FormDrawer open={open} title="Add code to NHF rates" onClose={onClose} onSubmit={submit} isSaving={busy} submitLabel="Add to NHF">
      {!sheets.length ? (
        <Alert severity="error">There is no NHF sheet yet. Upload one in NHF rates first.</Alert>
      ) : (
        <>
          <Typography className="f-14" color="textSecondary">
            Element <b>{element?.name}</b> uses code <b>{element?.code}</b>, which is not in any NHF sheet, so it has no price.
          </Typography>
          <FormField label="Code">
            <CustomTextField fullWidth size="small" value={element?.code ?? ""} disabled />
          </FormField>
          <FormField label="Add to sheet">
            <CustomTextField select fullWidth size="small" value={sheet} onChange={(e: any) => setSheet(e.target.value)}>
              {sheets.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>{s.name}{newest?.id === s.id && sheets.length > 1 ? " (newest)" : ""}</MenuItem>
              ))}
            </CustomTextField>
          </FormField>
          <FormField label="Description *">
            <CustomTextField fullWidth size="small" value={name} onChange={(e: any) => setName(e.target.value)} error={!!err.name} helperText={err.name || undefined} />
          </FormField>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <FormField label="UOM">
                <CustomTextField select fullWidth size="small" value={uom} onChange={(e: any) => setUom(e.target.value)}>
                  {[...new Set([...UOM_OPTIONS, uom])].map((u) => (
                    <MenuItem key={u} value={u}>{uomLabel(u)}</MenuItem>
                  ))}
                </CustomTextField>
              </FormField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormField label="Base rate (£) *" hint={err.rate ? undefined : "No uplift: it is added per project"}>
                <CustomTextField fullWidth size="small" value={rate} placeholder="0.00" onChange={(e: any) => setRate(e.target.value)} error={!!err.rate} helperText={err.rate || undefined} />
              </FormField>
            </Grid>
          </Grid>
          <Typography variant="caption" color="textSecondary">Every template and survey that uses {element?.code} gets this price.</Typography>
        </>
      )}
    </FormDrawer>
  );
};
