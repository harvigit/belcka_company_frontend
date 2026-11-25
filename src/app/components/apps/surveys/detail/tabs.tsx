"use client";

import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import Alert from "@/app/components/apps/surveys/shared/SurveyAlert";
import { IconChevronDown, IconChevronRight, IconDoor, IconFolder, IconRefresh, IconTrash, IconUpload } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { PhotoThumbs, DriverName } from "@/app/components/apps/vehicles/shared";
import { Column, RecordTable, Section } from "@/app/components/apps/vehicles/detail/common";
import ConfirmDialog from "@/app/components/apps/inventory-new/shared/ConfirmDialog";
import { apiMessage, uomLabel } from "../settings/nhf-rates/types";
import { PdDetails, PdFileCard } from "../list/PropertyDetail";
import {
  InsItem,
  InsNode,
  InsWork,
  InspectionData,
  PdUpload,
  RESULT_META,
  STATUS_META,
  SurveyDetail,
  SurveyPhoto,
  dateTime,
  longDate,
} from "../list/types";
import Chip from "@/app/components/apps/surveys/shared/SurveyChip";
import { WARN_TEXT } from "@/app/components/apps/surveys/shared/colors";

const qtyText = (qty: number | null, unit: string | null) => (qty === null ? "–" : `${qty.toLocaleString("en-GB")} ${uomLabel(unit)}`);
const urls = (photos: SurveyPhoto[]) => photos.map((p) => p.url ?? p.file_name ?? "Photo");
const Card: React.FC<{ children: React.ReactNode; sx?: object }> = ({ children, sx }) => (
  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, ...sx }}>
    {children}
  </Paper>
);
const Field: React.FC<{ label: string; children: React.ReactNode; full?: boolean }> = ({ label, children, full }) => (
  <Grid size={{ xs: 12, sm: full ? 12 : 6 }}>
    <Typography variant="caption" color="textSecondary" display="block">
      {label}
    </Typography>
    <Box className="f-14" sx={{ wordBreak: "break-word" }}>
      {children}
    </Box>
  </Grid>
);
const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography component="span" className="f-14" color="textSecondary">
    {children}
  </Typography>
);
const QtyChip: React.FC<{ status: "est" | "ver" | null }> = ({ status }) =>
  status === "ver" ? <Chip size="small" color="success" variant="outlined" label="Verified" /> : <Chip size="small" color="warning" variant="outlined" label="Estimated" />;
const Where: React.FC<{ room: string; path: string[]; element: string }> = ({ room, path, element }) => (
  <Box>
    <Typography className="f-14" fontWeight={600}>
      {room}
    </Typography>
    <Typography variant="caption" color="textSecondary">
      {[...(path.length ? path : ["In the area"]), element].join(" › ")}
    </Typography>
  </Box>
);

