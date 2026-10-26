"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  Chip,
  Card,
  CardContent,
  Grid,
  Divider,
  MenuItem,
  LinearProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip,
  Paper,
} from "@mui/material";
import {
  IconArrowLeft,
  IconCheck,
  IconClipboardCheck,
  IconClock,
  IconAlertTriangle,
  IconCamera,
  IconTrash,
  IconPlus,
  IconChevronRight,
  IconChevronLeft,
  IconBuilding,
  IconMapPin,
  IconUser,
  IconEye,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import BlankCard from "@/app/components/shared/BlankCard";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import {
  Survey,
  SurveyRoom,
  SurveyItem,
  ElementCondition,
  SurveyItemPhoto,
} from "../types";

interface SurveyInspectProps {
  id: string | number;
}

const conditionOptions: {
  value: ElementCondition;
  label: string;
  score: number;
  color: "success" | "warning" | "error" | "default";
  bg: string;
  borderColor: string;
  desc: string;
}[] = [
  {
    value: "good",
    label: "Good",
    score: 1,
    color: "success",
    bg: "#f0fdf4",
    borderColor: "#86efac",
    desc: "Sound condition with no defect",
  },
  {
    value: "minor_defects",
    label: "Minor Defects",
    score: 2,
    color: "warning",
    bg: "#fefce8",
    borderColor: "#fde047",
    desc: "Cosmetic wear / minor repairs",
  },
  {
    value: "damaged",
    label: "Damaged",
    score: 3,
    color: "error",
    bg: "#fef2f2",
    borderColor: "#fca5a5",
    desc: "Significant damage / repair required",
  },
  {
    value: "not_accessible",
    label: "Not Accessible",
    score: 4,
    color: "default",
    bg: "#f8fafc",
    borderColor: "#cbd5e1",
    desc: "Locked, hazardous, or obstructed",
  },
];

const severityOptions = [
  { value: "low", label: "Low", color: "info" },
  { value: "medium", label: "Medium", color: "warning" },
  { value: "high", label: "High", color: "error" },
  { value: "critical", label: "Critical", color: "error" },
];

export default function SurveyInspectWorkspace({ id }: SurveyInspectProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<Survey | null>(null);

  // Active selection
  const [activeRoomId, setActiveRoomId] = useState<string | number | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | number | null>(null);

  // Global damage types and materials cache
  const [globalDamageTypes, setGlobalDamageTypes] = useState<{ id: number; name: string }[]>([]);
  const [globalMaterials, setGlobalMaterials] = useState<{ id: number; name: string }[]>([]);

  // Item form state
  const [condition, setCondition] = useState<ElementCondition | "">("");
  const [dim1, setDim1] = useState<string>("");
  const [dim2, setDim2] = useState<string>("");
  const [dim3, setDim3] = useState<string>("");
  const [dim4, setDim4] = useState<string>("");
  const [qty, setQty] = useState<string>("");
  const [damageTypeId, setDamageTypeId] = useState<string | number>("");
  const [damageTypeName, setDamageTypeName] = useState<string>("");
  const [materialId, setMaterialId] = useState<string | number>("");
  const [materialName, setMaterialName] = useState<string>("");
  const [severity, setSeverity] = useState<string>("medium");
  const [repairAction, setRepairAction] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Saving state
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Photo preview modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isUnassigned = Boolean(survey && !survey.surveyor_id);
  const isReadOnly = Boolean(
    survey && ["submitted", "qs_review", "completed", "frozen"].includes(survey.status),
  );

  const handleSubmitInspection = async () => {
    if (!survey) return;
    setSubmitting(true);
    try {
      const res = await api.post("surveys/change-status", {
        id: Number(survey.id),
        status: "submitted",
      });
      if (res.data?.IsSuccess) {
        toast.success("Inspection submitted successfully!");
        setOpenSubmitDialog(false);
        router.push(`/apps/surveys/view/${survey.id}`);
      } else {
        toast.error(res.data?.message || "Failed to submit inspection");
      }
    } catch (err: any) {
      console.error("Submit inspection error", err);
      toast.error(err?.response?.data?.message || "Failed to submit inspection");
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch full survey
  const loadSurvey = useCallback(async () => {
    try {
      const res = await api.get(`surveys/${id}`);
      if (res.data?.IsSuccess && res.data.data) {
        const s: Survey = res.data.data;
        setSurvey(s);

        // Auto-select first room and first element if not set
        if (s.rooms && s.rooms.length > 0) {
          const firstRoom = s.rooms[0];
          setActiveRoomId((prev) => (prev ? prev : firstRoom.id));
          if (firstRoom.items && firstRoom.items.length > 0) {
            setActiveItemId((prev) => (prev ? prev : firstRoom.items[0].id));
          }
        }
      } else {
        toast.error("Survey not found");
        router.push("/apps/surveys/list");
      }
    } catch (err: any) {
      console.error("Failed to load survey", err);
      toast.error(err?.response?.data?.message || "Failed to load survey details");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void loadSurvey();
  }, [loadSurvey]);

  // Load global damage types and materials for fallback
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [dtRes, matRes] = await Promise.allSettled([
          api.get("survey-damage-types/get"),
          api.get("survey-materials/get"),
        ]);
        if (dtRes.status === "fulfilled" && dtRes.value.data?.info) {
          setGlobalDamageTypes(
            dtRes.value.data.info.map((d: any) => ({ id: d.id, name: d.name }))
          );
        }
        if (matRes.status === "fulfilled" && matRes.value.data?.info) {
          setGlobalMaterials(
            matRes.value.data.info.map((m: any) => ({ id: m.id, name: m.name }))
          );
        }
      } catch (err) {
        console.error("Failed to load catalogs", err);
      }
    };
    void loadCatalogs();
  }, []);

  // Compute active room and item
  const activeRoom = useMemo(() => {
    if (!survey?.rooms) return null;
    return survey.rooms.find((r) => String(r.id) === String(activeRoomId)) || survey.rooms[0] || null;
  }, [survey, activeRoomId]);

  const activeItem = useMemo(() => {
    if (!activeRoom?.items) return null;
    return activeRoom.items.find((i) => String(i.id) === String(activeItemId)) || activeRoom.items[0] || null;
  }, [activeRoom, activeItemId]);

  // Populate local form state when activeItem changes
  useEffect(() => {
    if (activeItem) {
      setCondition(activeItem.condition || "");
      setDim1(activeItem.dimension_1_value !== null && activeItem.dimension_1_value !== undefined ? String(activeItem.dimension_1_value) : "");
      setDim2(activeItem.dimension_2_value !== null && activeItem.dimension_2_value !== undefined ? String(activeItem.dimension_2_value) : "");
      setDim3(activeItem.dimension_3_value !== null && activeItem.dimension_3_value !== undefined ? String(activeItem.dimension_3_value) : "");
      setDim4(activeItem.dimension_4_value !== null && activeItem.dimension_4_value !== undefined ? String(activeItem.dimension_4_value) : "");
      setQty(activeItem.calculated_qty !== null && activeItem.calculated_qty !== undefined ? String(activeItem.calculated_qty) : "");
      setDamageTypeId(activeItem.damage_type_id || "");
      setDamageTypeName(activeItem.damage_type_name || "");
      setMaterialId(activeItem.material_id || "");
      setMaterialName(activeItem.material_name || "");
      setSeverity((activeItem.severity as string) || "medium");
      setRepairAction(activeItem.repair_action || "");
      setNotes(activeItem.notes || "");
    }
  }, [activeItem]);

  // Auto-calculate quantity based on element dimensions
  useEffect(() => {
    if (!activeItem) return;
    const mode = activeItem.element?.measurement_mode;
    const v1 = parseFloat(dim1) || 0;
    const v2 = parseFloat(dim2) || 0;
    const v3 = parseFloat(dim3) || 0;

    if (mode === "area" && v1 > 0 && v2 > 0) {
      setQty((v1 * v2).toFixed(2));
    } else if (mode === "volume" && v1 > 0 && v2 > 0 && v3 > 0) {
      setQty((v1 * v2 * v3).toFixed(2));
    } else if (mode === "length" && v1 > 0) {
      setQty(v1.toFixed(2));
    } else if (mode === "count" && v1 > 0) {
      setQty(String(Math.round(v1)));
    }
  }, [dim1, dim2, dim3, dim4, activeItem]);

  // Compute available damage types & materials (linked first, fallback to global)
  const availableDamageTypes = useMemo(() => {
    const linked = activeItem?.element?.damageTypes || [];
    if (linked.length > 0) return linked;
    return globalDamageTypes;
  }, [activeItem, globalDamageTypes]);

  const availableMaterials = useMemo(() => {
    const linked = activeItem?.element?.materials || [];
    if (linked.length > 0) return linked;
    return globalMaterials;
  }, [activeItem, globalMaterials]);

  // Overall and room progress calculation
  const stats = useMemo(() => {
    if (!survey?.rooms) return { total: 0, inspected: 0, pct: 0 };
    const total = survey.rooms.reduce((acc, r) => acc + (r.items?.length || 0), 0);
    const inspected = survey.rooms.reduce(
      (acc, r) => acc + (r.items?.filter((i) => i.is_inspected).length || 0),
      0
    );
    const pct = total > 0 ? Math.round((inspected / total) * 100) : 0;
    return { total, inspected, pct };
  }, [survey]);

  // Flattened elements array for Previous/Next navigation
  const allElements = useMemo(() => {
    if (!survey?.rooms) return [];
    return survey.rooms.flatMap((r) =>
      (r.items || []).map((i) => ({ room: r, item: i }))
    );
  }, [survey]);

  const currentIndex = useMemo(() => {
    if (!activeItem) return -1;
    return allElements.findIndex((entry) => String(entry.item.id) === String(activeItem.id));
  }, [allElements, activeItem]);

  // Image helper
  const getImageUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
    return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  };

  // Save active item inspection
  const handleSaveItem = async (shouldMoveToNext = false) => {
    if (!survey || !activeItem) return;

    if (isReadOnly) {
      toast.error("This survey is locked for editing.");
      return;
    }
    if (isUnassigned) {
      toast.error("Please assign an active surveyor before saving inspection progress.");
      return;
    }

    if (!condition) {
      toast.error("Please select a condition rating for this element");
      return;
    }

    if ((condition === "damaged" || condition === "minor_defects") && !damageTypeId && !damageTypeName.trim()) {
      toast.error("Please select or enter a defect type for damaged element");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        survey_id: Number(survey.id),
        item_id: Number(activeItem.id),
        condition,
        condition_score: conditionOptions.find((c) => c.value === condition)?.score ?? 1,
        damage_type_id: damageTypeId ? Number(damageTypeId) : null,
        damage_type_name: damageTypeName || null,
        material_id: materialId ? Number(materialId) : null,
        material_name: materialName || null,
        severity: condition === "damaged" || condition === "minor_defects" ? severity : null,
        repair_action: repairAction.trim() || null,
        notes: notes.trim() || null,
        dimension_1_value: dim1 !== "" ? parseFloat(dim1) : null,
        dimension_2_value: dim2 !== "" ? parseFloat(dim2) : null,
        dimension_3_value: dim3 !== "" ? parseFloat(dim3) : null,
        dimension_4_value: dim4 !== "" ? parseFloat(dim4) : null,
        calculated_qty: qty !== "" ? parseFloat(qty) : null,
        is_inspected: true,
      };

      const res = await api.post("surveys/inspect-item", payload);
      if (res.data?.IsSuccess) {
        toast.success("Inspection saved!");
        await loadSurvey();

        if (shouldMoveToNext) {
          handleNextElement();
        }
      } else {
        toast.error(res.data?.message || "Failed to save inspection");
      }
    } catch (err: any) {
      console.error("Save inspection error", err);
      toast.error(err?.response?.data?.message || "Failed to save inspection");
    } finally {
      setSaving(false);
    }
  };

  // Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !survey || !activeItem) return;

    if (isReadOnly) {
      toast.error("This survey is locked for editing.");
      return;
    }
    if (isUnassigned) {
      toast.error("Please assign an active surveyor before uploading photos.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("survey_id", String(survey.id));
      formData.append("item_id", String(activeItem.id));

      const res = await api.post("surveys/upload-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.IsSuccess) {
        toast.success("Photo uploaded!");
        await loadSurvey();
      } else {
        toast.error(res.data?.message || "Failed to upload photo");
      }
    } catch (err: any) {
      console.error("Photo upload error", err);
      toast.error(err?.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      // Reset input
      e.target.value = "";
    }
  };

  // Photo delete
  const handleDeletePhoto = async (photoId: number) => {
    if (!survey || !photoId) return;

    try {
      const res = await api.post("surveys/delete-photo", {
        survey_id: Number(survey.id),
        photo_id: photoId,
      });

      if (res.data?.IsSuccess) {
        toast.success("Photo removed");
        await loadSurvey();
      } else {
        toast.error(res.data?.message || "Failed to delete photo");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete photo");
    }
  };

  // Navigation helpers
  const handlePreviousElement = () => {
    if (currentIndex > 0) {
      const prev = allElements[currentIndex - 1];
      setActiveRoomId(prev.room.id);
      setActiveItemId(prev.item.id);
    }
  };

  const handleNextElement = () => {
    if (currentIndex < allElements.length - 1) {
      const next = allElements[currentIndex + 1];
      setActiveRoomId(next.room.id);
      setActiveItemId(next.item.id);
    }
  };

  if (loading) {
    return (
      <Box p={8} textAlign="center">
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">
            Loading inspection workspace...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!survey) {
    return (
      <Box p={3} textAlign="center">
        <Typography variant="h6">Survey not found</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Top Header Card */}
      <Card sx={{ mb: 3, border: "1px solid", borderColor: "divider" }} elevation={0}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton
                onClick={() => router.push(`/apps/surveys/view/${id}`)}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "8px",
                  p: 1,
                }}
              >
                <IconArrowLeft size={20} />
              </IconButton>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
                  <Typography variant="h4" fontWeight={700}>
                    {survey.title || survey.reference}
                  </Typography>
                  <Chip
                    label={survey.status.replace("_", " ").toUpperCase()}
                    size="small"
                    color={
                      survey.status === "in_progress"
                        ? "warning"
                        : survey.status === "submitted"
                        ? "success"
                        : survey.status === "completed"
                        ? "success"
                        : "info"
                    }
                    sx={{ fontWeight: 700, borderRadius: "6px" }}
                  />
                </Stack>
                <Stack direction="row" flexWrap="wrap" gap={2} color="text.secondary">
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <IconBuilding size={16} />
                    <Typography variant="body2">{survey.project_name || "General Project"}</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <IconMapPin size={16} />
                    <Typography variant="body2">{survey.property_name || "Property Site"}</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <IconUser size={16} />
                    <Typography variant="body2">{survey.surveyor_name || "Unassigned"}</Typography>
                  </Stack>
                </Stack>
              </Box>
            </Stack>

            {/* Progress summary box */}
            <Box
              sx={{
                bgcolor: "background.paper",
                p: 2,
                borderRadius: "8px",
                border: "1px solid",
                borderColor: "divider",
                minWidth: { xs: "100%", sm: 240 },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  INSPECTION PROGRESS
                </Typography>
                <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                  {stats.pct}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={stats.pct}
                sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                {stats.inspected} of {stats.total} elements inspected
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Warning: Rework Requested Banner */}
      {survey.qs_status === "rework_requested" && survey.rework_notes && (
        <Alert severity="warning" icon={<IconAlertTriangle size={20} />} sx={{ mb: 3, borderRadius: "8px" }}>
          <strong>Quality Review / QS Rework Requested:</strong> {survey.rework_notes}
        </Alert>
      )}

      {/* Warning: Unassigned Survey Banner */}
      {isUnassigned && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: "8px" }}>
          <strong>Unassigned Survey:</strong> This survey does not have an assigned surveyor. Inspection progress and photo evidence cannot be recorded until an active surveyor is assigned.
        </Alert>
      )}

      {/* Info: Locked / Read-only Survey Banner */}
      {isReadOnly && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: "8px" }}>
          <strong>Survey Locked:</strong> This survey is in <strong>{survey.status.replace("_", " ").toUpperCase()}</strong> status and is locked for editing. Viewing in read-only mode.
        </Alert>
      )}

      {/* Success: 100% Inspected & Ready for Submission */}
      {!isReadOnly && !isUnassigned && stats.pct === 100 && stats.total > 0 && (
        <Alert
          severity="success"
          sx={{ mb: 3, borderRadius: "8px", alignItems: "center" }}
          action={
            <Button
              color="success"
              variant="contained"
              size="small"
              startIcon={<IconClipboardCheck size={18} />}
              onClick={() => setOpenSubmitDialog(true)}
              sx={{ fontWeight: 700 }}
            >
              Submit Inspection
            </Button>
          }
        >
          <strong>All elements inspected!</strong> You can now submit this survey for quality review and sign-off.
        </Alert>
      )}

      {/* Main Grid: Left Room Navigator + Right Element Workspace */}
      <Grid container spacing={3}>
        {/* Left Column: Rooms & Elements Stepper */}
        <Grid size={{ xs: 12, md: 4, lg: 3.5 }}>
          <BlankCard>
            <Box p={2.5} borderBottom="1px solid" borderColor="divider">
              <Typography variant="subtitle1" fontWeight={700}>
                Survey Rooms & Areas
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Walk through rooms and inspect each assigned element
              </Typography>
            </Box>

            <Box p={1.5} sx={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
              {survey.rooms.map((room, rIdx) => {
                const roomItems = room.items || [];
                const roomInspected = roomItems.filter((i) => i.is_inspected).length;
                const isRoomActive = activeRoom?.id === room.id;

                return (
                  <Paper
                    key={room.id}
                    variant="outlined"
                    sx={{
                      mb: 1.5,
                      borderRadius: "8px",
                      borderColor: isRoomActive ? "primary.main" : "divider",
                      bgcolor: isRoomActive ? "#f8fafc" : "background.paper",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      p={1.5}
                      sx={{ cursor: "pointer" }}
                      onClick={() => {
                        setActiveRoomId(room.id);
                        if (roomItems.length > 0) {
                          setActiveItemId(roomItems[0].id);
                        }
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {rIdx + 1}. {room.name}
                        </Typography>
                        <Chip
                          label={`${roomInspected}/${roomItems.length}`}
                          size="small"
                          color={roomInspected === roomItems.length && roomItems.length > 0 ? "success" : "default"}
                          sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                        />
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={roomItems.length > 0 ? (roomInspected / roomItems.length) * 100 : 0}
                        sx={{ height: 4, borderRadius: 2 }}
                        color={roomInspected === roomItems.length && roomItems.length > 0 ? "success" : "primary"}
                      />
                    </Box>

                    {/* Room elements list */}
                    {isRoomActive && (
                      <Stack spacing={0.5} p={1} bgcolor="background.paper" borderTop="1px solid" borderColor="divider">
                        {roomItems.map((item) => {
                          const isItemActive = activeItem?.id === item.id;
                          return (
                            <Box
                              key={item.id}
                              onClick={() => setActiveItemId(item.id)}
                              sx={{
                                p: 1,
                                borderRadius: "6px",
                                cursor: "pointer",
                                bgcolor: isItemActive ? "primary.light" : "transparent",
                                "&:hover": { bgcolor: isItemActive ? "primary.light" : "grey.50" },
                              }}
                            >
                              <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  {item.is_inspected ? (
                                    <IconCheck size={16} color="#16a34a" />
                                  ) : (
                                    <IconClock size={16} color="#94a3b8" />
                                  )}
                                  <Typography
                                    variant="body2"
                                    fontWeight={isItemActive ? 700 : 500}
                                    color={isItemActive ? "primary.main" : "text.primary"}
                                  >
                                    {item.name}
                                  </Typography>
                                </Stack>
                                {item.condition && (
                                  <Chip
                                    label={item.condition === "damaged" ? "Damaged" : item.condition === "good" ? "Good" : item.condition === "minor_defects" ? "Minor" : "N/A"}
                                    size="small"
                                    color={
                                      item.condition === "damaged"
                                        ? "error"
                                        : item.condition === "good"
                                        ? "success"
                                        : item.condition === "minor_defects"
                                        ? "warning"
                                        : "default"
                                    }
                                    sx={{ height: 18, fontSize: "0.65rem" }}
                                  />
                                )}
                              </Stack>
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                  </Paper>
                );
              })}
            </Box>
          </BlankCard>
        </Grid>

        {/* Right Column: Active Element Inspector */}
        <Grid size={{ xs: 12, md: 8, lg: 8.5 }}>
          {activeItem ? (
            <BlankCard>
              {/* Element Header */}
              <Box p={3} borderBottom="1px solid" borderColor="divider">
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={1}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      {activeRoom?.name?.toUpperCase()} • ELEMENT {currentIndex + 1} OF {allElements.length}
                    </Typography>
                    <Typography variant="h4" fontWeight={800} mt={0.5}>
                      {activeItem.name}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center">
                    {activeItem.output_unit && (
                      <Chip
                        label={`Unit: ${activeItem.output_unit}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                    <Chip
                      label={activeItem.is_inspected ? "Inspected" : "Pending Inspection"}
                      size="small"
                      color={activeItem.is_inspected ? "success" : "warning"}
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                </Stack>
              </Box>

              <Box p={3}>
                {/* 1. Visual Condition Rating */}
                <Typography variant="subtitle1" fontWeight={700} mb={1}>
                  1. Visual Condition Rating *
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  Inspect the physical element on site and record its visual condition
                </Typography>

                <Grid container spacing={2} mb={4}>
                  {conditionOptions.map((opt) => {
                    const isSelected = condition === opt.value;
                    return (
                      <Grid size={{ xs: 12, sm: 6, md: 3 }} key={opt.value}>
                        <Paper
                          variant="outlined"
                          onClick={() => {
                            if (!isReadOnly && !isUnassigned) setCondition(opt.value);
                          }}
                          sx={{
                            p: 2,
                            borderRadius: "10px",
                            cursor: isReadOnly || isUnassigned ? "default" : "pointer",
                            opacity: isReadOnly || isUnassigned ? 0.75 : 1,
                            borderColor: isSelected ? opt.borderColor : "divider",
                            bgcolor: isSelected ? opt.bg : "background.paper",
                            boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.06)" : "none",
                            transition: "all 0.15s ease",
                            "&:hover": {
                              borderColor: isReadOnly || isUnassigned ? "divider" : opt.borderColor,
                              bgcolor: isReadOnly || isUnassigned ? undefined : opt.bg,
                            },
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="subtitle2" fontWeight={800}>
                              {opt.label}
                            </Typography>
                            {isSelected && <IconCheck size={18} color="#16a34a" />}
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {opt.desc}
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* 2. Site Measurements */}
                <Typography variant="subtitle1" fontWeight={700} mb={1}>
                  2. Site Measurements & Dimensions
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  Enter actual dimensions measured on site. Quantity calculates automatically.
                </Typography>

                <Grid container spacing={2} mb={3}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <CustomTextField
                      label={activeItem.dimension_1_name || "Length"}
                      type="number"
                      size="small"
                      fullWidth
                      disabled={isReadOnly || isUnassigned}
                      value={dim1}
                      onChange={(e: any) => setDim1(e.target.value)}
                      InputProps={{
                        endAdornment: activeItem.dimension_1_unit ? (
                          <Typography variant="caption" color="text.secondary">
                            {activeItem.dimension_1_unit}
                          </Typography>
                        ) : null,
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <CustomTextField
                      label={activeItem.dimension_2_name || "Width"}
                      type="number"
                      size="small"
                      fullWidth
                      disabled={isReadOnly || isUnassigned}
                      value={dim2}
                      onChange={(e: any) => setDim2(e.target.value)}
                      InputProps={{
                        endAdornment: activeItem.dimension_2_unit ? (
                          <Typography variant="caption" color="text.secondary">
                            {activeItem.dimension_2_unit}
                          </Typography>
                        ) : null,
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <CustomTextField
                      label={activeItem.dimension_3_name || "Height / Depth"}
                      type="number"
                      size="small"
                      fullWidth
                      disabled={isReadOnly || isUnassigned}
                      value={dim3}
                      onChange={(e: any) => setDim3(e.target.value)}
                      InputProps={{
                        endAdornment: activeItem.dimension_3_unit ? (
                          <Typography variant="caption" color="text.secondary">
                            {activeItem.dimension_3_unit}
                          </Typography>
                        ) : null,
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <CustomTextField
                      label={`Total Qty (${activeItem.output_unit || "units"})`}
                      type="number"
                      size="small"
                      fullWidth
                      disabled={isReadOnly || isUnassigned}
                      value={qty}
                      onChange={(e: any) => setQty(e.target.value)}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          fontWeight: 700,
                          bgcolor: "#f8fafc",
                        },
                      }}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* 3. Defect & Repair Details (If Damaged or Minor Defects) */}
                {(condition === "damaged" || condition === "minor_defects") && (
                  <Box sx={{ p: 2.5, bgcolor: "#fefce8", borderRadius: "8px", border: "1px solid #fde047", mb: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <IconAlertTriangle size={20} color="#ca8a04" />
                      <Typography variant="subtitle1" fontWeight={700} color="#854d0e">
                        Defect & Repair Specifications
                      </Typography>
                    </Stack>

                    <Grid container spacing={2}>
                      {/* Defect Type Dropdown */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          select
                          label="Defect / Damage Type *"
                          size="small"
                          fullWidth
                          disabled={isReadOnly || isUnassigned}
                          value={damageTypeId}
                          onChange={(e: any) => {
                            const val = e.target.value;
                            setDamageTypeId(val);
                            const found = availableDamageTypes.find((d) => String(d.id) === String(val));
                            setDamageTypeName(found ? found.name : "");
                          }}
                        >
                          <MenuItem value="">
                            <em>Choose defect type...</em>
                          </MenuItem>
                          {availableDamageTypes.map((dt) => (
                            <MenuItem key={dt.id} value={dt.id}>
                              {dt.name}
                            </MenuItem>
                          ))}
                        </CustomTextField>
                      </Grid>

                      {/* Material Dropdown */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          select
                          label="Material Type"
                          size="small"
                          fullWidth
                          disabled={isReadOnly || isUnassigned}
                          value={materialId}
                          onChange={(e: any) => {
                            const val = e.target.value;
                            setMaterialId(val);
                            const found = availableMaterials.find((m) => String(m.id) === String(val));
                            setMaterialName(found ? found.name : "");
                          }}
                        >
                          <MenuItem value="">
                            <em>Choose material...</em>
                          </MenuItem>
                          {availableMaterials.map((mat) => (
                            <MenuItem key={mat.id} value={mat.id}>
                              {mat.name}
                            </MenuItem>
                          ))}
                        </CustomTextField>
                      </Grid>

                      {/* Severity */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          select
                          label="Severity Level"
                          size="small"
                          fullWidth
                          disabled={isReadOnly || isUnassigned}
                          value={severity}
                          onChange={(e: any) => setSeverity(e.target.value)}
                        >
                          {severityOptions.map((sev) => (
                            <MenuItem key={sev.value} value={sev.value}>
                              {sev.label}
                            </MenuItem>
                          ))}
                        </CustomTextField>
                      </Grid>

                      {/* Recommended Repair Action */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          label="Recommended Repair Action"
                          placeholder="e.g., Replace panel, clean & repaint, patch crack"
                          size="small"
                          fullWidth
                          disabled={isReadOnly || isUnassigned}
                          value={repairAction}
                          onChange={(e: any) => setRepairAction(e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Surveyor Notes */}
                <Box mb={3}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                    Surveyor Notes & Observations
                  </Typography>
                  <CustomTextField
                    multiline
                    rows={2}
                    fullWidth
                    disabled={isReadOnly || isUnassigned}
                    size="small"
                    placeholder="Enter any specific site observations, access limitations, or inspection notes..."
                    value={notes}
                    onChange={(e: any) => setNotes(e.target.value)}
                  />
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* 4. Photo Evidence */}
                <Box mb={3}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        4. Photo Evidence & Attachments
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activeItem.element?.surface_photo_minimum
                          ? `Minimum ${activeItem.element.surface_photo_minimum} photo(s) recommended for this element`
                          : "Upload clear photo evidence of element condition or damage"}
                      </Typography>
                    </Box>

                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={uploadingPhoto ? <CircularProgress size={16} /> : <IconCamera size={18} />}
                      disabled={uploadingPhoto || isReadOnly || isUnassigned}
                      size="small"
                    >
                      {uploadingPhoto ? "Uploading..." : "Take / Upload Photo"}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        capture="environment"
                        disabled={uploadingPhoto || isReadOnly || isUnassigned}
                        onChange={handlePhotoUpload}
                      />
                    </Button>
                  </Stack>

                  {/* Photo Thumbnails Gallery */}
                  {(!activeItem.photos || activeItem.photos.length === 0) ? (
                    <Box
                      p={3}
                      textAlign="center"
                      borderRadius="8px"
                      border="1px dashed"
                      borderColor="divider"
                      bgcolor="#f8fafc"
                    >
                      <IconCamera size={32} color="#94a3b8" />
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        No inspection photos attached yet.
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      {activeItem.photos.map((photo: SurveyItemPhoto) => (
                        <Grid size={{ xs: 6, sm: 4, md: 3 }} key={photo.id}>
                          <Paper
                            variant="outlined"
                            sx={{
                              borderRadius: "8px",
                              overflow: "hidden",
                              position: "relative",
                              "&:hover .photo-overlay": { opacity: 1 },
                            }}
                          >
                            <Box
                              component="img"
                              src={getImageUrl(photo.file_path)}
                              alt={photo.file_name || "Inspection Evidence"}
                              sx={{
                                width: "100%",
                                height: 120,
                                objectFit: "cover",
                                display: "block",
                                cursor: "pointer",
                              }}
                              onClick={() => setPreviewPhotoUrl(getImageUrl(photo.file_path))}
                            />
                            {/* Hover overlay with actions */}
                            <Stack
                              className="photo-overlay"
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              justifyContent="center"
                              sx={{
                                position: "absolute",
                                inset: 0,
                                bgcolor: "rgba(0,0,0,0.5)",
                                opacity: 0,
                                transition: "opacity 0.2s ease",
                              }}
                            >
                              <IconButton
                                size="small"
                                sx={{ color: "white", bgcolor: "rgba(255,255,255,0.2)" }}
                                onClick={() => setPreviewPhotoUrl(getImageUrl(photo.file_path))}
                              >
                                <IconEye size={18} />
                              </IconButton>
                              {!isReadOnly && (
                                <IconButton
                                  size="small"
                                  sx={{ color: "white", bgcolor: "rgba(239,68,68,0.7)" }}
                                  onClick={() => handleDeletePhoto(photo.id)}
                                >
                                  <IconTrash size={18} />
                                </IconButton>
                              )}
                            </Stack>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>

                {/* Footer Controls */}
                <Divider sx={{ my: 3 }} />

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={2}
                >
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="outlined"
                      startIcon={<IconChevronLeft size={18} />}
                      onClick={handlePreviousElement}
                      disabled={currentIndex <= 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outlined"
                      endIcon={<IconChevronRight size={18} />}
                      onClick={handleNextElement}
                      disabled={currentIndex >= allElements.length - 1}
                    >
                      Next
                    </Button>
                  </Stack>

                  <Stack direction="row" spacing={1.5} flexWrap="wrap">
                    <Button
                      variant="outlined"
                      onClick={() => handleSaveItem(false)}
                      disabled={saving || isReadOnly || isUnassigned}
                    >
                      {saving ? "Saving..." : "Save Progress"}
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <IconCheck size={18} />}
                      onClick={() => handleSaveItem(true)}
                      disabled={saving || isReadOnly || isUnassigned}
                    >
                      {currentIndex < allElements.length - 1 ? "Save & Next Element" : "Save Inspection"}
                    </Button>
                    {!isReadOnly && !isUnassigned && stats.pct === 100 && stats.total > 0 && (
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<IconClipboardCheck size={18} />}
                        onClick={() => setOpenSubmitDialog(true)}
                        sx={{ fontWeight: 700 }}
                      >
                        Submit Inspection
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Box>
            </BlankCard>
          ) : (
            <BlankCard>
              <Box p={5} textAlign="center">
                <Typography variant="body1" color="text.secondary">
                  No element selected. Select an element from the left room list.
                </Typography>
              </Box>
            </BlankCard>
          )}
        </Grid>
      </Grid>

      {/* Submit Inspection Confirmation Dialog */}
      <Dialog
        open={openSubmitDialog}
        onClose={() => setOpenSubmitDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Submit Inspection for Review</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            All <strong>{stats.total}</strong> elements in this survey have been inspected. Once submitted, the survey findings will be forwarded for quality review and locked for editing.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenSubmitDialog(false)} color="inherit" disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <IconCheck size={18} />}
            onClick={handleSubmitInspection}
            sx={{ fontWeight: 700 }}
          >
            {submitting ? "Submitting..." : "Confirm & Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Photo Preview Modal */}
      <Dialog
        open={Boolean(previewPhotoUrl)}
        onClose={() => setPreviewPhotoUrl(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 1, position: "relative", bgcolor: "black", textAlign: "center" }}>
          <IconButton
            onClick={() => setPreviewPhotoUrl(null)}
            sx={{ position: "absolute", top: 10, right: 10, color: "white", bgcolor: "rgba(0,0,0,0.6)" }}
          >
            <IconX size={20} />
          </IconButton>
          {previewPhotoUrl && (
            <Box
              component="img"
              src={previewPhotoUrl}
              alt="Inspection Evidence Full Preview"
              sx={{ maxHeight: "80vh", maxWidth: "100%", objectFit: "contain" }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
