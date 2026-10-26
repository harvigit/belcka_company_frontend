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
  TextField,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  IconArrowLeft,
  IconDeviceFloppy,
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
              <TextField
                fullWidth
                size="small"
                label="Survey Reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                size="small"
                label="Survey Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                select
                label="Assigned Surveyor"
                value={surveyorId ? String(surveyorId) : ""}
                onChange={(e) => setSurveyorId(e.target.value ? Number(e.target.value) : null)}
              >
                <MenuItem value="">Unassigned</MenuItem>
                {surveyors.map((s) => (
                  <MenuItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Inspection Date"
                InputLabelProps={{ shrink: true }}
                value={surveyDate}
                onChange={(e) => setSurveyDate(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