// ---------- Overview ----------
export const OverviewTab: React.FC<{ s: SurveyDetail; ins: InspectionData | null; onTab: (t: string) => void }> = ({ s, ins, onTab }) => {
  const workCols: Column<InsWork & { id: number }>[] = [
    { header: "Area / element", render: (w) => <Where room={w.room} path={w.path} element={w.element} /> },
    {
      header: "Work",
      render: (w) => (
        <Box>
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography className="f-14" fontWeight={600}>
              {w.work_name}
            </Typography>
            {w.ai_suggested && <Chip size="small" color="secondary" variant="outlined" label="AI" sx={{ height: 20 }} />}
            {w.added_on_site && <Chip size="small" variant="outlined" label="Added on site" sx={{ height: 20 }} />}
          </Stack>
          {!!w.also_rooms.length && (
            <Typography variant="caption" color="textSecondary">
              Also in {w.also_rooms.join(", ")}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      header: "Code",
      render: (w) =>
        w.code ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography className="f-14" fontWeight={600}>
              {w.code}
            </Typography>
            {w.in_nhf === false && <Chip size="small" color="warning" variant="outlined" label="Not in NHF" sx={{ height: 20 }} />}
          </Stack>
        ) : (
          <Chip size="small" variant="outlined" label="No code · QS" sx={{ height: 20 }} />
        ),
    },
    { header: "Qty", align: "right", render: (w) => <Typography className="f-14" noWrap>{qtyText(w.qty, w.unit)}</Typography> },
    { header: "Quantity", render: (w) => <QtyChip status={w.qty_status} /> },
    { header: "Main / VO", render: (w) => (w.vo === "VO" ? <Chip size="small" color="error" variant="outlined" label="VO" /> : <Muted>Main</Muted>) },
    { header: "Note", render: (w) => <Typography className="f-14" color="textSecondary">{w.note || "–"}</Typography> },
    { header: "Photos", render: (w) => (w.photos.length ? <PhotoThumbs photos={urls(w.photos)} size={40} /> : <Muted>–</Muted>) },
  ];
  const naCols: Column<InspectionData["not_accessible"][number] & { id: number }>[] = [
    { header: "Area / element", render: (n) => <Where room={n.room} path={n.path} element={n.element} /> },
    { header: "Reason", render: (n) => <Typography className="f-14">{n.reason || "–"}</Typography> },
    { header: "Note", render: (n) => <Typography className="f-14" color="textSecondary">{n.note || "–"}</Typography> },
    { header: "Photos", render: (n) => (n.photos.length ? <PhotoThumbs photos={urls(n.photos)} size={40} /> : <Muted>–</Muted>) },
  ];
  const pd = s.property_detail;
  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <Typography variant="h6" fontWeight={700} mb={1.5}>
              Details
            </Typography>
            <Grid container spacing={2}>
              <Field label="Reference">{s.reference}</Field>
              <Field label="Status">
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip size="small" color={STATUS_META[s.status].color} label={s.status_label} />
                  <Typography variant="caption" color="textSecondary">
                    {STATUS_META[s.status].hint}
                  </Typography>
                </Stack>
              </Field>
              <Field label="Project">
                {s.project?.name ?? "–"}
                {s.project && (
                  <Typography variant="caption" color="textSecondary" display="block">
                    Uplift {s.project.uplift_percent}%
                  </Typography>
                )}
              </Field>
              <Field label="Address">{s.address?.name ?? "–"}</Field>
              <Field label="Surveyor">{s.surveyor ? <DriverName name={s.surveyor.name} image={s.surveyor.image} /> : <Muted>Not assigned</Muted>}</Field>
              <Field label="Survey date">{longDate(s.survey_date)}</Field>
              <Field label="Template">
                {s.template_name ?? "–"}
                <Typography variant="caption" color="textSecondary" display="block">
                  {s.counts.rooms} areas · {s.counts.elements} elements
                </Typography>
              </Field>
              <Field label="Property detail">
                {pd ? (
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography component="a" className="f-14" color="primary" sx={{ cursor: "pointer" }} onClick={() => onTab("pd")}>
                      {pd.file_name}
                    </Typography>
                    <Chip size="small" variant="outlined" color={pd.shared ? "success" : "default"} label={pd.shared ? "Shared with surveyor" : "Not shared"} />
                  </Stack>
                ) : (
                  <Muted>No PDF</Muted>
                )}
              </Field>
              <Field label="Started">{s.started_at ? dateTime(s.started_at) : <Muted>Not yet</Muted>}</Field>
              <Field label="Submitted">{s.submitted_at ? dateTime(s.submitted_at) : <Muted>Not yet</Muted>}</Field>
              <Field label="Access note" full>
                <Typography className="f-14" sx={{ whiteSpace: "pre-wrap" }}>
                  {s.notes || "–"}
                </Typography>
              </Field>
            </Grid>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <Typography variant="h6" fontWeight={700} mb={1.5}>
              Result summary
            </Typography>
            {!ins ? (
              <LinearProgress />
            ) : (
              <>
                <Grid container spacing={1.5}>
                  {[
                    { l: "Work added", v: ins.summary.work, c: "primary.main" },
                    { l: "No works", v: ins.summary.none, c: "success.main" },
                    { l: "Not accessible", v: ins.summary.na, c: WARN_TEXT },
                    { l: "Not inspected", v: ins.summary.pending, c: "text.secondary" },
                  ].map((t) => (
                    <Grid key={t.l} size={{ xs: 6, sm: 3 }}>
                      <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, textAlign: "center" }}>
                        <Typography variant="h5" fontWeight={700} color={t.c}>
                          {t.v}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {t.l}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                <Typography className="f-14" fontWeight={700} mt={2.5} mb={1}>
                  Areas
                </Typography>
                <Stack spacing={1.25}>
                  {ins.rooms.map((r) => {
                    const pct = r.total ? Math.round((r.inspected / r.total) * 100) : 0;
                    return (
                      <Stack key={r.id} direction="row" spacing={1.5} alignItems="center">
                        <Typography className="f-14" sx={{ width: 140, flexShrink: 0 }} noWrap title={r.name}>
                          {r.name}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          color={pct === 100 && r.total ? "success" : "primary"}
                          sx={{ flex: 1, height: 8, borderRadius: 4 }}
                        />
                        <Typography className="f-14" fontWeight={600} sx={{ width: 60, textAlign: "right" }}>
                          {r.inspected} / {r.total}
                        </Typography>
                      </Stack>
                    );
                  })}
                  {!ins.rooms.length && <Muted>No areas.</Muted>}
                </Stack>
              </>
            )}
          </Card>
        </Grid>
      </Grid>

      <Section title="Works to cost" subtitle="Everything the surveyor marked as Work needed. The QS prices these.">
        <RecordTable
          columns={workCols}
          rows={(ins?.works ?? []).map((w) => ({ ...w, id: w.item_id }))}
          empty={s.status === "draft" || s.status === "assigned" ? "The surveyor has not started yet." : "No works recorded yet."}
        />
      </Section>

      {!!ins?.not_accessible.length && (
        <Section title="Not accessible" subtitle="Elements the surveyor could not inspect.">
          <RecordTable columns={naCols} rows={ins.not_accessible.map((n) => ({ ...n, id: n.item_id }))} empty="" />
        </Section>
      )}
    </Stack>
  );
};

// ---------- Property detail ----------
export const PropertyDetailTab: React.FC<{ s: SurveyDetail; aiEnabled: boolean; onChanged: () => void }> = ({ s, aiEnabled, onChanged }) => {
  const pd = s.property_detail;
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [askRemove, setAskRemove] = useState(false);
  const [saving, setSaving] = useState(false);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return toast.error("Please upload a PDF file.");
    if (file.size > 20 * 1024 * 1024) return toast.error("The PDF is too large (max 20 MB).");
    setBusy(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("surveys/property-detail/read", fd, { timeout: 240000 });
      const up: PdUpload = res.data.data;
      const save = await api.put(`surveys/${s.id}/property-detail`, { upload_id: up.upload_id });
      if (up.ai_status === "done") toast.success(save.data.message);
      else toast(`${save.data.message}. ${res.data.message}`, { icon: "⚠️" });
      onChanged();
    } catch (e) {
      toast.error(apiMessage(e, "Could not upload the PDF."));
    }
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const share = async (shared: boolean) => {
    setSaving(true);
    try {
      const res = await api.put(`surveys/${s.id}/property-detail`, { shared });
      toast.success(res.data.message);
      onChanged();
    } catch (e) {
      toast.error(apiMessage(e, "Could not change sharing."));
    }
    setSaving(false);
  };

  const remove = async () => {
    setSaving(true);
    try {
      const res = await api.put(`surveys/${s.id}/property-detail`, { remove: true });
      toast.success(res.data.message);
      setAskRemove(false);
      onChanged();
    } catch (e) {
      toast.error(apiMessage(e, "Could not remove the PDF."));
    }
    setSaving(false);
  };

  const readAgain = async () => {
    setBusy(pd?.file_name ?? "the PDF");
    try {
      const res = await api.post("surveys/property-detail/read-again", { survey_id: s.id }, { timeout: 240000 });
      if (res.data.data?.ai_status === "done") toast.success(res.data.message);
      else toast(res.data.message, { icon: "⚠️" });
      onChanged();
    } catch (e) {
      toast.error(apiMessage(e, "Could not read the PDF."));
    }
    setBusy(null);
  };

  const input = <input ref={fileRef} type="file" accept=".pdf,application/pdf" hidden onChange={(e) => upload(e.target.files?.[0])} />;

  if (busy)
    return (
      <Card>
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={24} />
          <Box>
            <Typography className="f-14" fontWeight={600}>
              AI is reading {busy}…
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Finding the property details in the PDF. This can take up to a minute.
            </Typography>
          </Box>
        </Stack>
      </Card>
    );

  if (!pd)
    return (
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, borderStyle: "dashed", textAlign: "center" }}>
        <Typography fontWeight={600}>No property detail PDF on this survey.</Typography>
        <Typography color="textSecondary" className="f-14" mb={2}>
          Upload one (optional). AI reads the details from it.
        </Typography>
        <Button variant="contained" startIcon={<IconUpload size={16} />} onClick={() => fileRef.current?.click()}>
          Upload PDF
        </Button>
        {input}
      </Paper>
    );

  return (
    <Stack spacing={2}>
      <Card>
        <PdFileCard
          name={pd.file_name ?? "Property detail.pdf"}
          size={pd.file_size}
          url={pd.url}
          status={pd.ai_status}
          details={pd.details}
          actions={
            <>
              {pd.ai_status !== "done" && aiEnabled && (
                <Button size="small" variant="outlined" startIcon={<IconRefresh size={16} />} onClick={readAgain}>
                  Read again
                </Button>
              )}
              <Button size="small" variant="outlined" color="inherit" startIcon={<IconUpload size={16} />} onClick={() => fileRef.current?.click()}>
                Replace
              </Button>
              <Button size="small" variant="outlined" color="error" startIcon={<IconTrash size={16} />} onClick={() => setAskRemove(true)}>
                Remove
              </Button>
            </>
          }
        />
        <Stack direction="row" spacing={1.5} alignItems="center" mt={1.5}>
          <Switch checked={pd.shared} disabled={saving} onChange={(e) => share(e.target.checked)} />
          <Box>
            <Typography className="f-14" fontWeight={600}>
              Share property detail with the surveyor
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {pd.shared ? "On: the surveyor can see these details in the app." : "Off: the surveyor sees a short note instead. You still see it here."}
            </Typography>
          </Box>
        </Stack>
        {pd.uploaded_by && (
          <Typography variant="caption" color="textSecondary" display="block" mt={1}>
            Uploaded by {pd.uploaded_by} · {dateTime(pd.uploaded_at)}
          </Typography>
        )}
      </Card>
      {pd.ai_status === "done" ? (
        <>
          <Typography variant="caption" color="textSecondary">
            Details read by AI from the PDF · read only
          </Typography>
          <PdDetails details={pd.details} />
        </>
      ) : (
        <Alert severity="warning">
          {pd.ai_status === "no_key"
            ? "AI is not set up yet, so the details were not read. Open the PDF to see them."
            : "AI could not read this PDF. Open the PDF to see the details, or try Read again."}
        </Alert>
      )}
      {input}
      <ConfirmDialog
        open={askRemove}
        title="Remove property detail"
        confirmLabel="Remove"
        busy={saving}
        onClose={() => setAskRemove(false)}
        onConfirm={remove}
        message={
          <>
            Remove <b>{pd.file_name}</b> from this survey? The surveyor will no longer see it.
          </>
        }
      />
    </Stack>
  );
};

