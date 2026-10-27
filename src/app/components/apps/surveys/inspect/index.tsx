"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  Chip,
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
  InputAdornment,
  Collapse,
  InputBase,
} from "@mui/material";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCircleCheck,
  IconClock,
  IconAlertCircle,
  IconAlertTriangle,
  IconCamera,
  IconTrash,
  IconPlus,
  IconChevronRight,
  IconChevronLeft,
  IconChevronDown,
  IconChevronUp,
  IconBuilding,
  IconMapPin,
  IconUser,
  IconEye,
  IconEyeOff,
  IconCalculator,
  IconRuler,
  IconDoor,
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
  SurveyStatus,
} from "../types";

interface SurveyInspectProps {
  id: string | number;
}

const statusColorMap: Record<
  SurveyStatus,
  "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"
> = {
  draft: "default",
  assigned: "info",
  in_progress: "primary",
  submitted: "primary",
  qs_review: "secondary",
  completed: "success",
  frozen: "success",
};

interface ConditionOption {
  value: ElementCondition;
  label: string;
  score: number;
  desc: string;
  icon: React.ReactNode;
}

const conditionOptions: ConditionOption[] = [
  {
    value: "good",
    label: "Good",
    score: 1,
    desc: "Sound condition with no defects observed",
    icon: <IconCircleCheck size={22} />,
  },
  {
    value: "minor_defects",
    label: "Minor Defects",
    score: 2,
    desc: "Cosmetic wear / minor repairs needed",
    icon: <IconAlertCircle size={22} />,
  },
  {
    value: "damaged",
    label: "Damaged",
    score: 3,
    desc: "Significant damage / defect requiring repair",
    icon: <IconAlertTriangle size={22} />,
  },
  {
    value: "not_accessible",
    label: "Not Accessible",
    score: 4,
    desc: "Locked, obstructed, or hazardous to inspect",
    icon: <IconEyeOff size={22} />,
  },
];

const severityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function calculateQuantity(
  v1Str: string,
  v2Str: string,
  v3Str: string,
  item?: SurveyItem | null
): string {
  if (!item) return "";
  const v1 = parseFloat(v1Str) || 0;
  const v2 = parseFloat(v2Str) || 0;
  const v3 = parseFloat(v3Str) || 0;

  const outputName = (item.element?.output_name || "").toLowerCase();
  const outputUnit = (item.output_unit || item.element?.output_unit || "").toLowerCase();
  const isVolume =
    outputName === "volume" ||
    outputUnit.includes("m³") ||
    outputUnit.includes("m3") ||
    outputUnit.includes("cum");
  const isArea =
    outputName === "area" ||
    outputUnit.includes("m²") ||
    outputUnit.includes("m2") ||
    outputUnit.includes("sqm");
  const isLength =
    outputName === "length" ||
    outputUnit === "m" ||
    outputUnit === "lm";
  const isCount =
    outputName === "count" ||
    outputUnit === "nr" ||
    outputUnit === "item";

  if (isVolume) {
    if (v1 > 0 && v2 > 0 && v3 > 0) {
      return (v1 * v2 * v3).toFixed(2);
    } else if (v1 > 0 && v2 > 0 && !item.element?.dimension_3_name) {
      return (v1 * v2).toFixed(2);
    }
    return "";
  }

  if (isArea) {
    if (v1 > 0 && v2 > 0) {
      return (v1 * v2).toFixed(2);
    }
    return "";
  }

  if (isLength) {
    if (v1 > 0) return v1.toFixed(2);
    return "";
  }

  if (isCount) {
    if (v1 > 0) return String(Math.round(v1));
    return "";
  }

  // Fallback: multiple dimensions
  if (v1 > 0 && v2 > 0 && v3 > 0) {
    return (v1 * v2 * v3).toFixed(2);
  } else if (v1 > 0 && v2 > 0) {
    return (v1 * v2).toFixed(2);
  } else if (v1 > 0) {
    return v1.toFixed(2);
  }

  return "";
}

