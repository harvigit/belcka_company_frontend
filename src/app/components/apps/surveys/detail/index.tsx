"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, CardContent, Chip, CircularProgress, Grid, IconButton, Stack, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import { IconArrowLeft, IconCheck, IconEdit, IconTrash, IconUsers } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import BlankCard from "@/app/components/shared/BlankCard";
import { StatTile } from "@/app/components/apps/vehicles/detail/common";
import ConfirmDialog from "@/app/components/apps/inventory-new/shared/ConfirmDialog";
import { apiMessage } from "../settings/nhf-rates/types";
import SurveyForm from "../list/SurveyForm";
import { AssignDialog } from "../list/dialogs";
import { InspectionData, STATUS_META, SurveyDetail, SurveyOptions, SurveyRow, SurveyStatus } from "../list/types";
import { HistoryTab, InspectionTab, OverviewTab, PropertyDetailTab } from "./tabs";
import QsPricingTab from "./qs-tab";

const ORDER: SurveyStatus[] = ["draft", "assigned", "in_progress", "submitted", "qs_review", "completed"];
const TABS = [
  { value: "overview", label: "Overview" },
  { value: "pd", label: "Property detail" },
  { value: "ins", label: "Inspection" },
  { value: "qs", label: "QS pricing" },
  { value: "history", label: "History" },
];