// ---------- Inspection ----------
const ElementRow: React.FC<{ e: InsItem; depth: number }> = ({ e, depth }) => {
  const m = RESULT_META[e.result];
  const photos = e.photos;
  return (
    <Box sx={{ pl: 2 + depth * 2.5, pr: 2, py: 1.25, borderTop: "1px solid", borderColor: "grey.100" }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography className="f-14" fontWeight={600}>
          {e.name}
        </Typography>
        {e.code && (
          <Typography variant="caption" sx={{ px: 0.75, py: 0.1, borderRadius: 1, backgroundColor: "grey.100", fontWeight: 600 }}>
            {e.code}
          </Typography>
        )}
        {e.added_on_site && <Chip size="small" variant="outlined" label={`Added on site${e.ai_suggested ? " · AI" : ""}`} sx={{ height: 20 }} />}
        <Chip size="small" color={m.color} variant={e.result === "pending" ? "outlined" : "filled"} label={m.label} sx={{ ml: "auto !important" }} />
      </Stack>
      {e.result === "work" && e.work && (
        <Box mt={0.75}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography className="f-14">
              <b>{e.work.name}</b> · {qtyText(e.work.qty, e.work.unit)}
            </Typography>
            <QtyChip status={e.work.qty_status} />
            {e.work.vo === "VO" && <Chip size="small" color="error" variant="outlined" label="VO" />}
            {!!e.work.also_rooms.length && (
              <Typography variant="caption" color="textSecondary">
                Also in {e.work.also_rooms.join(", ")}
              </Typography>
            )}
          </Stack>
          {e.work.note && (
            <Typography variant="body2" color="textSecondary" mt={0.25}>
              “{e.work.note}”
            </Typography>
          )}
        </Box>
      )}
      {e.result === "na" && (
        <Typography className="f-14" mt={0.5}>
          Reason: <b>{e.na_reason}</b>
          {e.note ? <Muted> · “{e.note}”</Muted> : null}
        </Typography>
      )}
      {e.result === "none" && e.note && (
        <Typography variant="body2" color="textSecondary" mt={0.5}>
          “{e.note}”
        </Typography>
      )}
      {!!photos.length && (
        <Box mt={1}>
          <PhotoThumbs photos={urls(photos)} size={56} />
        </Box>
      )}
    </Box>
  );
};

const GroupBlock: React.FC<{ g: InsNode; depth: number }> = ({ g, depth }) => {
  const [open, setOpen] = useState(true);
  if (!g.total) return null;
  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        onClick={() => setOpen(!open)}
        sx={{ pl: 2 + depth * 2.5, pr: 2, py: 1, cursor: "pointer", borderTop: "1px solid", borderColor: "grey.100", backgroundColor: "grey.50" }}
      >
        {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        <IconFolder size={15} />
        <Typography className="f-14" fontWeight={600}>
          {g.name}
        </Typography>
        <Typography variant="caption" color={g.inspected >= g.total ? "success.main" : "textSecondary"} sx={{ ml: "auto !important" }}>
          {g.inspected} / {g.total}
        </Typography>
      </Stack>
      {open && (
        <>
          {g.elements.map((e) => (
            <ElementRow key={e.id} e={e} depth={depth + 1} />
          ))}
          {g.groups.map((c) => (
            <GroupBlock key={c.id} g={c} depth={depth + 1} />
          ))}
        </>
      )}
    </Box>
  );
};

export const InspectionTab: React.FC<{ s: SurveyDetail; ins: InspectionData | null }> = ({ s, ins }) => {
  const [filter, setFilter] = useState<"all" | "work" | "na" | "pending">("all");
  if (!ins) return <LinearProgress />;
  if (!ins.tree.length)
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderStyle: "dashed", textAlign: "center" }}>
        <Typography color="textSecondary">No areas on this survey.</Typography>
      </Paper>
    );
  // keep the tree, drop elements that do not match the filter
  const keep = (e: InsItem) => filter === "all" || e.result === filter;
  const prune = (n: InsNode): InsNode => {
    const groups = n.groups.map(prune).filter((g) => g.elements.length || g.groups.length);
    return { ...n, elements: n.elements.filter(keep), groups };
  };
  const rooms = ins.tree.map(prune);
  const shown = rooms.filter((r) => filter === "all" || r.elements.length || r.groups.length);
  return (
    <Stack spacing={2}>
      {(s.status === "draft" || s.status === "assigned") && (
        <Alert severity="info">The surveyor has not started this survey yet. Results appear here as they inspect in the app.</Alert>
      )}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {(
          [
            ["all", `All · ${ins.progress.total}`],
            ["work", `Work needed · ${ins.summary.work}`],
            ["na", `Not accessible · ${ins.summary.na}`],
            ["pending", `Not inspected · ${ins.summary.pending}`],
          ] as const
        ).map(([k, l]) => (
          <Chip key={k} label={l} clickable color={filter === k ? "primary" : "default"} variant={filter === k ? "filled" : "outlined"} onClick={() => setFilter(k)} />
        ))}
      </Stack>
      {shown.map((r, i) => {
        const full = r.total > 0 && r.inspected >= r.total;
        return (
          <Paper key={r.id} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 1.5 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: full ? "#fff" : "primary.main",
                  backgroundColor: full ? "success.main" : "primary.light",
                }}
              >
                <IconDoor size={15} />
              </Box>
              <Typography variant="h6" fontWeight={700} fontSize={16}>
                {r.name}
              </Typography>
              {r.added_on_site && <Chip size="small" variant="outlined" label="Added on site" sx={{ height: 20 }} />}
              <Tooltip title="Elements inspected">
                <Typography className="f-14" color={full ? "success.main" : "textSecondary"} sx={{ ml: "auto !important" }}>
                  {r.inspected} of {r.total} inspected
                </Typography>
              </Tooltip>
            </Stack>
            {r.elements.map((e) => (
              <ElementRow key={e.id} e={e} depth={0} />
            ))}
            {r.groups.map((g) => (
              <GroupBlock key={g.id} g={g} depth={0} />
            ))}
            {!r.elements.length && !r.groups.length && (
              <Typography className="f-14" color="textSecondary" sx={{ px: 2, pb: 1.5 }}>
                No elements.
              </Typography>
            )}
          </Paper>
        );
      })}
      {!shown.length && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderStyle: "dashed", textAlign: "center" }}>
          <Typography color="textSecondary">No elements match this filter.</Typography>
        </Paper>
      )}
    </Stack>
  );
};

// ---------- History ----------
export const HistoryTab: React.FC<{ s: SurveyDetail }> = ({ s }) => (
  <Card>
    <Stack spacing={2}>
      {s.history.map((h) => (
        <Stack key={h.id} direction="row" spacing={1.5}>
          <Box sx={{ width: 10, height: 10, mt: 0.75, borderRadius: "50%", backgroundColor: h.source === "app" ? "secondary.main" : "primary.main", flexShrink: 0 }} />
          <Box>
            <Typography className="f-14" fontWeight={600}>
              {h.message}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="textSecondary">
                {h.user ?? "System"} · {dateTime(h.created_at)}
              </Typography>
              <Chip size="small" variant="outlined" label={h.source === "app" ? "App" : "Web"} sx={{ height: 18, fontSize: 10 }} />
            </Stack>
          </Box>
        </Stack>
      ))}
      {!s.history.length && <Muted>No history yet.</Muted>}
    </Stack>
  </Card>
);
