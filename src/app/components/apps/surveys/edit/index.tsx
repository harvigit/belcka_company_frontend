"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Stack,
  Button,
  IconButton,
  
  MenuItem,
  Card,
  CardContent,
  Grid,
  Alert,
  AlertTitle,
  CircularProgress,
} from "@mui/material";
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconEye,
  IconRuler,
  IconCalculator,
  IconLock,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import {
  Survey,
  SurveyorOption,
  SurveyGroupOption,
  SurveyElementOption,
  SurveyRoom,
} from "../types";
import BlankCard from "@/app/components/shared/BlankCard";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import Step3Configure from "../create/steps/Step3Configure";

interface SurveyEditProps {
  id: string;
}

export default function SurveyEdit({ id }: SurveyEditProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [survey, setSurvey] = useState<Survey | null>(null);

  // Edit fields
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("");
  const [surveyorId, setSurveyorId] = useState<number | null>(null);
  const [surveyDate, setSurveyDate] = useState("");
  const [notes, setNotes] = useState("");
  const [rooms, setRooms] = useState<SurveyRoom[]>([]);

  // Resource options
  const [surveyors, setSurveyors] = useState<SurveyorOption[]>([]);
  const [groups, setGroups] = useState<SurveyGroupOption[]>([]);
  const [elements, setElements] = useState<SurveyElementOption[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resSurvey, resUsers, resGroups, resElements] = await Promise.allSettled([
          api.get(`surveys/${id}`),
          api.get("/user/list"),
          api.get("/survey-groups/get"),
          api.get("/survey-elements/get"),
        ]);

        if (resUsers.status === "fulfilled" && resUsers.value.data) {
          const rawUsers = resUsers.value.data.info || [];
          setSurveyors(
            rawUsers.map((u: any) => ({
              id: u.id,
              name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || `User #${u.id}`,
              email: u.email,
            })),
          );
        }

        if (resGroups.status === "fulfilled" && resGroups.value.data) {
          const rawGroups = Array.isArray(resGroups.value.data.info)
            ? resGroups.value.data.info
            : [];
          setGroups(rawGroups.filter((g: any) => g.status));
        }

        if (resElements.status === "fulfilled" && resElements.value.data) {
          const rawElements = Array.isArray(resElements.value.data.info)
            ? resElements.value.data.info
            : [];
          setElements(rawElements);
        }

        if (resSurvey.status === "fulfilled" && resSurvey.value.data?.IsSuccess) {
          const loadedSurvey = resSurvey.value.data.info || resSurvey.value.data.data;
          if (loadedSurvey) {
            setSurvey(loadedSurvey);
            setReference(loadedSurvey.reference || "");
            setTitle(loadedSurvey.title || "");
            setSurveyorId(loadedSurvey.surveyor_id);
            setSurveyDate(
              loadedSurvey.survey_date ? loadedSurvey.survey_date.split("T")[0] : "",
            );
            setNotes(loadedSurvey.notes || "");
            setRooms(loadedSurvey.rooms || []);

            if (loadedSurvey.status !== "draft" && loadedSurvey.status !== "assigned") {
              toast.error(
                `Survey ${loadedSurvey.reference} is in '${loadedSurvey.status}' status and cannot be edited. It has been opened in read-only mode.`
              );
            }
          }
        }
      } catch (err) {
        console.error("Failed to load survey for edit", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!survey) return;
    if (survey.status !== "draft" && survey.status !== "assigned") {
      toast.error(
        `Cannot save changes: Survey is in '${survey.status}' status. Editing is only permitted for surveys in 'draft' or 'assigned' status.`
      );
      return;
    }
    if (!reference.trim()) {
      toast.error("Reference is required");
      return;
    }
    if (!title.trim()) {
      toast.error("Survey title is required");
      return;
    }
    if (rooms.length === 0) {
      toast.error("Please add at least one room or area");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: Number(id),
        reference: reference.trim(),
        title: title.trim(),
        surveyor_id: surveyorId,
        survey_date: surveyDate,
        notes: notes.trim() || undefined,
        rooms: rooms.map((r, rIdx) => ({
          group_id: r.group_id,
          name: r.name,
          sort_order: rIdx,
          notes: r.notes,
          items: (r.items || []).map((i, iIdx) => ({
            element_id: i.element_id,
            name: i.name,
            output_unit: i.output_unit,
            dimension_1_name: i.dimension_1_name,
            dimension_1_unit: i.dimension_1_unit,
            dimension_1_value: i.dimension_1_value,
            dimension_2_name: i.dimension_2_name,
            dimension_2_unit: i.dimension_2_unit,
            dimension_2_value: i.dimension_2_value,
            dimension_3_name: i.dimension_3_name,
            dimension_3_unit: i.dimension_3_unit,
            dimension_3_value: i.dimension_3_value,
            dimension_4_name: i.dimension_4_name,
            dimension_4_unit: i.dimension_4_unit,
            dimension_4_value: i.dimension_4_value,
            calculated_qty: i.calculated_qty,
            condition_score: i.condition_score,
            repair_action: i.repair_action,
            notes: i.notes,
            sort_order: iIdx,
          })),
        })),
      };

      const res = await api.put("surveys/update", payload);
      if (res.data?.IsSuccess) {
        toast.success("Survey updated successfully!");
        router.push(`/apps/surveys/view/${id}`);
      } else {
        toast.error(res.data?.message || "Failed to update survey");
      }
    } catch (err: any) {
      console.error("Failed to update survey", err);
      toast.error(err?.response?.data?.message || "Failed to update survey");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box p={8} textAlign="center">
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">
            Loading survey for editing...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!survey) {
    return (
      <Box p={4} textAlign="center">
        <Alert severity="warning" sx={{ maxWidth: 500, mx: "auto", mb: 3 }}>
          Survey not found or cannot be loaded for editing.
        </Alert>
        <Button
          variant="contained"
          startIcon={<IconArrowLeft size={18} />}
          component={Link}
          href="/apps/surveys/list"
        >
          Return to Surveys
        </Button>
      </Box>
    );
  }

  const isEditable = survey.status === "draft" || survey.status === "assigned";

  if (!isEditable) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: "auto" }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
          <IconButton
            onClick={() => router.push(`/apps/surveys/view/${survey.id}`)}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "8px",
            }}
            aria-label="Back to survey"
          >
            <IconArrowLeft size={20} />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Survey Locked: {survey.reference}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Editing is restricted based on survey status.
            </Typography>
          </Box>
        </Stack>

        <Alert
          severity="warning"
          icon={<IconLock size={24} />}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          <AlertTitle sx={{ fontWeight: 700, fontSize: "1rem" }}>
            Survey is in &apos;{survey.status.toUpperCase()}&apos; Status
          </AlertTitle>
          Surveys can only be edited when they are in <strong>Draft</strong> or <strong>Assigned</strong> status.
          This survey is currently in <strong>{survey.status.replace("_", " ")}</strong> status and is protected from modification.
        </Alert>

        <BlankCard>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Available Actions
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Choose an action below to view or manage this survey in its current workflow state:
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap">
              <Button
                variant="contained"
                color="primary"
                startIcon={<IconEye size={18} />}
                component={Link}
                href={`/apps/surveys/view/${survey.id}`}
              >
                View Survey Details
              </Button>

              {survey.status === "in_progress" && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<IconRuler size={18} />}
                  component={Link}
                  href={`/apps/surveys/execute/${survey.id}`}
                >
                  Continue Field Inspection
                </Button>
              )}

              {(survey.status === "submitted" || survey.status === "qs_review") && (
                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<IconCalculator size={18} />}
                  component={Link}
                  href={`/apps/surveys/assessment/${survey.id}`}
                >
                  Open QS Assessment
                </Button>
              )}

              {(survey.status === "completed" || survey.status === "frozen") && (
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<IconEye size={18} />}
                  component={Link}
                  href={`/apps/surveys/view/${survey.id}?tab=costing`}
                >
                  View Commercial Scope & Costing
                </Button>
              )}

              <Button
                variant="text"
                color="inherit"
                startIcon={<IconArrowLeft size={18} />}
                component={Link}
                href="/apps/surveys/list"
              >
                Back to Survey List
              </Button>
            </Stack>
          </CardContent>
        </BlankCard>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton
            onClick={() => router.push(`/apps/surveys/view/${survey.id}`)}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "8px",
            }}
            aria-label="Back to survey"
          >
            <IconArrowLeft size={20} />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Edit Survey: {survey.reference}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update general properties or customize room & element scopes.
            </Typography>
          </Box>
        </Stack>

        <Button
          variant="contained"
          color="primary"
          startIcon={<IconDeviceFloppy size={18} />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </Stack>

      {/* General Settings Card */}
      <BlankCard sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>
            Survey Details
          </Typography>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 4 }}>
              <CustomTextField
                fullWidth
                size="small"
                label="Survey Reference"
                value={reference}
                onChange={(e: any) => setReference(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <CustomTextField
                fullWidth
                size="small"
                label="Survey Title"
                value={title}
                onChange={(e: any) => setTitle(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CustomTextField
                fullWidth
                size="small"
                select
                label="Assigned Surveyor"
                value={surveyorId ? String(surveyorId) : ""}
                onChange={(e: any) => setSurveyorId(e.target.value ? Number(e.target.value) : null)}
              >
                <MenuItem value="">Unassigned</MenuItem>
                {surveyors.map((s) => (
                  <MenuItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CustomTextField
                fullWidth
                size="small"
                type="date"
                label="Inspection Date"
                InputLabelProps={{ shrink: true }}
                value={surveyDate}
                onChange={(e: any) => setSurveyDate(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <CustomTextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Notes"
                value={notes}
                onChange={(e: any) => setNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </BlankCard>

      {/* Rooms & Elements Configuration */}
      <BlankCard>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>
            Room & Inspection Elements Scope
          </Typography>
          <Step3Configure
            rooms={rooms}
            setRooms={setRooms}
            availableGroups={groups}
            availableElements={elements}
            templateName={survey.template_name}
            isTemplateMode={survey.creation_method === "template"}
          />
        </CardContent>
      </BlankCard>
    </Box>
  );
}