// Survey page (Admin): status, what the surveyor recorded, property detail and history.
const SurveyPage: React.FC<{ surveyId: number }> = ({ surveyId }) => {
  const router = useRouter();
  const [s, setS] = useState<SurveyDetail | null>(null);
  const [ins, setIns] = useState<InspectionData | null>(null);
  const [options, setOptions] = useState<SurveyOptions | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, i] = await Promise.all([api.get(`surveys/${surveyId}`), api.get(`surveys/${surveyId}/inspection`)]);
      setS(d.data.data);
      setIns(i.data.data);
    } catch (e: any) {
      if (e?.response?.status === 404 || e?.response?.status === 400) setMissing(true);
      else toast.error(apiMessage(e, "Could not load the survey."));
    }
  }, [surveyId]);

  const loadOptions = useCallback(async () => {
    try {
      const res = await api.get("surveys/options");
      setOptions(res.data.data);
    } catch {
      // the edit form shows its own error
    }
  }, []);

  useEffect(() => {
    if (!surveyId) return setMissing(true);
    load();
    loadOptions();
  }, [surveyId, load, loadOptions]);

  const remove = async () => {
    if (!s) return;
    setDeleting(true);
    try {
      const res = await api.delete(`surveys/${s.id}`);
      toast.success(res.data.message);
      router.push("/apps/surveys/list");
    } catch (e) {
      toast.error(apiMessage(e, "Could not delete the survey."));
      setDeleting(false);
    }
  };

  if (missing)
    return (
      <BlankCard>
        <CardContent sx={{ textAlign: "center", py: 6 }}>
          <Typography variant="h6" mb={1}>
            Survey not found
          </Typography>
          <Typography color="textSecondary" mb={2}>
            It may have been deleted, or it belongs to another company.
          </Typography>
          <Button variant="contained" onClick={() => router.push("/apps/surveys/list")}>
            Back to surveys
          </Button>
        </CardContent>
      </BlankCard>
    );

  if (!s)
    return (
      <BlankCard>
        <CardContent sx={{ textAlign: "center", py: 8 }}>
          <CircularProgress size={28} />
        </CardContent>
      </BlankCard>
    );

  const at = ORDER.indexOf(s.status);
  const asRow = { id: s.id, reference: s.reference, title: s.title, address: s.address, surveyor: s.surveyor } as unknown as SurveyRow;

  return (
    <BlankCard>
      <CardContent sx={{ pt: 1.5 }}>
        {/* header */}
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5} minWidth={0}>
            <Tooltip title="Back to surveys">
              <IconButton onClick={() => router.push("/apps/surveys/list")}>
                <IconArrowLeft />
              </IconButton>
            </Tooltip>
            <Box minWidth={0}>
              <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
                {s.reference} · {s.title}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mt={0.5}>
                <Chip size="small" color={STATUS_META[s.status].color} label={s.status_label} />
                <Typography variant="body2" color="textSecondary">
                  {s.address?.name ?? "–"} · {s.project?.name ?? ""}
                </Typography>
              </Stack>
            </Box>
          </Stack>
          {s.editable && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="outlined" startIcon={<IconEdit size={16} />} onClick={() => setEditOpen(true)}>
                Edit survey
              </Button>
              <Button variant="outlined" startIcon={<IconUsers size={16} />} onClick={() => setAssignOpen(true)}>
                {s.surveyor ? "Change surveyor" : "Assign surveyor"}
              </Button>
              <Tooltip title="Delete">
                <IconButton color="error" onClick={() => setAskDelete(true)}>
                  <IconTrash size={20} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Stack>

        {/* status steps */}
        <Stack direction="row" spacing={1} mt={2} sx={{ overflowX: "auto", pb: 0.5 }}>
          {ORDER.map((k, i) => (
            <Chip
              key={k}
              size="small"
              icon={i < at ? <IconCheck size={13} /> : undefined}
              color={i < at ? "success" : i === at ? STATUS_META[k].color : "default"}
              variant={i <= at ? "filled" : "outlined"}
              label={i < at ? STATUS_META[k].label : `${i + 1} ${STATUS_META[k].label}`}
              sx={{ fontWeight: i === at ? 700 : 500, flexShrink: 0 }}
            />
          ))}
        </Stack>

        {s.rework_notes && s.status === "in_progress" && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <b>Rework requested by the QS:</b> {s.rework_notes}
          </Alert>
        )}

        {/* numbers */}
        <Grid container spacing={2} mt={0.5}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatTile
              label="Elements inspected"
              value={ins ? `${ins.progress.inspected} / ${ins.progress.total}` : "–"}
              sub={ins ? `${ins.rooms.length} ${ins.rooms.length === 1 ? "room" : "rooms"}` : undefined}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatTile label="Works" value={ins?.works.length ?? "–"} sub={ins ? `${ins.verified} verified · ${ins.estimated} estimated` : undefined} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatTile label="Not accessible" value={ins?.summary.na ?? "–"} sub="elements" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatTile
              label="Photos"
              value={ins?.photos ?? "–"}
              sub={ins?.summary.added_on_site ? `${ins.summary.added_on_site} ${ins.summary.added_on_site === 1 ? "element" : "elements"} added on site` : "on works and elements"}
            />
          </Grid>
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mt: 2, borderBottom: 1, borderColor: "divider" }}>
          {TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>

        <Box pt={3}>
          {tab === "overview" && <OverviewTab s={s} ins={ins} onTab={setTab} />}
          {tab === "pd" && <PropertyDetailTab s={s} aiEnabled={!!options?.ai_enabled} onChanged={load} />}
          {tab === "ins" && <InspectionTab s={s} ins={ins} />}
          {tab === "qs" && <QsPricingTab surveyId={s.id} />}
          {tab === "history" && <HistoryTab s={s} />}
        </Box>
      </CardContent>

      <SurveyForm
        open={editOpen}
        surveyId={s.id}
        options={options}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          load();
          loadOptions();
        }}
      />
      <AssignDialog
        survey={assignOpen ? asRow : null}
        surveyors={options?.surveyors ?? []}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => {
          setAssignOpen(false);
          load();
          loadOptions();
        }}
      />
      <ConfirmDialog
        open={askDelete}
        title="Delete survey"
        confirmLabel="Delete"
        confirmColor="error"
        busy={deleting}
        onClose={() => setAskDelete(false)}
        onConfirm={remove}
        message={
          <>
            Delete <b>{s.reference}</b> · {s.title}?
          </>
        }
      />
    </BlankCard>
  );
};

export default SurveyPage;