export default function SurveyInspectWorkspace({ id }: SurveyInspectProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<Survey | null>(null);

  // Active selection
  const [activeRoomId, setActiveRoomId] = useState<string | number | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | number | null>(null);

  // Room accordion expanded states
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});

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

  // Modals
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isUnassigned = Boolean(survey && !survey.surveyor_id);
  const isReadOnly = Boolean(
    survey && ["submitted", "qs_review", "completed", "frozen"].includes(survey.status)
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

        // Auto-select first room and element if not set
        if (s.rooms && s.rooms.length > 0) {
          const firstRoom = s.rooms[0];
          setActiveRoomId((prev) => (prev ? prev : firstRoom.id));
          if (firstRoom.items && firstRoom.items.length > 0) {
            setActiveItemId((prev) => (prev ? prev : firstRoom.items[0].id));
          }

          // Expand all rooms by default
          setExpandedRooms((prev) => {
            const next = { ...prev };
            s.rooms.forEach((r) => {
              if (next[r.id] === undefined) {
                next[r.id] = true;
              }
            });
            return next;
          });
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

  // Expand active room
  useEffect(() => {
    if (activeRoomId) {
      setExpandedRooms((prev) => ({ ...prev, [activeRoomId]: true }));
    }
  }, [activeRoomId]);

  // Populate local form state when the user moves to a different element. Survey reloads
  // (e.g. after a photo upload/delete) must not wipe unsaved entries for the current element.
  const populatedItemIdRef = useRef<string | number | null>(null);
  useEffect(() => {
    if (activeItem && populatedItemIdRef.current !== activeItem.id) {
      populatedItemIdRef.current = activeItem.id;
      setCondition(activeItem.condition || "");
      const d1 =
        activeItem.dimension_1_value !== null && activeItem.dimension_1_value !== undefined
          ? String(activeItem.dimension_1_value)
          : "";
      const d2 =
        activeItem.dimension_2_value !== null && activeItem.dimension_2_value !== undefined
          ? String(activeItem.dimension_2_value)
          : "";
      const d3 =
        activeItem.dimension_3_value !== null && activeItem.dimension_3_value !== undefined
          ? String(activeItem.dimension_3_value)
          : "";
      const d4 =
        activeItem.dimension_4_value !== null && activeItem.dimension_4_value !== undefined
          ? String(activeItem.dimension_4_value)
          : "";

      setDim1(d1);
      setDim2(d2);
      setDim3(d3);
      setDim4(d4);

      if (activeItem.calculated_qty !== null && activeItem.calculated_qty !== undefined) {
        setQty(String(activeItem.calculated_qty));
      } else {
        const computed = calculateQuantity(d1, d2, d3, activeItem);
        setQty(computed);
      }

      setDamageTypeId(activeItem.damage_type_id || "");
      setDamageTypeName(activeItem.damage_type_name || "");
      setMaterialId(activeItem.material_id || "");
      setMaterialName(activeItem.material_name || "");
      setSeverity((activeItem.severity as string) || "medium");
      setRepairAction(activeItem.repair_action || "");
      setNotes(activeItem.notes || "");
    }
  }, [activeItem]);

  // Dimension and Unit Resolution with element fallbacks
  const dim1Label =
    activeItem?.dimension_1_name ||
    activeItem?.element?.dimension_1_name ||
    activeItem?.element?.dimensions_data?.[0]?.name ||
    "Length";
  const dim1Unit =
    activeItem?.dimension_1_unit ||
    activeItem?.element?.dimension_1_unit ||
    activeItem?.element?.dimensions_data?.[0]?.unit ||
    "m";

  const dim2Label =
    activeItem?.dimension_2_name ||
    activeItem?.element?.dimension_2_name ||
    activeItem?.element?.dimensions_data?.[1]?.name ||
    "Width";
  const dim2Unit =
    activeItem?.dimension_2_unit ||
    activeItem?.element?.dimension_2_unit ||
    activeItem?.element?.dimensions_data?.[1]?.unit ||
    "m";

  const dim3Label =
    activeItem?.dimension_3_name ||
    activeItem?.element?.dimension_3_name ||
    activeItem?.element?.dimensions_data?.[2]?.name ||
    "Height / Depth";
  const dim3Unit =
    activeItem?.dimension_3_unit ||
    activeItem?.element?.dimension_3_unit ||
    activeItem?.element?.dimensions_data?.[2]?.unit ||
    "m";

  const outputName =
    activeItem?.element?.output_name ||
    (activeItem?.element?.measurement_mode === "volume" ? "Volume" : "Area");

  const outputUnit =
    activeItem?.output_unit ||
    activeItem?.element?.output_unit ||
    (outputName === "Volume" ? "m³" : "m²");

  const hasDim3 = Boolean(
    activeItem?.element?.dimension_3_name ||
    activeItem?.dimension_3_name ||
    outputName === "Volume" ||
    outputUnit === "m³" ||
    outputUnit === "m3" ||
    (!activeItem?.element)
  );

  const formulaText = useMemo(() => {
    if (outputName === "Volume" || outputUnit === "m³" || outputUnit === "m3") {
      return `${dim1Label} × ${dim2Label} × ${dim3Label}`;
    }
    if (outputName === "Area" || outputUnit === "m²" || outputUnit === "m2") {
      return `${dim1Label} × ${dim2Label}`;
    }
    if (outputName === "Length" || outputUnit === "m" || outputUnit === "lm") {
      return dim1Label;
    }
    if (outputName === "Count" || outputUnit === "nr") {
      return "Count";
    }
    if (hasDim3) {
      return `${dim1Label} × ${dim2Label} × ${dim3Label}`;
    }
    return `${dim1Label} × ${dim2Label}`;
  }, [outputName, outputUnit, dim1Label, dim2Label, dim3Label, hasDim3]);

  const handleDimChange = (dimIndex: 1 | 2 | 3, value: string) => {
    let v1 = dim1;
    let v2 = dim2;
    let v3 = dim3;

    if (dimIndex === 1) {
      setDim1(value);
      v1 = value;
    } else if (dimIndex === 2) {
      setDim2(value);
      v2 = value;
    } else if (dimIndex === 3) {
      setDim3(value);
      v3 = value;
    }

    if (activeItem) {
      const calculated = calculateQuantity(v1, v2, v3, activeItem);
      if (calculated !== "") {
        setQty(calculated);
      }
    }
  };

  // Auto-calculate quantity based on element dimensions
  useEffect(() => {
    if (!activeItem) return;
    const computed = calculateQuantity(dim1, dim2, dim3, activeItem);
    if (computed !== "") {
      setQty(computed);
    }
  }, [dim1, dim2, dim3, activeItem]);

  // Available damage types & materials
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

  // Progress stats
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

  // Navigation across all elements
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

  const isLastElement = currentIndex >= allElements.length - 1;
  const isAllInspected = stats.pct === 100 && stats.total > 0;

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
        dimension_1_name: dim1Label,
        dimension_1_unit: dim1Unit,
        dimension_1_value: dim1 !== "" ? parseFloat(dim1) : null,
        dimension_2_name: dim2Label,
        dimension_2_unit: dim2Unit,
        dimension_2_value: dim2 !== "" ? parseFloat(dim2) : null,
        dimension_3_name: hasDim3 ? dim3Label : null,
        dimension_3_unit: hasDim3 ? dim3Unit : null,
        dimension_3_value: hasDim3 && dim3 !== "" ? parseFloat(dim3) : null,
        dimension_4_value: dim4 !== "" ? parseFloat(dim4) : null,
        calculated_qty: qty !== "" ? parseFloat(qty) : null,
        output_unit: outputUnit,
        is_inspected: true,
      };

      const res = await api.post("surveys/inspect-item", payload);
      if (res.data?.IsSuccess) {
        toast.success("Inspection saved");
        await loadSurvey();

        if (shouldMoveToNext && !isLastElement) {
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
        toast.success("Photo uploaded");
        await loadSurvey();
      } else {
        toast.error(res.data?.message || "Failed to upload photo");
      }
    } catch (err: any) {
      console.error("Photo upload error", err);
      toast.error(err?.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
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

  const toggleRoomExpand = (roomId: string | number) => {
    setExpandedRooms((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }));
  };

  if (loading) {
    return (
      <Box p={8} textAlign="center">
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            Loading inspection workspace...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!survey) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6">Survey not found</Typography>
        <Button
          variant="outlined"
          sx={{ mt: 2 }}
          onClick={() => router.push("/apps/surveys/list")}
        >
          Return to Surveys
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* ================================================================== */}
      {/* 1. HEADER CARD (Clean, minimal, Belcka styled)                     */}
      {/* ================================================================== */}
      <BlankCard sx={{ mb: 2.5 }}>
        <Box p={{ xs: 2, md: 2.5 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
          >
            {/* Title & Metadata */}
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
              <Tooltip title="Back to Survey Details">
                <IconButton
                  component={Link}
                  href={`/apps/surveys/view/${id}`}
                  size="small"
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "8px",
                  }}
                >
                  <IconArrowLeft size={18} />
                </IconButton>
              </Tooltip>

              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <Typography variant="h4" fontWeight={700} noWrap>
                    {survey.title || survey.reference}
                  </Typography>

                  <Chip
                    label={survey.status.replace("_", " ").toUpperCase()}
                    size="small"
                    color={statusColorMap[survey.status] || "default"}
                    sx={{ fontWeight: 600, height: 22, fontSize: "0.75rem" }}
                  />

                  {survey.reference && (
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Ref: {survey.reference}
                    </Typography>
                  )}
                </Stack>

                {/* Metadata Row */}
                <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center" mt={0.5}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                    <IconBuilding size={15} />
                    <Typography variant="body2" color="text.secondary">
                      {survey.project_name || survey.project?.name || "General Project"}
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="divider">
                    •
                  </Typography>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                    <IconMapPin size={15} />
                    <Typography variant="body2" color="text.secondary">
                      {survey.property_name || survey.address?.name || "Property Site"}
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="divider">
                    •
                  </Typography>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                    <IconUser size={15} />
                    <Typography variant="body2" color="text.secondary">
                      {survey.surveyor_name ||
                        (survey.surveyor
                          ? `${survey.surveyor.first_name} ${survey.surveyor.last_name}`
                          : "Unassigned")}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>

            {/* Inspection Progress Tracker (Clean, no duplicate button) */}
            <Box sx={{ width: { xs: "100%", md: 220 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Inspection Progress
                </Typography>
                <Typography variant="caption" fontWeight={700} color="text.primary">
                  {stats.inspected} / {stats.total} ({stats.pct}%)
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={stats.pct}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: "grey.100",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 3,
                    bgcolor: stats.pct === 100 ? "success.main" : "primary.main",
                  },
                }}
              />
            </Box>
          </Stack>
        </Box>
      </BlankCard>

      {/* ================================================================== */}
      {/* 2. ALERTS (Shown only when meaningful)                             */}
      {/* ================================================================== */}
      {survey.qs_status === "rework_requested" && survey.rework_notes && (
        <Alert severity="warning" sx={{ mb: 2.5, borderRadius: "8px" }}>
          <strong>Quality Review / QS Rework Requested:</strong> {survey.rework_notes}
        </Alert>
      )}

      {isUnassigned && (
        <Alert severity="warning" sx={{ mb: 2.5, borderRadius: "8px" }}>
          This survey does not have an assigned surveyor. Assign an active surveyor to record inspection data.
        </Alert>
      )}

      {isReadOnly && (
        <Alert severity="info" sx={{ mb: 2.5, borderRadius: "8px" }}>
          This survey is in <strong>{survey.status.replace("_", " ").toUpperCase()}</strong> status and is locked for editing.
        </Alert>
      )}

      {!isReadOnly && !isUnassigned && isAllInspected && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: "8px" }}>
          All {stats.total} elements have been inspected. Review your entries and click <strong>Submit Inspection</strong> at the bottom when ready.
        </Alert>
      )}

      {/* ================================================================== */}
      {/* 3. MAIN WORKSPACE: LEFT NAVIGATOR + RIGHT INSPECTOR                */}
      {/* ================================================================== */}
      <Grid container spacing={2.5}>
        {/* Left Column: Rooms & Elements Navigation */}
        <Grid size={{ xs: 12, md: 4, lg: 3.5 }}>
          <Box sx={{ position: { md: "sticky" }, top: 85 }}>
            <BlankCard>
              <Box p={2} borderBottom="1px solid" borderColor="divider">
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconDoor size={18} />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Rooms & Areas
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {survey.rooms.length} {survey.rooms.length === 1 ? "room" : "rooms"}
                  </Typography>
                </Stack>
              </Box>

              <Box p={1.5} sx={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
                {survey.rooms.map((room, rIdx) => {
                  const roomItems = room.items || [];
                  const roomInspected = roomItems.filter((i) => i.is_inspected).length;
                  const isRoomActive = activeRoom?.id === room.id;
                  const isExpanded = expandedRooms[room.id] ?? true;
                  const isRoomComplete = roomInspected === roomItems.length && roomItems.length > 0;

                  return (
                    <Box
                      key={room.id}
                      sx={{
                        mb: 1,
                        borderRadius: "8px",
                        border: "1px solid",
                        borderColor: isRoomActive ? "primary.main" : "divider",
                        overflow: "hidden",
                      }}
                    >
                      {/* Room Header Trigger */}
                      <Box
                        p={1.25}
                        sx={{
                          cursor: "pointer",
                          userSelect: "none",
                          bgcolor: isRoomActive ? "grey.50" : "background.paper",
                          "&:hover": { bgcolor: "grey.50" },
                        }}
                        onClick={() => {
                          setActiveRoomId(room.id);
                          if (roomItems.length > 0 && !roomItems.some((i) => i.id === activeItemId)) {
                            setActiveItemId(roomItems[0].id);
                          }
                          toggleRoomExpand(room.id);
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography
                            variant="subtitle2"
                            fontWeight={isRoomActive ? 700 : 600}
                            color={isRoomActive ? "primary.main" : "text.primary"}
                          >
                            {rIdx + 1}. {room.name}
                          </Typography>

                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              color={isRoomComplete ? "success.main" : "text.secondary"}
                            >
                              {roomInspected}/{roomItems.length}
                            </Typography>
                            {isExpanded ? (
                              <IconChevronUp size={15} color="#64748b" />
                            ) : (
                              <IconChevronDown size={15} color="#64748b" />
                            )}
                          </Stack>
                        </Stack>
                      </Box>

                      {/* Room Items List */}
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Stack
                          spacing={0.5}
                          p={0.75}
                          bgcolor="background.paper"
                          borderTop="1px solid"
                          borderColor="divider"
                        >
                          {roomItems.map((item) => {
                            const isItemActive = activeItem?.id === item.id;
                            const photoCount = item.photos?.length || 0;

                            return (
                              <Box
                                key={item.id}
                                onClick={() => {
                                  setActiveRoomId(room.id);
                                  setActiveItemId(item.id);
                                }}
                                sx={{
                                  p: 1,
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  borderLeft: isItemActive ? "3px solid #1e4db7" : "3px solid transparent",
                                  bgcolor: isItemActive ? "grey.100" : "transparent",
                                  "&:hover": {
                                    bgcolor: isItemActive ? "grey.100" : "grey.50",
                                  },
                                }}
                              >
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                  <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                                    {item.is_inspected ? (
                                      <IconCheck size={15} color="#10b981" />
                                    ) : (
                                      <IconClock size={15} color="#94a3b8" />
                                    )}
                                    <Typography
                                      variant="body2"
                                      fontWeight={isItemActive ? 700 : 500}
                                      color={isItemActive ? "primary.main" : "text.primary"}
                                      noWrap
                                    >
                                      {item.name}
                                    </Typography>
                                  </Stack>

                                  <Stack direction="row" spacing={0.5} alignItems="center">
                                    {photoCount > 0 && (
                                      <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                                        <IconCamera size={12} /> {photoCount}
                                      </Typography>
                                    )}

                                    {item.condition && (
                                      <Chip
                                        label={
                                          item.condition === "damaged"
                                            ? "Damaged"
                                            : item.condition === "good"
                                            ? "Good"
                                            : item.condition === "minor_defects"
                                            ? "Minor"
                                            : "N/A"
                                        }
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                          height: 18,
                                          fontSize: "0.65rem",
                                          fontWeight: 600,
                                        }}
                                      />
                                    )}
                                  </Stack>
                                </Stack>
                              </Box>
                            );
                          })}
                        </Stack>
                      </Collapse>
                    </Box>
                  );
                })}
              </Box>
            </BlankCard>
          </Box>
        </Grid>

        {/* Right Column: Active Element Inspector Workspace */}
        <Grid size={{ xs: 12, md: 8, lg: 8.5 }}>
          {activeItem ? (
            <BlankCard>
              {/* Element Header */}
              <Box p={{ xs: 2, sm: 2.5 }} borderBottom="1px solid" borderColor="divider">
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={1}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {activeRoom?.name} • Element {currentIndex + 1} of {allElements.length}
                    </Typography>
                    <Typography variant="h3" fontWeight={700} mt={0.25}>
                      {activeItem.name}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center">
                    {outputUnit && (
                      <Chip
                        icon={<IconRuler size={13} />}
                        label={`Unit: ${outputUnit}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    )}

                    <Chip
                      label={activeItem.is_inspected ? "Inspected" : "Pending"}
                      size="small"
                      color={activeItem.is_inspected ? "success" : "default"}
                      variant={activeItem.is_inspected ? "filled" : "outlined"}
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>
                </Stack>
              </Box>

              {/* Inspector Form Sections */}
              <Box p={{ xs: 2, sm: 2.5 }}>
                {/* 1. Visual Condition Rating */}
                <Box mb={3.5}>
                  <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
                    1. Visual Condition Rating
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                    Inspect the element on site and record its physical condition.
                  </Typography>

                  <Grid container spacing={1.5}>
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
                              p: 1.75,
                              borderRadius: "8px",
                              cursor: isReadOnly || isUnassigned ? "default" : "pointer",
                              opacity: isReadOnly || isUnassigned ? 0.75 : 1,
                              borderColor: isSelected ? "primary.main" : "divider",
                              borderWidth: isSelected ? "2px" : "1px",
                              bgcolor: isSelected ? "grey.50" : "background.paper",
                              transition: "all 0.15s ease",
                              "&:hover": {
                                borderColor: isReadOnly || isUnassigned ? "divider" : "primary.main",
                              },
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={1} mb={0.75}>
                              <Box
                                sx={{
                                  color: isSelected ? "primary.main" : "text.secondary",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                {opt.icon}
                              </Box>
                              <Typography
                                variant="subtitle2"
                                fontWeight={isSelected ? 700 : 600}
                                color={isSelected ? "primary.main" : "text.primary"}
                              >
                                {opt.label}
                              </Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              {opt.desc}
                            </Typography>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* 2. Site Measurements & Dimensions */}
                <Box mb={3.5}>
                  <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
                    2. Site Measurements & Dimensions
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                    Enter actual site dimensions. The billable quantity calculates automatically.
                  </Typography>

                  <Grid container spacing={2} alignItems="stretch">
                    <Grid size={{ xs: 12, sm: hasDim3 ? 6 : 4, md: hasDim3 ? 3 : 4 }}>
                      <CustomTextField
                        label={dim1Label}
                        type="number"
                        size="small"
                        fullWidth
                        disabled={isReadOnly || isUnassigned}
                        value={dim1}
                        onChange={(e: any) => handleDimChange(1, e.target.value)}
                        placeholder="0.00"
                        InputProps={{
                          endAdornment: dim1Unit ? (
                            <InputAdornment position="end">
                              <Typography variant="caption" color="text.secondary">
                                {dim1Unit}
                              </Typography>
                            </InputAdornment>
                          ) : null,
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: hasDim3 ? 6 : 4, md: hasDim3 ? 3 : 4 }}>
                      <CustomTextField
                        label={dim2Label}
                        type="number"
                        size="small"
                        fullWidth
                        disabled={isReadOnly || isUnassigned}
                        value={dim2}
                        onChange={(e: any) => handleDimChange(2, e.target.value)}
                        placeholder="0.00"
                        InputProps={{
                          endAdornment: dim2Unit ? (
                            <InputAdornment position="end">
                              <Typography variant="caption" color="text.secondary">
                                {dim2Unit}
                              </Typography>
                            </InputAdornment>
                          ) : null,
                        }}
                      />
                    </Grid>

                    {hasDim3 && (
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <CustomTextField
                          label={dim3Label}
                          type="number"
                          size="small"
                          fullWidth
                          disabled={isReadOnly || isUnassigned}
                          value={dim3}
                          onChange={(e: any) => handleDimChange(3, e.target.value)}
                          placeholder="0.00"
                          InputProps={{
                            endAdornment: dim3Unit ? (
                              <InputAdornment position="end">
                                <Typography variant="caption" color="text.secondary">
                                  {dim3Unit}
                                </Typography>
                              </InputAdornment>
                            ) : null,
                          }}
                        />
                      </Grid>
                    )}

                    {/* Integrated Calculation Result Card */}
                    <Grid size={{ xs: 12, sm: hasDim3 ? 6 : 4, md: hasDim3 ? 3 : 4 }}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: "8px",
                          bgcolor: "grey.50",
                          borderColor: "divider",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                        }}
                      >
                        <Stack direction="row" spacing={0.5} alignItems="center" mb={0.25}>
                          <IconCalculator size={15} color="#64748b" />
                          <Typography variant="caption" fontWeight={600} color="text.secondary">
                            Calculated Qty
                          </Typography>
                        </Stack>

                        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                          <InputBase
                            value={qty}
                            onChange={(e: any) => setQty(e.target.value)}
                            placeholder="0.00"
                            disabled={isReadOnly || isUnassigned}
                            type="number"
                            inputProps={{ step: "any" }}
                            sx={{
                              fontSize: "1.6rem",
                              fontWeight: 700,
                              color: "text.primary",
                              width: "100%",
                              maxWidth: 130,
                              "& input": { p: 0 },
                            }}
                          />
                          <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            {outputUnit}
                          </Typography>
                        </Box>

                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                          {formulaText}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                {/* 3. Defect & Repair Specifications (Only when Damaged or Minor Defects) */}
                {(condition === "damaged" || condition === "minor_defects") && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Box mb={3.5}>
                      <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
                        3. Defect & Repair Specifications
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                        Provide defect classification and remedial action for commercial costing.
                      </Typography>

                      <Grid container spacing={2}>
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
                              <em>Select defect type...</em>
                            </MenuItem>
                            {availableDamageTypes.map((dt) => (
                              <MenuItem key={dt.id} value={dt.id}>
                                {dt.name}
                              </MenuItem>
                            ))}
                          </CustomTextField>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                          <CustomTextField
                            select
                            label="Material Classification"
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
                              <em>Select material...</em>
                            </MenuItem>
                            {availableMaterials.map((mat) => (
                              <MenuItem key={mat.id} value={mat.id}>
                                {mat.name}
                              </MenuItem>
                            ))}
                          </CustomTextField>
                        </Grid>

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

                        <Grid size={{ xs: 12, sm: 6 }}>
                          <CustomTextField
                            label="Recommended Repair Action"
                            placeholder="e.g. Replace pane, clean & repaint, patch crack"
                            size="small"
                            fullWidth
                            disabled={isReadOnly || isUnassigned}
                            value={repairAction}
                            onChange={(e: any) => setRepairAction(e.target.value)}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  </>
                )}

                <Divider sx={{ my: 3 }} />

                {/* 4. Surveyor Notes */}
                <Box mb={3.5}>
                  <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
                    4. Surveyor Notes
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                    Site observations, accessibility limits, or specific inspector comments.
                  </Typography>
                  <CustomTextField
                    multiline
                    rows={2}
                    fullWidth
                    disabled={isReadOnly || isUnassigned}
                    size="small"
                    placeholder="Enter any notes or observations..."
                    value={notes}
                    onChange={(e: any) => setNotes(e.target.value)}
                  />
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* 5. Photo Evidence */}
                <Box mb={3.5}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1.5}
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        5. Photo Evidence
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activeItem.element?.surface_photo_minimum
                          ? `Minimum ${activeItem.element.surface_photo_minimum} photo(s) recommended`
                          : "Upload site photos of element condition or defects (optional)"}
                      </Typography>
                    </Box>

                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={uploadingPhoto ? <CircularProgress size={14} /> : <IconCamera size={16} />}
                      disabled={uploadingPhoto || isReadOnly || isUnassigned}
                      size="small"
                    >
                      {uploadingPhoto ? "Uploading..." : "Upload Photo"}
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

                  {/* Photo Cards Grid */}
                  {(!activeItem.photos || activeItem.photos.length === 0) ? (
                    <Box
                      component="label"
                      sx={{
                        p: 3,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "8px",
                        border: "1px dashed",
                        borderColor: "divider",
                        bgcolor: "grey.50",
                        cursor: isReadOnly || isUnassigned ? "default" : "pointer",
                        "&:hover": {
                          borderColor: isReadOnly || isUnassigned ? "divider" : "primary.main",
                        },
                      }}
                    >
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        capture="environment"
                        disabled={uploadingPhoto || isReadOnly || isUnassigned}
                        onChange={handlePhotoUpload}
                      />
                      <IconCamera size={28} color="#94a3b8" />
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        No photos attached. Click to upload site evidence.
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={1.5}>
                      {activeItem.photos.map((photo: SurveyItemPhoto, pIdx: number) => (
                        <Grid size={{ xs: 6, sm: 4, md: 3 }} key={photo.id}>
                          <Paper
                            variant="outlined"
                            sx={{
                              borderRadius: "8px",
                              overflow: "hidden",
                              position: "relative",
                              borderColor: "divider",
                              "&:hover .photo-overlay": { opacity: 1 },
                            }}
                          >
                            <Box
                              component="img"
                              src={getImageUrl(photo.file_path)}
                              alt={photo.file_name || `Evidence ${pIdx + 1}`}
                              sx={{
                                width: "100%",
                                height: 110,
                                objectFit: "cover",
                                display: "block",
                                cursor: "pointer",
                              }}
                              onClick={() => setPreviewPhotoUrl(getImageUrl(photo.file_path))}
                            />

                            {/* Hover overlay with zoom & delete */}
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
                              <Tooltip title="View Full Photo">
                                <IconButton
                                  size="small"
                                  sx={{ color: "white", bgcolor: "rgba(255,255,255,0.2)" }}
                                  onClick={() => setPreviewPhotoUrl(getImageUrl(photo.file_path))}
                                >
                                  <IconEye size={16} />
                                </IconButton>
                              </Tooltip>

                              {!isReadOnly && !isUnassigned && (
                                <Tooltip title="Delete Photo">
                                  <IconButton
                                    size="small"
                                    sx={{ color: "white", bgcolor: "rgba(239,68,68,0.8)" }}
                                    onClick={() => handleDeletePhoto(photo.id)}
                                  >
                                    <IconTrash size={16} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </Paper>
                        </Grid>
                      ))}

                      {/* Add more photo card */}
                      {!isReadOnly && !isUnassigned && (
                        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                          <Box
                            component="label"
                            sx={{
                              height: 110,
                              borderRadius: "8px",
                              border: "1px dashed",
                              borderColor: "divider",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              "&:hover": { borderColor: "primary.main" },
                            }}
                          >
                            <input
                              type="file"
                              hidden
                              accept="image/*"
                              capture="environment"
                              disabled={uploadingPhoto}
                              onChange={handlePhotoUpload}
                            />
                            <IconPlus size={20} color="#64748b" />
                            <Typography variant="caption" color="text.secondary" mt={0.5}>
                              Add Photo
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  )}
                </Box>

                {/* ------------------------------------------------------------ */}
                {/* 6. Action Toolbar (Clear hierarchy, no duplicates)           */}
                {/* ------------------------------------------------------------ */}
                <Divider sx={{ my: 3 }} />

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", sm: "center" }}
                  spacing={1.5}
                >
                  {/* Left: Previous / Next Navigation */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<IconChevronLeft size={16} />}
                      onClick={handlePreviousElement}
                      disabled={currentIndex <= 0}
                    >
                      Previous
                    </Button>

                    <Button
                      variant="outlined"
                      size="small"
                      endIcon={<IconChevronRight size={16} />}
                      onClick={handleNextElement}
                      disabled={isLastElement}
                    >
                      Next
                    </Button>

                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {currentIndex + 1} of {allElements.length}
                    </Typography>
                  </Stack>

                  {/* Right: Actions */}
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button
                      variant="outlined"
                      size="medium"
                      onClick={() => handleSaveItem(false)}
                      disabled={saving || isReadOnly || isUnassigned}
                      sx={{ fontWeight: 600 }}
                    >
                      {saving ? "Saving..." : "Save Progress"}
                    </Button>

                    {/* Single Main Action Button */}
                    {!isReadOnly && !isUnassigned && isAllInspected ? (
                      <Button
                        variant="contained"
                        color="primary"
                        size="medium"
                        startIcon={<IconCheck size={18} />}
                        onClick={() => setOpenSubmitDialog(true)}
                        sx={{ fontWeight: 700 }}
                      >
                        Submit Inspection
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="primary"
                        size="medium"
                        endIcon={
                          saving ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : isLastElement ? (
                            <IconCheck size={18} />
                          ) : (
                            <IconArrowRight size={18} />
                          )
                        }
                        onClick={() => handleSaveItem(!isLastElement)}
                        disabled={saving || isReadOnly || isUnassigned}
                        sx={{ fontWeight: 700 }}
                      >
                        {isLastElement ? "Save Inspection" : "Save & Next"}
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Box>
            </BlankCard>
          ) : (
            <BlankCard>
              <Box p={6} textAlign="center">
                <IconDoor size={40} color="#94a3b8" />
                <Typography variant="h6" fontWeight={600} mt={1}>
                  No Element Selected
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  Select an element from the left room list to begin inspection.
                </Typography>
              </Box>
            </BlankCard>
          )}
        </Grid>
      </Grid>

      {/* ================================================================== */}
      {/* 4. SUBMIT CONFIRMATION DIALOG                                      */}
      {/* ================================================================== */}
      <Dialog
        open={openSubmitDialog}
        onClose={() => setOpenSubmitDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "10px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Submit Inspection for Review</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            All <strong>{stats.total}</strong> elements in this survey have been inspected. Once submitted, the survey will be marked as <strong>SUBMITTED</strong> and locked for quality review.
          </Typography>
          <Box
            sx={{
              p: 1.5,
              borderRadius: "8px",
              bgcolor: "grey.50",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" color="text.secondary" display="block">
              Inspection Summary
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {stats.total} of {stats.total} elements completed (100%)
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setOpenSubmitDialog(false)}
            color="inherit"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <IconCheck size={16} />}
            onClick={handleSubmitInspection}
            sx={{ fontWeight: 700 }}
          >
            {submitting ? "Submitting..." : "Confirm & Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================== */}
      {/* 5. PHOTO FULL PREVIEW MODAL                                        */}
      {/* ================================================================== */}
      <Dialog
        open={Boolean(previewPhotoUrl)}
        onClose={() => setPreviewPhotoUrl(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: "10px", overflow: "hidden" } }}
      >
        <DialogContent sx={{ p: 0, position: "relative", bgcolor: "black", textAlign: "center" }}>
          <IconButton
            onClick={() => setPreviewPhotoUrl(null)}
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              color: "white",
              bgcolor: "rgba(0,0,0,0.6)",
              "&:hover": { bgcolor: "rgba(0,0,0,0.85)" },
            }}
          >
            <IconX size={18} />
          </IconButton>
          {previewPhotoUrl && (
            <Box
              component="img"
              src={previewPhotoUrl}
              alt="Inspection Evidence Preview"
              sx={{
                maxHeight: "80vh",
                maxWidth: "100%",
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
