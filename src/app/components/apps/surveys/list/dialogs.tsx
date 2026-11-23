"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Grid,
  IconButton,
  Radio,
  Stack,
  TextField,
  InputAdornment,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { IconDoor, IconEdit, IconSearch } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { apiMessage } from "../settings/nhf-rates/types";
import { PdDetails, PdFileCard } from "./PropertyDetail";
import { DriverName } from "@/app/components/apps/vehicles/shared";
import { STATUS_META, SurveyDetail, SurveyOptions, SurveyRow, SurveyStatus, dateTime, longDate } from "./types";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

// ---------- assign a surveyor ----------
export const AssignDialog: React.FC<{
  survey: SurveyRow | null;
  surveyors: SurveyOptions["surveyors"];
  onClose: () => void;
  onAssigned: () => void;
}> = ({ survey, surveyors, onClose, onAssigned }) => {
  const [pick, setPick] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setPick(survey?.surveyor?.id ?? null);
    setQ("");
  }, [survey]);
  const list = surveyors.filter((u) => u.name.toLowerCase().includes(q.trim().toLowerCase()));
  const assign = async () => {
    if (!survey || !pick) return;
    setBusy(true);
    try {
      const res = await api.post(`surveys/${survey.id}/assign`, { surveyor_id: pick });
      toast.success(res.data.message);
      onAssigned();
    } catch (e) {
      toast.error(apiMessage(e, "Could not assign the survey."));
    }
    setBusy(false);
  };
  return (
    <Dialog open={!!survey} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Assign survey · {survey?.reference}</DialogTitle>
      <DialogContent>
        <Typography color="textSecondary" className="f-14" mb={1.5}>
          {survey?.title} · {survey?.address?.name ?? ""}
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="Search..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconSearch size={16} /></InputAdornment> } }}
        />
        <Stack spacing={1} mt={1.5} sx={{ maxHeight: 320, overflowY: "auto" }}>
          {list.map((u) => (
            <Stack
              key={u.id}
              direction="row"
              spacing={1.5}
              alignItems="center"
              onClick={() => setPick(u.id)}
              sx={{
                p: 1,
                borderRadius: 2,
                cursor: "pointer",
                border: "1px solid",
                borderColor: pick === u.id ? "primary.main" : "grey.200",
                backgroundColor: pick === u.id ? "primary.light" : "background.paper",
              }}
            >
              <Radio size="small" checked={pick === u.id} sx={{ p: 0.5 }} />
              <Avatar src={u.image ?? undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>{initials(u.name)}</Avatar>
              <Typography className="f-14" fontWeight={600} flex={1}>
                {u.name}
              </Typography>
              <Typography variant="caption" color="textSecondary" noWrap>
                {u.open_surveys} open {u.open_surveys === 1 ? "survey" : "surveys"}
              </Typography>
            </Stack>
          ))}
          {!list.length && (
            <Typography color="textSecondary" className="f-14" textAlign="center" py={2}>
              {surveyors.length ? "No surveyor matches the search." : "No surveyors. A surveyor needs the Surveys permission in the app."}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!pick || busy} onClick={assign}>
          Assign
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ---------- view a survey (read only) ----------
const ORDER: SurveyStatus[] = ["draft", "assigned", "in_progress", "submitted", "qs_review", "completed"];

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Grid size={{ xs: 12, sm: 6 }}>
    <Typography variant="caption" color="textSecondary" display="block">
      {label}
    </Typography>
    <Box className="f-14">{children}</Box>
  </Grid>
);

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box sx={{ p: 2, border: "1px solid", borderColor: "grey.200", borderRadius: 2, backgroundColor: "background.paper" }}>
    <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
      {title}
    </Typography>
    {children}
  </Box>
);

export const SurveyViewDrawer: React.FC<{ id: number | null; onClose: () => void; onEdit: (id: number) => void }> = ({ id, onClose, onEdit }) => {
  const [s, setS] = useState<SurveyDetail | null>(null);
  useEffect(() => {
    setS(null);
    if (!id) return;
    api
      .get(`surveys/${id}`)
      .then((res) => setS(res.data.data))
      .catch((e) => {
        toast.error(apiMessage(e, "Could not load the survey."));
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const at = s ? ORDER.indexOf(s.status) : -1;
  const pd = s?.property_detail;
  return (
    <Drawer anchor="right" open={!!id} onClose={onClose} sx={{ "& .MuiDrawer-paper": { width: { xs: "100%", md: 760 }, backgroundColor: "#f9f9f9" } }}>
      <Box display="flex" flexDirection="column" height="100%">
        <Box display="flex" alignItems="center" p={1} gap={1}>
          <IconButton onClick={onClose} aria-label="close drawer">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700} noWrap flex={1}>
            {s ? `${s.reference} · ${s.title}` : "Survey"}
          </Typography>
          {s?.editable && (
            <Button variant="contained" size="small" startIcon={<IconEdit size={16} />} onClick={() => onEdit(s.id)} sx={{ mr: 1 }}>
              Edit survey
            </Button>
          )}
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2, pb: 2 }}>
          {!s ? (
            <Box sx={{ py: 8, textAlign: "center" }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {ORDER.map((k, i) => (
                  <Chip
                    key={k}
                    size="small"
                    color={i < at ? "success" : i === at ? STATUS_META[k].color : "default"}
                    variant={i <= at ? "filled" : "outlined"}
                    label={`${i + 1} ${STATUS_META[k].label}`}
                    sx={{ fontWeight: i === at ? 700 : 500 }}
                  />
                ))}
              </Stack>
              <Card title="Details">
                <Grid container spacing={2}>
                  <Field label="Reference">{s.reference}</Field>
                  <Field label="Status">
                    <Stack direction="row" spacing={1} alignItems="center">
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
                  <Field label="Surveyor">{s.surveyor ? <DriverName name={s.surveyor.name} image={s.surveyor.image} /> : <Typography component="span" color="textSecondary" className="f-14">Not assigned</Typography>}</Field>
                  <Field label="Survey date">{longDate(s.survey_date)}</Field>
                  <Field label="Template">
                    {s.template_name ?? "–"}
                    <Typography variant="caption" color="textSecondary" display="block">
                      {s.counts.rooms} rooms · {s.counts.groups} groups · {s.counts.elements} elements
                    </Typography>
                  </Field>
                  <Field label="Created">
                    {dateTime(s.created_at)}
                    {s.created_by ? ` · ${s.created_by}` : ""}
                  </Field>
                  <Grid size={12}>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Access note
                    </Typography>
                    <Typography className="f-14" sx={{ whiteSpace: "pre-wrap" }}>
                      {s.notes || "–"}
                    </Typography>
                  </Grid>
                  {!!s.rooms.length && (
                    <Grid size={12}>
                      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75}>
                        {s.rooms.map((r, i) => (
                          <Chip key={`${r}${i}`} size="small" variant="outlined" icon={<IconDoor size={14} />} label={r} />
                        ))}
                      </Stack>
                    </Grid>
                  )}
                </Grid>
              </Card>
              <Card title="Property detail">
                {pd ? (
                  <Stack spacing={1.5}>
                    <PdFileCard name={pd.file_name ?? "Property detail.pdf"} size={pd.file_size} url={pd.url} status={pd.ai_status} details={pd.details} />
                    <Alert severity={pd.shared ? "success" : "info"} sx={{ py: 0 }}>
                      {pd.shared ? "Shared with the surveyor: shown in the app." : "Not shared with the surveyor: the app shows a short note instead."}
                    </Alert>
                    {pd.ai_status === "done" && <PdDetails details={pd.details} />}
                  </Stack>
                ) : (
                  <Typography color="textSecondary" className="f-14">
                    No property detail PDF.
                  </Typography>
                )}
              </Card>
              <Card title="History">
                <Stack spacing={1.5}>
                  {s.history.map((h) => (
                    <Stack key={h.id} direction="row" spacing={1.5}>
                      <Box sx={{ width: 8, height: 8, mt: 0.75, borderRadius: "50%", backgroundColor: "primary.main", flexShrink: 0 }} />
                      <Box>
                        <Typography className="f-14" fontWeight={600}>
                          {h.message}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {h.user ?? "System"} · {dateTime(h.created_at)}
                          {h.source === "app" ? " · app" : ""}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                  {!s.history.length && (
                    <Typography color="textSecondary" className="f-14">
                      No history yet.
                    </Typography>
                  )}
                </Stack>
              </Card>
            </Stack>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};
