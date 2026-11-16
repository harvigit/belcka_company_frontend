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
  CardContent,
  Grid,
  Divider,
  MenuItem,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip,
  Paper,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
} from "@mui/material";
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconAlertTriangle,
  IconLock,
  IconPlus,
  IconTrash,
  IconEye,
  IconSparkles,
  IconRotateClockwise,
  IconDeviceFloppy,
  IconCircleCheck,
  IconArrowRight,
  IconCalculator,
  IconBuilding,
  IconMapPin,
  IconUser,
  IconX,
  IconShieldCheck,
  IconCamera,
  IconSearch,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import useSurveyAccess from "../useSurveyAccess";
import AddedOnSiteChip from "../AddedOnSiteChip";
import BlankCard from "@/app/components/shared/BlankCard";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import {
  SurveyScopeData,
  SurveyScopeItem,
  SurveyEvidenceItem,
  SurveyItemPhoto,
} from "../types";

interface SurveyQSWorkspaceProps {
  id: string | number;
}

const statusColorMap: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
  draft: "default",
  assigned: "info",
  in_progress: "primary",
  submitted: "primary",
  qs_review: "secondary",
  completed: "success",
  frozen: "default",
};

// Survey photos are stored as paths on the API server (e.g. /static/uploads/surveys/x.jpg).
const surveyPhotoUrl = (path?: string | null) => {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
};

export default function SurveyQSWorkspace({ id }: SurveyQSWorkspaceProps) {
  const router = useRouter();
  const access = useSurveyAccess();

  const [loading, setLoading] = useState<boolean>(true);
  // Save state per work line: lines save on their own when the user leaves a field.
  const [lineStatus, setLineStatus] = useState<Record<number, "saving" | "saved" | "error">>({});
  const [savingAdjustments, setSavingAdjustments] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Scope Data
  const [scopeData, setScopeData] = useState<SurveyScopeData | null>(null);

  // Selected Evidence Item for Right-hand Inspector Pane
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<number | null>(null);
  // A manually added line (no surveyed element) picked in the list; the right panel then explains
  // that it has no site evidence instead of showing another line's photos.
  const [manualLineId, setManualLineId] = useState<number | null>(null);

  // Room & Search Filters
  const [selectedRoom, setSelectedRoom] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Whole Scope Adjustment State
  const [adjustSign, setAdjustSign] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<string>("percent");
  const [adjustValue, setAdjustValue] = useState<number | "">(0);
  const [durationDays, setDurationDays] = useState<number | string>("");

  // Modal States
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [reworkModalOpen, setReworkModalOpen] = useState<boolean>(false);
  const [reworkNotes, setReworkNotes] = useState<string>("");
  const [lockModalOpen, setLockModalOpen] = useState<boolean>(false);
  const [lockNotes, setLockNotes] = useState<string>("");
  const [previewPhoto, setPreviewPhoto] = useState<SurveyItemPhoto | null>(null);

  // New Work Item Form State
  const [newItemData, setNewItemData] = useState<{
    survey_item_id?: number | "";
    room_name: string;
    element_name: string;
    item_code: string;
    description: string;
    // "" while the user has cleared the field to type a new number.
    quantity: number | "";
    unit: string;
    unit_rate: number | "";
    notes: string;
  }>({
    survey_item_id: "",
    room_name: "",
    element_name: "",
    item_code: "",
    description: "",
    quantity: 1,
    unit: "nr",
    unit_rate: 0,
    notes: "",
  });

  // Local Edits Tracker for Work Items: { [itemId]: Partial<SurveyScopeItem> }
  const [editedLines, setEditedLines] = useState<Record<number, Partial<SurveyScopeItem>>>({});
  // Latest edits for the save handlers, which can run from a blur right after a change.
  const editedLinesRef = useRef(editedLines);
  editedLinesRef.current = editedLines;
  const savedTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // Warn before leaving the page with line edits that have not been saved yet.
  useEffect(() => {
    if (!Object.keys(editedLines).length) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editedLines]);

  // ----------------------------------------------------
  // Load Scope Data
  // ----------------------------------------------------
  const fetchScopeData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`surveys/${id}/scope`);
      if (res.data?.IsSuccess && res.data?.data) {
        const data: SurveyScopeData = res.data.data;
        setScopeData(data);

        // Initialize adjustment inputs
        setAdjustSign(data.survey.scope_adjust_sign ?? 1);
        setAdjustType(data.survey.scope_adjust_type ?? "percent");
        setAdjustValue(Number(data.survey.scope_adjust_value) || 0);
        setDurationDays(data.survey.estimated_duration_days ?? "");

        // Set initial selected evidence item if available
        if (data.evidence_items?.length > 0) {
          const firstDefect = data.evidence_items.find(
            (e) => e.condition === "damaged" || e.condition === "minor_defects" || e.repair_action
          );
          setSelectedEvidenceId(firstDefect ? firstDefect.id : data.evidence_items[0].id);
        }
      } else {
        toast.error(res.data?.message || "Failed to load QS Scope data");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error loading survey scope");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchScopeData();
    }
  }, [id, fetchScopeData]);

  // Derived lock state
  const isBaselineLocked = useMemo(() => {
    if (!scopeData?.survey?.status) return false;
    return ["completed", "frozen"].includes(scopeData.survey.status);
  }, [scopeData]);
  // QS actions need the Surveys permission; everyone else gets the read-only view.
  const isLocked = isBaselineLocked || !access.is_admin;

  // Unique Room names for filter
  const roomOptions = useMemo(() => {
    if (!scopeData?.scope_items) return [];
    const rooms = new Set<string>();
    scopeData.scope_items.forEach((item) => {
      if (item.room_name) rooms.add(item.room_name);
    });
    return Array.from(rooms);
  }, [scopeData]);

  // Filtered Work Items
  const filteredItems = useMemo(() => {
    if (!scopeData?.scope_items) return [];
    return scopeData.scope_items.filter((item) => {
      const matchRoom = selectedRoom === "All" || item.room_name === selectedRoom;
      const matchQuery =
        !searchQuery ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.item_code && item.item_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.element_name && item.element_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.room_name && item.room_name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchRoom && matchQuery;
    });
  }, [scopeData, selectedRoom, searchQuery]);

  // Currently selected evidence record
  const activeEvidence: SurveyEvidenceItem | null = useMemo(() => {
    if (!scopeData?.evidence_items || !selectedEvidenceId) return null;
    return scopeData.evidence_items.find((e) => e.id === selectedEvidenceId) || null;
  }, [scopeData, selectedEvidenceId]);

  // The work line whose evidence is open, and its number in the list.
  const manualLine = useMemo(
    () => (manualLineId ? scopeData?.scope_items.find((line) => line.id === manualLineId) || null : null),
    [scopeData, manualLineId],
  );

  const evidenceLineNo = useMemo(() => {
    if (!scopeData?.scope_items) return null;
    const index = manualLine
      ? scopeData.scope_items.findIndex((line) => line.id === manualLine.id)
      : selectedEvidenceId
        ? scopeData.scope_items.findIndex((line) => line.survey_item_id === selectedEvidenceId)
        : -1;
    return index >= 0 ? index + 1 : null;
  }, [scopeData, selectedEvidenceId, manualLine]);

  // Opens a line's evidence. Below the xl breakpoint the evidence panel sits under the lines,
  // so scroll to it; on wide screens it is already beside them.
  const scrollToEvidence = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1535.98px)").matches) {
      setTimeout(() => document.getElementById("qs-evidence")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }
  };
  const showEvidence = (surveyItemId: number, scroll = false) => {
    setManualLineId(null);
    setSelectedEvidenceId(surveyItemId);
    if (scroll) scrollToEvidence();
  };
  // Selects a line in the list: its survey evidence, or the "added manually" note for lines
  // that are not linked to a surveyed element.
  const selectLine = (line: SurveyScopeItem, scroll = false) => {
    if (line.survey_item_id) {
      showEvidence(line.survey_item_id, scroll);
      return;
    }
    setManualLineId(line.id);
    if (scroll) scrollToEvidence();
  };

  // Format currency helper
  const formatMoney = (val: number | string | null | undefined) => {
    const num = Number(val) || 0;
    return `£${num.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Live real-time calculations (includes unsaved local input changes)
  const liveTotals = useMemo(() => {
    if (!scopeData?.scope_items) {
      return {
        base_amount: 0,
        adjust_amount: 0,
        total_amount: 0,
        reviewed_count: 0,
        total_count: 0,
        pending_count: 0,
      };
    }

    let base = 0;
    let reviewed = 0;

    scopeData.scope_items.forEach((item) => {
      const local = editedLines[item.id];
      const qty = local?.quantity !== undefined ? Number(local.quantity) : Number(item.quantity);
      const rate = local?.unit_rate !== undefined ? Number(local.unit_rate) : Number(item.unit_rate);
      const isRev = local?.is_reviewed !== undefined ? Boolean(local.is_reviewed) : Boolean(item.is_reviewed);

      base += (qty || 0) * (rate || 0);
      if (isRev) reviewed++;
    });

    base = Math.round((base + Number.EPSILON) * 100) / 100;

    let adj = 0;
    if (adjustType === "percent") {
      adj = Math.round((base * (Number(adjustValue) / 100) * adjustSign + Number.EPSILON) * 100) / 100;
    } else {
      adj = Math.round((Number(adjustValue) * adjustSign + Number.EPSILON) * 100) / 100;
    }

    const total = Math.max(0, Math.round((base + adj + Number.EPSILON) * 100) / 100);

    return {
      base_amount: base,
      adjust_amount: adj,
      total_amount: total,
      reviewed_count: reviewed,
      total_count: scopeData.scope_items.length,
      pending_count: scopeData.scope_items.length - reviewed,
    };
  }, [scopeData, editedLines, adjustSign, adjustType, adjustValue]);

  // ----------------------------------------------------
  // Handlers for Work Items
  // ----------------------------------------------------
  const handleLineFieldChange = (itemId: number, field: keyof SurveyScopeItem, value: any) => {
    if (isLocked) return;
    setEditedLines((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  // Saves one work line's pending edits. Called when the user leaves a line's field, and for every
  // pending line from "Save Adjustments". Returns false when the save failed.
  const handleSaveLine = async (item: SurveyScopeItem): Promise<boolean> => {
    if (isLocked) return true;
    const pendingChanges = editedLinesRef.current[item.id];
    if (!pendingChanges || Object.keys(pendingChanges).length === 0) return true;

    const payload = {
      description: pendingChanges.description !== undefined ? pendingChanges.description : item.description,
      item_code: pendingChanges.item_code !== undefined ? pendingChanges.item_code : item.item_code,
      quantity: pendingChanges.quantity !== undefined ? Number(pendingChanges.quantity) || 0 : item.quantity,
      unit: pendingChanges.unit !== undefined ? pendingChanges.unit : item.unit,
      unit_rate: pendingChanges.unit_rate !== undefined ? Number(pendingChanges.unit_rate) || 0 : item.unit_rate,
      notes: pendingChanges.notes !== undefined ? pendingChanges.notes : item.notes,
      is_reviewed: pendingChanges.is_reviewed !== undefined ? pendingChanges.is_reviewed : item.is_reviewed,
    };

    clearTimeout(savedTimers.current[item.id]);
    setLineStatus((prev) => ({ ...prev, [item.id]: "saving" }));
    try {
      const res = await api.put(`surveys/${id}/scope-items/${item.id}`, payload);
      if (!res.data?.IsSuccess) throw new Error(res.data?.message || "Failed to update item");

      // Update the line in place instead of reloading the page, so other edits and the
      // selected evidence stay as they are.
      setScopeData((prev) =>
        prev
          ? {
              ...prev,
              scope_items: prev.scope_items.map((line) =>
                line.id === item.id
                  ? { ...line, ...payload, total_amount: (Number(payload.quantity) || 0) * (Number(payload.unit_rate) || 0) }
                  : line,
              ),
            }
          : prev,
      );
      // Drop only the edits that were sent; anything typed while saving stays pending.
      setEditedLines((prev) => {
        const current = prev[item.id];
        if (!current) return prev;
        const left: Partial<SurveyScopeItem> = {};
        (Object.keys(current) as (keyof SurveyScopeItem)[]).forEach((key) => {
          if (current[key] !== pendingChanges[key]) (left as any)[key] = current[key];
        });
        const next = { ...prev };
        if (Object.keys(left).length) next[item.id] = left;
        else delete next[item.id];
        return next;
      });
      markLineSaved(item.id);
      return true;
    } catch (err: any) {
      setLineStatus((prev) => ({ ...prev, [item.id]: "error" }));
      toast.error(err?.response?.data?.message || err?.message || "Failed to update item");
      return false;
    }
  };

  // Saves every line with pending edits (used before saving the adjustments).
  const saveAllPendingLines = async () => {
    const items = scopeData?.scope_items || [];
    const pendingIds = Object.keys(editedLinesRef.current).map(Number);
    let ok = true;
    for (const lineId of pendingIds) {
      const item = items.find((line) => line.id === lineId);
      if (item && !(await handleSaveLine(item))) ok = false;
    }
    return ok;
  };

  const markLineSaved = (lineId: number) => {
    clearTimeout(savedTimers.current[lineId]);
    setLineStatus((prev) => ({ ...prev, [lineId]: "saved" }));
    savedTimers.current[lineId] = setTimeout(() => {
      setLineStatus((prev) => {
        if (prev[lineId] !== "saved") return prev;
        const next = { ...prev };
        delete next[lineId];
        return next;
      });
    }, 2500);
  };

  // Marks a line reviewed (or back to pending). Unsaved edits on the line are saved first.
  const handleToggleReviewed = async (item: SurveyScopeItem) => {
    if (isLocked) return;
    if (editedLinesRef.current[item.id] && !(await handleSaveLine(item))) return;
    const newStatus = !item.is_reviewed;
    setLineStatus((prev) => ({ ...prev, [item.id]: "saving" }));
    try {
      const res = await api.put(`surveys/${id}/scope-items/${item.id}`, { is_reviewed: newStatus });
      if (!res.data?.IsSuccess) throw new Error(res.data?.message || "Failed to update review status");
      setScopeData((prev) =>
        prev
          ? {
              ...prev,
              scope_items: prev.scope_items.map((line) =>
                line.id === item.id ? { ...line, is_reviewed: newStatus } : line,
              ),
            }
          : prev,
      );
      markLineSaved(item.id);
    } catch (err: any) {
      setLineStatus((prev) => ({ ...prev, [item.id]: "error" }));
      toast.error(err?.response?.data?.message || err?.message || "Failed to update status");
    }
  };

  const handleDeleteLine = async (itemId: number) => {
    if (isLocked) return;
    if (!window.confirm("Are you sure you want to delete this commercial work item?")) return;

    try {
      const res = await api.delete(`surveys/${id}/scope-items/${itemId}`);
      if (res.data?.IsSuccess) {
        toast.success("Work line deleted");
        await fetchScopeData();
      } else {
        toast.error(res.data?.message || "Failed to delete line");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete line");
    }
  };

  // Whole Scope Adjustments Handler
  const handleSaveAdjustments = async () => {
    if (isLocked) return;
    try {
      setSavingAdjustments(true);
      if (!(await saveAllPendingLines())) return;
      const res = await api.put(`surveys/${id}/scope-adjustments`, {
        scope_adjust_sign: Number(adjustSign),
        scope_adjust_type: adjustType,
        scope_adjust_value: Number(adjustValue),
        estimated_duration_days: durationDays === "" ? undefined : Number(durationDays),
      });

      if (res.data?.IsSuccess) {
        toast.success("Scope adjustments saved");
        await fetchScopeData();
      } else {
        toast.error(res.data?.message || "Failed to save adjustments");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save adjustments");
    } finally {
      setSavingAdjustments(false);
    }
  };

  // Auto-Generate Work Items from Survey Defects
  const handleAutoGenerate = async () => {
    if (isLocked) return;
    try {
      setActionLoading(true);
      const res = await api.post(`surveys/${id}/auto-generate-scope`);
      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Commercial lines generated from defects");
        await fetchScopeData();
      } else {
        toast.error(res.data?.message || "Failed to auto-generate lines");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to auto-generate lines");
    } finally {
      setActionLoading(false);
    }
  };

  // Add Custom Work Item Dialog Handler
  const handleAddWorkItem = async () => {
    if (isLocked) return;
    if (newItemData.quantity === "" || Number(newItemData.quantity) <= 0) {
      toast.error("Enter a quantity greater than 0.");
      return;
    }
    if (!newItemData.description.trim()) {
      toast.error("Work item description is required");
      return;
    }

    try {
      setActionLoading(true);
      const payload: any = {
        description: newItemData.description.trim(),
        item_code: newItemData.item_code.trim() || undefined,
        quantity: Number(newItemData.quantity) || 1,
        unit: newItemData.unit || "nr",
        unit_rate: Number(newItemData.unit_rate) || 0,
        notes: newItemData.notes.trim() || undefined,
        room_name: newItemData.room_name.trim() || undefined,
        element_name: newItemData.element_name.trim() || undefined,
      };

      if (newItemData.survey_item_id) {
        payload.survey_item_id = Number(newItemData.survey_item_id);
      }

      const res = await api.post(`surveys/${id}/scope-items`, payload);
      if (res.data?.IsSuccess) {
        toast.success("Work line added to scope");
        setAddModalOpen(false);
        // Reset form
        setNewItemData({
          survey_item_id: "",
          room_name: "",
          element_name: "",
          item_code: "",
          description: "",
          quantity: 1,
          unit: "nr",
          unit_rate: 0,
          notes: "",
        });
        await fetchScopeData();
      } else {
        toast.error(res.data?.message || "Failed to add work item");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add work item");
    } finally {
      setActionLoading(false);
    }
  };

  // Request Surveyor Rework
  const handleRequestRework = async () => {
    if (isLocked) return;
    if (!reworkNotes.trim()) {
      toast.error("Please provide clear rework notes for the surveyor");
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post(`surveys/${id}/request-rework`, {
        rework_notes: reworkNotes.trim(),
      });

      if (res.data?.IsSuccess) {
        toast.success("Survey returned to surveyor for rework");
        setReworkModalOpen(false);
        setReworkNotes("");
        router.push(`/apps/surveys/view/${id}`);
      } else {
        toast.error(res.data?.message || "Failed to request rework");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to request rework");
    } finally {
      setActionLoading(false);
    }
  };

  // Lock Baseline & Sign Off Scope
  const handleLockBaseline = async () => {
    if (isLocked) return;

    if (liveTotals.pending_count > 0) {
      toast.error(`Cannot approve scope: ${liveTotals.pending_count} work items are still pending verification`);
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post(`surveys/${id}/lock-scope`, {
        approval_notes: lockNotes.trim() || undefined,
      });

      if (res.data?.IsSuccess) {
        toast.success("Commercial baseline approved and locked permanently");
        setLockModalOpen(false);
        await fetchScopeData();
      } else {
        toast.error(res.data?.message || "Failed to lock baseline");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to lock baseline");
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // Render
  // ----------------------------------------------------
  if (loading) {
    return (
      <Box p={8} textAlign="center">
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            Loading commercial costing workspace...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!scopeData?.survey) {
    return (
      <Alert severity="error" sx={{ mt: 3, borderRadius: "8px" }}>
        Survey not found or you do not have permission to access the commercial scope.
      </Alert>
    );
  }

  const { survey, totals } = scopeData;

  return (
    <Box>
      {/* ================================================================== */}
      {/* 1. TOP HEADER CARD                                                 */}
      {/* ================================================================== */}
      <BlankCard sx={{ mb: 2.5 }}>
        <Box p={{ xs: 2, md: 2.5 }}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", lg: "center" }}
            spacing={2}
          >
            {/* Title & Metadata */}
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
              <Tooltip title="Back to Survey Details">
                <IconButton
                  component={Link}
                  href={`/apps/surveys/view/${survey.id}`}
                  size="small"
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "8px",
                    flexShrink: 0,
                  }}
                >
                  <IconArrowLeft size={18} />
                </IconButton>
              </Tooltip>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <Typography variant="h4" fontWeight={700} noWrap>
                    {survey.title || "Commercial QS Assessment"}
                  </Typography>

                  <Chip
                    label={survey.status.replace("_", " ").toUpperCase()}
                    size="small"
                    color={statusColorMap[survey.status] || "default"}
                    sx={{ fontWeight: 600, height: 22, fontSize: "0.75rem" }}
                  />

                  {isBaselineLocked && (
                    <Chip
                      icon={<IconLock size={13} />}
                      label="Baseline Locked"
                      color="success"
                      size="small"
                      sx={{ fontWeight: 600, height: 22, fontSize: "0.75rem" }}
                    />
                  )}
                </Stack>

                {/* Metadata Row */}
                <Stack direction="row" flexWrap="nowrap" gap={1.5} alignItems="center" mt={0.5} sx={{ overflow: "hidden" }}>
                  {survey.reference && (
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ flexShrink: 0 }}>
                      Ref: {survey.reference}
                    </Typography>
                  )}

                  {survey.project?.name && (
                    <>
                      <Typography variant="caption" color="divider" sx={{ flexShrink: 0 }}>•</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary", flexShrink: 0 }}>
                        <IconBuilding size={14} />
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {survey.project.name}
                        </Typography>
                      </Box>
                    </>
                  )}

                  {survey.address?.name && (
                    <>
                      <Typography variant="caption" color="divider" sx={{ flexShrink: 0 }}>•</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary", minWidth: 0, maxWidth: { xs: 150, sm: 220, md: 300, xl: 450 } }}>
                        <IconMapPin size={14} style={{ flexShrink: 0 }} />
                        <Typography variant="body2" color="text.secondary" noWrap title={survey.address.name}>
                          {survey.address.name}
                        </Typography>
                      </Box>
                    </>
                  )}

                  {survey.surveyor && (
                    <>
                      <Typography variant="caption" color="divider" sx={{ flexShrink: 0 }}>•</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary", flexShrink: 0 }}>
                        <IconUser size={14} />
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {survey.surveyor.first_name} {survey.surveyor.last_name}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Stack>
              </Box>
            </Stack>

            {/* Header Action Buttons (Single clean row, no wrap on desktop) */}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                flexShrink: 0,
                flexWrap: { xs: "wrap", md: "nowrap" },
                rowGap: 1,
              }}
            >
              {!isLocked ? (
                <>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<IconRotateClockwise size={16} />}
                    onClick={() => setReworkModalOpen(true)}
                    disabled={actionLoading}
                    sx={{
                      borderRadius: "8px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      height: 34,
                    }}
                  >
                    Request Rework
                  </Button>

                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<IconSparkles size={16} />}
                    onClick={handleAutoGenerate}
                    disabled={actionLoading}
                    sx={{
                      borderRadius: "8px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      height: 34,
                    }}
                  >
                    Auto-generate
                  </Button>

                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<IconPlus size={16} />}
                    onClick={() => setAddModalOpen(true)}
                    disabled={actionLoading}
                    sx={{
                      borderRadius: "8px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      height: 34,
                    }}
                  >
                    Add Work Line
                  </Button>

                  <Tooltip
                    title={
                      liveTotals.pending_count > 0
                        ? `${liveTotals.pending_count} work line(s) still require review before approval`
                        : liveTotals.total_count === 0
                        ? "Add at least one commercial work line"
                        : "Approve commercial scope and freeze baseline"
                    }
                  >
                    <span>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<IconShieldCheck size={16} />}
                        onClick={() => setLockModalOpen(true)}
                        disabled={actionLoading || liveTotals.pending_count > 0 || liveTotals.total_count === 0}
                        sx={{
                          borderRadius: "8px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          height: 34,
                        }}
                      >
                        Lock Baseline & Approve
                      </Button>
                    </span>
                  </Tooltip>
                </>
              ) : isBaselineLocked ? (
                <Chip
                  icon={<IconLock size={15} />}
                  label={`Approved Baseline: ${formatMoney(survey.baseline_total)}`}
                  color="success"
                  sx={{ height: 34, px: 1, fontWeight: 700 }}
                />
              ) : (
                <Chip icon={<IconLock size={15} />} label="Read only" variant="outlined" sx={{ height: 34, px: 1, fontWeight: 700 }} />
              )}
            </Stack>
          </Stack>
        </Box>
      </BlankCard>

      {/* ================================================================== */}
      {/* 2. ALERTS                                                          */}
      {/* ================================================================== */}
      {isBaselineLocked && (
        <Alert severity="success" icon={<IconLock size={18} />} sx={{ mb: 2.5, borderRadius: "8px" }}>
          <strong>Commercial Baseline Locked:</strong> This survey has been reviewed, approved, and locked. The commercial quantities and schedule of rates are permanently recorded.
        </Alert>
      )}

      {access.loaded && !access.is_admin && !isBaselineLocked && (
        <Alert severity={access.failed ? "warning" : "info"} icon={<IconLock size={18} />} sx={{ mb: 2.5, borderRadius: "8px" }}>
          <strong>Read only:</strong>{" "}
          {access.failed
            ? "Couldn't verify your survey permissions. Refresh the page to try again."
            : "only users with the Surveys permission can edit the commercial scope or lock the baseline."}
        </Alert>
      )}

      {survey.qs_status === "rework_requested" && survey.rework_notes && (
        <Alert severity="warning" icon={<IconAlertTriangle size={18} />} sx={{ mb: 2.5, borderRadius: "8px" }}>
          <strong>Previous Rework Note:</strong> {survey.rework_notes}
        </Alert>
      )}

      {/* ================================================================== */}
      {/* 3. KPI / METRIC SUMMARY CARDS                                      */}
      {/* ================================================================== */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {/* Card 1: Review Progress */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <BlankCard>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    Items Reviewed
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ mt: 0.25 }}>
                    {liveTotals.reviewed_count} / {liveTotals.total_count}
                  </Typography>
                  <Typography variant="caption" color={liveTotals.pending_count > 0 ? "warning.main" : "text.secondary"}>
                    {liveTotals.pending_count > 0 ? `${liveTotals.pending_count} pending review` : "All items verified"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "8px",
                    bgcolor: "grey.100",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: liveTotals.pending_count > 0 ? "warning.main" : "success.main",
                  }}
                >
                  {liveTotals.pending_count > 0 ? <IconClock size={20} /> : <IconCheck size={20} />}
                </Box>
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid>

        {/* Card 2: Base Estimate */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <BlankCard>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    Base Estimate
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ mt: 0.25 }}>
                    {formatMoney(liveTotals.base_amount)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sum of line items
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "8px",
                    bgcolor: "grey.100",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.secondary",
                  }}
                >
                  <IconCalculator size={20} />
                </Box>
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid>

        {/* Card 3: Scope Adjustment */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <BlankCard>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    Scope Adjustment
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ mt: 0.25 }}>
                    {liveTotals.adjust_amount >= 0 ? `+${formatMoney(liveTotals.adjust_amount)}` : `-${formatMoney(Math.abs(liveTotals.adjust_amount))}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {adjustType === "percent" ? `${adjustSign > 0 ? "+" : "-"}${adjustValue || 0}% global markup` : "Fixed adjustment"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "8px",
                    bgcolor: "grey.100",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.secondary",
                  }}
                >
                  <IconSparkles size={20} />
                </Box>
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid>

        {/* Card 4: Proposed Scope Total */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <BlankCard>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    {isBaselineLocked ? "Approved Total" : "Proposed Total"}
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="primary.main" sx={{ mt: 0.25 }}>
                    {formatMoney(liveTotals.total_amount)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {durationDays ? `Est. ${durationDays} days` : "Duration not set"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "8px",
                    bgcolor: isBaselineLocked ? "success.light" : "grey.100",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isBaselineLocked ? "success.main" : "primary.main",
                  }}
                >
                  {isBaselineLocked ? <IconLock size={20} /> : <IconCalculator size={20} />}
                </Box>
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid>
      </Grid>

      {/* ================================================================== */}
      {/* 3b. QS FLOW GUIDE: what to do next, step by step                   */}
      {/* ================================================================== */}
      {!isLocked && (() => {
        const items = scopeData.scope_items;
        const priced = items.filter((line) => {
          const edits = editedLines[line.id];
          const qty = Number(edits?.quantity !== undefined ? edits.quantity : line.quantity) || 0;
          const rate = Number(edits?.unit_rate !== undefined ? edits.unit_rate : line.unit_rate) || 0;
          return qty > 0 && rate > 0;
        }).length;
        const lineValue = (line: SurveyScopeItem, field: "quantity" | "unit_rate") => {
          const edits = editedLines[line.id];
          return Number(edits?.[field] !== undefined ? edits[field] : line[field]) || 0;
        };
        const firstUnpriced = items.find((line) => !(lineValue(line, "quantity") > 0 && lineValue(line, "unit_rate") > 0));
        const firstUnreviewed = items.find((line) => !line.is_reviewed);
        // Shows a line card (clearing room/search filters that hide it) and optionally focuses its rate.
        const goToLine = (line: SurveyScopeItem | undefined, focusRate = false) => {
          if (!line) return;
          setSelectedRoom("All");
          setSearchQuery("");
          selectLine(line);
          setTimeout(() => {
            document.getElementById(`qs-line-${line.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            if (focusRate) {
              document.querySelector<HTMLInputElement>(`[data-qs-rate="${line.id}"]`)?.focus({ preventScroll: true });
            }
          }, 60);
        };
        const savedAdjustment =
          Number(survey.scope_adjust_value) > 0 ||
          (survey.estimated_duration_days !== null && survey.estimated_duration_days !== undefined);
        const canLock = liveTotals.total_count > 0 && liveTotals.pending_count === 0;
        const steps = [
          {
            title: "Create work lines",
            hint: items.length
              ? `${items.length} line(s) created`
              : "Use Auto-generate (from the surveyor's defects) or Add Work Line",
            cta: items.length ? "View lines" : "Go to lines",
            status: items.length ? `${items.length} line${items.length === 1 ? "" : "s"}` : "None yet",
            done: items.length > 0,
            action: () =>
              items.length
                ? goToLine(items[0])
                : document.getElementById("qs-lines")?.scrollIntoView({ behavior: "smooth", block: "start" }),
          },
          {
            title: "Price each line",
            hint: items.length
              ? `${priced} of ${items.length} priced. Enter Qty and Rate on each line; it saves on its own`
              : "Enter Qty and Rate on each line",
            cta: items.length && priced < items.length ? "Enter rates" : "View lines",
            status: `${priced}/${items.length} priced`,
            done: items.length > 0 && priced === items.length,
            action: () => goToLine(firstUnpriced || items[0], true),
          },
          {
            title: "Mark lines reviewed",
            hint: items.length
              ? `${liveTotals.reviewed_count} of ${items.length} reviewed. Check each line, then press "Mark reviewed"`
              : "Press \"Mark reviewed\" on each priced line",
            cta: liveTotals.pending_count > 0 ? "Review lines" : "View lines",
            status: `${liveTotals.reviewed_count}/${items.length} reviewed`,
            done: items.length > 0 && liveTotals.pending_count === 0,
            action: () => goToLine(firstUnreviewed || items[0]),
          },
          {
            title: "Adjustment (optional)",
            hint: savedAdjustment
              ? "Saved. You can change it any time before locking"
              : "Add margin, discount or duration, then press \"Save Adjustments\". Skip if not needed",
            cta: savedAdjustment ? "Change adjustment" : "Add adjustment",
            status: savedAdjustment ? "Saved" : "Optional",
            done: savedAdjustment,
            optional: true,
            action: () => {
              document.getElementById("qs-adjustment")?.scrollIntoView({ behavior: "smooth", block: "start" });
              setTimeout(() => document.querySelector<HTMLInputElement>("[data-qs-adjust]")?.focus({ preventScroll: true }), 400);
            },
          },
          {
            title: "Lock baseline & approve",
            hint: canLock
              ? "All lines reviewed. Lock to freeze the scope and total"
              : "Available after every line is reviewed",
            cta: canLock ? "Lock & approve" : "See what's left",
            status: canLock ? "Ready" : "After review",
            done: false,
            action: () => {
              if (canLock) setLockModalOpen(true);
              else {
                toast.error(
                  liveTotals.total_count === 0
                    ? "Add at least one work line first."
                    : `Mark the remaining ${liveTotals.pending_count} line(s) reviewed first.`,
                );
                goToLine(firstUnreviewed);
              }
            },
          },
        ];
        const current = steps.findIndex((step) => !step.done && !step.optional);
        return (
          <BlankCard sx={{ mb: 2.5 }}>
            <Box px={{ xs: 1.5, md: 2 }} py={1.5}>
              <Stack direction="row" alignItems="baseline" spacing={1} mb={1} px={0.5}>
                <Typography variant="subtitle2" fontWeight={700}>
                  QS review steps
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Click a step to go to it · hover for help
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="stretch">
                {steps.map((step, i) => {
                  const active = i === current;
                  return (
                    <Tooltip
                      key={step.title}
                      arrow
                      title={
                        <Box>
                          <div>{step.hint}</div>
                          <Box mt={0.5} fontWeight={700}>Click: {step.cta}</Box>
                        </Box>
                      }
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        role="button"
                        tabIndex={0}
                        aria-label={`${step.title}: ${step.cta}`}
                        onClick={step.action}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            step.action();
                          }
                        }}
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          px: 1.25,
                          py: 0.75,
                          borderRadius: "8px",
                          border: "1px solid",
                          borderColor: active ? "primary.main" : "divider",
                          bgcolor: active ? "primary.light" : "transparent",
                          cursor: "pointer",
                          transition: "border-color .15s, background-color .15s",
                          "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                          "&:hover .qs-step-go": { opacity: 1, transform: "translateX(2px)" },
                          "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
                        }}
                      >
                        <Box
                          sx={{
                            width: 22,
                            height: 22,
                            flexShrink: 0,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            bgcolor: step.done ? "success.main" : active ? "primary.main" : "grey.200",
                            color: step.done || active ? "#fff" : "text.secondary",
                          }}
                        >
                          {step.done ? <IconCheck size={13} /> : i + 1}
                        </Box>
                        <Box minWidth={0} flex={1}>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            noWrap
                            fontSize="0.8rem"
                            color={active ? "primary.main" : "text.primary"}
                          >
                            {step.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block" lineHeight={1.3}>
                            {step.status}
                          </Typography>
                        </Box>
                        <Box
                          className="qs-step-go"
                          sx={{
                            display: "flex",
                            color: "primary.main",
                            opacity: active ? 1 : 0.45,
                            transition: "opacity .15s, transform .15s",
                          }}
                        >
                          <IconArrowRight size={15} />
                        </Box>
                      </Stack>
                    </Tooltip>
                  );
                })}
              </Stack>
            </Box>
          </BlankCard>
        );
      })()}

      {/* ================================================================== */}
      {/* 4. MAIN DUAL-PANE WORKSPACE                                        */}
      {/* ================================================================== */}
      <Grid container spacing={2.5}>
        {/* LEFT PANE: Schedule of Rates Table */}
        <Grid size={{ xs: 12, xl: 8 }}>
          <BlankCard>
            <Box id="qs-lines" p={{ xs: 2, md: 2.5 }} sx={{ scrollMarginTop: 96 }}>
              {/* Header toolbar */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ sm: "center" }}
                spacing={1.5}
                mb={2}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Work Items & Schedule of Rates
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Enter a quantity and rate for each line, then mark it reviewed. Changes save automatically.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <CustomTextField
                    select
                    size="small"
                    value={selectedRoom}
                    onChange={(e: any) => setSelectedRoom(e.target.value)}
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="All">All Rooms ({scopeData.scope_items.length})</MenuItem>
                    {roomOptions.map((r) => (
                      <MenuItem key={r} value={r}>
                        {r}
                      </MenuItem>
                    ))}
                  </CustomTextField>

                  <CustomTextField
                    size="small"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e: any) => setSearchQuery(e.target.value)}
                    sx={{ width: 140 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconSearch size={14} color="#64748b" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>
              </Stack>

              {/* Work lines: one card per line, so nothing is hidden behind a sideways scroll. */}
              {filteredItems.length === 0 ? (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 5,
                    px: 2,
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: "8px",
                  }}
                >
                  <Typography variant="body2" fontWeight={600} mb={0.5}>
                    {scopeData.scope_items.length ? "No work lines match this filter" : "No work lines yet"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                    {scopeData.scope_items.length
                      ? "Change the room or search to see other lines."
                      : "Create lines from the surveyor's defects, or add a line yourself."}
                  </Typography>
                  {!isLocked && !scopeData.scope_items.length && (
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button variant="contained" size="small" startIcon={<IconSparkles size={15} />} onClick={handleAutoGenerate}>
                        Auto-generate lines from defects
                      </Button>
                      <Button variant="outlined" size="small" startIcon={<IconPlus size={15} />} onClick={() => setAddModalOpen(true)}>
                        Add work line
                      </Button>
                    </Stack>
                  )}
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {filteredItems.map((item, index) => {
                    const edits = editedLines[item.id];
                    const hasChanges = !!edits;
                    const lineQty = edits?.quantity !== undefined ? edits.quantity : item.quantity;
                    const lineRate = edits?.unit_rate !== undefined ? edits.unit_rate : item.unit_rate;
                    const lineAmount = (Number(lineQty) || 0) * (Number(lineRate) || 0);
                    const isPriced = (Number(lineQty) || 0) > 0 && (Number(lineRate) || 0) > 0;
                    const isSelectedEvidence = item.survey_item_id
                      ? !manualLine && selectedEvidenceId === item.survey_item_id
                      : manualLineId === item.id;
                    const status = lineStatus[item.id];

                    return (
                      <Paper
                        key={item.id}
                        id={`qs-line-${item.id}`}
                        variant="outlined"
                        onClick={() => selectLine(item)}
                        sx={{
                          p: { xs: 1.5, md: 2 },
                          borderRadius: "10px",
                          cursor: "pointer",
                          borderColor: isSelectedEvidence ? "primary.main" : "divider",
                          borderLeft: "4px solid",
                          borderLeftColor: item.is_reviewed ? "success.main" : isPriced ? "primary.main" : "warning.main",
                          boxShadow: isSelectedEvidence ? (theme) => `0 0 0 1px ${theme.palette.primary.main}` : "none",
                          transition: "box-shadow .15s, border-color .15s",
                          scrollMarginTop: 96,
                        }}
                      >
                        {/* Top row: what the line is, and its actions */}
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} mb={1.5}>
                          <Box minWidth={0}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.5}>
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                #{scopeData.scope_items.findIndex((line) => line.id === item.id) + 1}
                              </Typography>
                              <Typography variant="subtitle2" fontWeight={700} noWrap>
                                {item.room_name || "General"}
                                <Typography component="span" variant="subtitle2" color="text.secondary" fontWeight={500}>
                                  {" "}· {item.element_name || "Scope"}
                                </Typography>
                              </Typography>
                              {item.is_reviewed ? (
                                <Chip size="small" color="success" icon={<IconCheck size={13} />} label="Reviewed" sx={{ height: 22, fontWeight: 600 }} />
                              ) : !isPriced ? (
                                <Chip size="small" color="warning" variant="outlined" label="Needs price" sx={{ height: 22, fontWeight: 600 }} />
                              ) : (
                                <Chip size="small" variant="outlined" label="Pending review" sx={{ height: 22, fontWeight: 600 }} />
                              )}
                            </Stack>
                          </Box>

                          <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0} onClick={(e) => e.stopPropagation()}>
                            {!isLocked && (
                              <Box sx={{ minWidth: 72, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                                {status === "saving" ? (
                                  <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">
                                    <CircularProgress size={12} color="inherit" />
                                    <Typography variant="caption">Saving</Typography>
                                  </Stack>
                                ) : status === "error" ? (
                                  <Button size="small" color="error" startIcon={<IconAlertTriangle size={14} />} onClick={() => void handleSaveLine(item)} sx={{ minWidth: 0, px: 0.75 }}>
                                    Retry
                                  </Button>
                                ) : hasChanges ? (
                                  <Stack direction="row" spacing={0.5} alignItems="center" color="warning.main">
                                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "warning.main" }} />
                                    <Typography variant="caption" fontWeight={600}>Unsaved</Typography>
                                  </Stack>
                                ) : status === "saved" ? (
                                  <Stack direction="row" spacing={0.5} alignItems="center" color="success.main">
                                    <IconCircleCheck size={14} />
                                    <Typography variant="caption" fontWeight={600}>Saved</Typography>
                                  </Stack>
                                ) : null}
                              </Box>
                            )}
                            {item.survey_item_id ? (
                              // The highlighted line's evidence is already open, so only other
                              // linked lines get the button.
                              !isSelectedEvidence && (
                                <Tooltip title="Show this line's site photos and defect details in Original Survey Evidence">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<IconEye size={15} />}
                                    onClick={() => showEvidence(item.survey_item_id!, true)}
                                    sx={{ whiteSpace: "nowrap", borderRadius: "8px", fontWeight: 600 }}
                                  >
                                    View evidence
                                  </Button>
                                </Tooltip>
                              )
                            ) : (
                              !isSelectedEvidence && (
                                <Tooltip title="Added manually, not linked to a surveyed element. Click to see the line's details">
                                  <Button
                                    size="small"
                                    variant="text"
                                    color="inherit"
                                    onClick={() => selectLine(item, true)}
                                    sx={{
                                      whiteSpace: "nowrap",
                                      color: "text.secondary",
                                      fontWeight: 600,
                                      textDecoration: "underline dotted",
                                      textUnderlineOffset: 3,
                                    }}
                                  >
                                    No survey evidence
                                  </Button>
                                </Tooltip>
                              )
                            )}
                            {!isLocked && (
                              <Tooltip title="Delete line">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteLine(item.id)}
                                  sx={{ "&:hover": { color: "error.main" } }}
                                >
                                  <IconTrash size={17} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </Stack>

                        {/* Description */}
                        {isLocked ? (
                          <Typography variant="body2" mb={1.5}>
                            {item.description}
                          </Typography>
                        ) : (
                          <CustomTextField
                            size="small"
                            fullWidth
                            multiline
                            maxRows={4}
                            label="Work description"
                            value={edits?.description !== undefined ? edits.description : item.description}
                            onClick={(e: any) => e.stopPropagation()}
                            onChange={(e: any) => handleLineFieldChange(item.id, "description", e.target.value)}
                            onBlur={() => void handleSaveLine(item)}
                            sx={{ mb: 1.5 }}
                          />
                        )}

                        {/* Pricing: Code · Qty × Rate = Amount */}
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1.5}
                          alignItems={{ xs: "stretch", sm: "center" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isLocked ? (
                            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                              {item.item_code || "—"} · {item.quantity} {item.unit} × {formatMoney(item.unit_rate)}
                            </Typography>
                          ) : (
                            <>
                              <CustomTextField
                                size="small"
                                label="Code"
                                value={edits?.item_code !== undefined ? edits.item_code : item.item_code || ""}
                                onChange={(e: any) => handleLineFieldChange(item.id, "item_code", e.target.value)}
                                onBlur={() => void handleSaveLine(item)}
                                sx={{ width: { sm: 130 } }}
                              />
                              <CustomTextField
                                size="small"
                                type="number"
                                label="Qty"
                                inputProps={{ min: 0, step: "any" }}
                                value={lineQty}
                                onChange={(e: any) => handleLineFieldChange(item.id, "quantity", e.target.value)}
                                onBlur={() => void handleSaveLine(item)}
                                InputProps={{
                                  endAdornment: <InputAdornment position="end">{item.unit}</InputAdornment>,
                                }}
                                sx={{ width: { sm: 140 } }}
                              />
                              <Typography color="text.secondary" display={{ xs: "none", sm: "block" }}>×</Typography>
                              <CustomTextField
                                size="small"
                                type="number"
                                label="Rate"
                                inputProps={{ min: 0, step: "any", "data-qs-rate": item.id }}
                                value={lineRate}
                                onChange={(e: any) => handleLineFieldChange(item.id, "unit_rate", e.target.value)}
                                onBlur={() => void handleSaveLine(item)}
                                error={!isPriced}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                                }}
                                sx={{ width: { sm: 140 } }}
                              />
                            </>
                          )}
                          <Box sx={{ flex: 1 }} />
                          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                            <Box textAlign={{ xs: "left", sm: "right" }}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Amount
                              </Typography>
                              <Typography variant="h6" fontWeight={700}>
                                {formatMoney(lineAmount)}
                              </Typography>
                            </Box>
                            {!isLocked && (
                              <Tooltip
                                title={
                                  item.is_reviewed
                                    ? "Move this line back to pending review"
                                    : !isPriced
                                      ? "Enter a quantity and rate first"
                                      : "Confirm this line's description, quantity and rate"
                                }
                              >
                                <span>
                                  <Button
                                    size="small"
                                    variant={item.is_reviewed ? "outlined" : "contained"}
                                    color={item.is_reviewed ? "inherit" : "success"}
                                    startIcon={item.is_reviewed ? <IconRotateClockwise size={15} /> : <IconCheck size={15} />}
                                    disabled={status === "saving" || (!item.is_reviewed && !isPriced)}
                                    onClick={() => void handleToggleReviewed(item)}
                                    sx={{ whiteSpace: "nowrap", borderRadius: "8px", fontWeight: 600, minWidth: 136 }}
                                  >
                                    {item.is_reviewed ? "Undo review" : "Mark reviewed"}
                                  </Button>
                                </span>
                              </Tooltip>
                            )}
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}

              {/* ------------------------------------------------------------ */}
              {/* Whole-Scope Commercial Adjustment Panel                      */}
              {/* ------------------------------------------------------------ */}
              <Box id="qs-adjustment" sx={{ mt: 3, p: 2, borderRadius: "8px", bgcolor: "grey.50", border: "1px solid", borderColor: "divider", scrollMarginTop: 96 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Whole-Scope Commercial Adjustment
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Apply global contractor margin, overheads, or negotiated discount.
                    </Typography>
                  </Box>
                  <Chip label="Global Scope" size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
                </Stack>

                <Grid container spacing={1.5} alignItems="center">
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <CustomTextField
                      select
                      fullWidth
                      size="small"
                      label="Direction"
                      disabled={isLocked}
                      value={adjustSign}
                      onChange={(e: any) => setAdjustSign(Number(e.target.value))}
                    >
                      <MenuItem value={1}>Increase (+)</MenuItem>
                      <MenuItem value={-1}>Deduction (−)</MenuItem>
                    </CustomTextField>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <CustomTextField
                      select
                      fullWidth
                      size="small"
                      label="Adjustment Type"
                      disabled={isLocked}
                      value={adjustType}
                      onChange={(e: any) => setAdjustType(e.target.value)}
                    >
                      <MenuItem value="percent">Percentage (%)</MenuItem>
                      <MenuItem value="fixed">Fixed Amount (£)</MenuItem>
                    </CustomTextField>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <CustomTextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Adjustment Value"
                      disabled={isLocked}
                      inputProps={{ min: 0, step: "any", "data-qs-adjust": true }}
                      value={adjustValue}
                      onChange={(e: any) => setAdjustValue(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <CustomTextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Est. Duration (Days)"
                      disabled={isLocked}
                      inputProps={{ min: 0, step: 1 }}
                      value={durationDays}
                      onChange={(e: any) => setDurationDays(e.target.value)}
                    />
                  </Grid>

                  {!isLocked && (
                    <Grid size={{ xs: 12 }} sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<IconDeviceFloppy size={16} />}
                        onClick={handleSaveAdjustments}
                        disabled={savingAdjustments}
                        sx={{ fontWeight: 600 }}
                      >
                        {savingAdjustments ? "Saving..." : "Save Adjustments"}
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Box>
          </BlankCard>
        </Grid>

        {/* RIGHT PANE: Original Survey Evidence (Read-Only) */}
        <Grid size={{ xs: 12, xl: 4 }}>
          <BlankCard>
            <Box id="qs-evidence" p={{ xs: 2, md: 2.5 }} sx={{ scrollMarginTop: 96 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" fontWeight={700}>
                      Original Survey Evidence
                    </Typography>
                    {evidenceLineNo && (
                      <Chip size="small" color="primary" label={`Line #${evidenceLineNo}`} sx={{ height: 20, fontWeight: 700, fontSize: "0.7rem" }} />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    What the surveyor recorded on site. Press &quot;View evidence&quot; on a line to switch.
                  </Typography>
                </Box>
                <Chip label="Read Only" size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
              </Stack>

              {manualLine ? (
                <Stack spacing={2}>
                  <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: "8px", border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {manualLine.room_name || "General"} • {manualLine.element_name || "Scope"}
                    </Typography>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
                      <Chip label="ADDED BY QS" size="small" variant="outlined" sx={{ fontWeight: 600, height: 20, fontSize: "0.7rem" }} />
                    </Stack>
                  </Box>

                  <Alert severity="info" icon={<IconCamera size={18} />} sx={{ borderRadius: "8px" }}>
                    <strong>No site evidence for this line.</strong> It was added manually in QS review and is not
                    linked to an element the surveyor inspected, so there are no site photos, measurements or defect
                    notes.
                  </Alert>

                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                      Line details
                    </Typography>
                    <Box sx={{ mt: 0.75, p: 1.5, borderRadius: "8px", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="body2" mb={1}>
                        {manualLine.description || "No description"}
                      </Typography>
                      <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Code:</strong> {manualLine.item_code || "—"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Qty:</strong> {manualLine.quantity} {manualLine.unit}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Rate:</strong> {formatMoney(manualLine.unit_rate)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Amount:</strong> {formatMoney((Number(manualLine.quantity) || 0) * (Number(manualLine.unit_rate) || 0))}
                        </Typography>
                      </Stack>
                      {manualLine.notes && (
                        <Typography variant="body2" color="text.secondary" mt={1} fontStyle="italic">
                          &ldquo;{manualLine.notes}&rdquo;
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Stack>
              ) : activeEvidence ? (
                <Stack spacing={2}>
                  {/* Element & Condition Summary */}
                  <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: "8px", border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {activeEvidence.room_name} • {activeEvidence.element_name}
                    </Typography>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
                      <Chip
                        label={activeEvidence.condition ? activeEvidence.condition.replace("_", " ").toUpperCase() : "NOT RECORDED"}
                        color={
                          activeEvidence.condition === "good"
                            ? "success"
                            : activeEvidence.condition === "damaged"
                            ? "error"
                            : "warning"
                        }
                        size="small"
                        sx={{ fontWeight: 600, height: 20, fontSize: "0.7rem" }}
                      />
                      {activeEvidence.severity && (
                        <Chip
                          label={`Severity: ${activeEvidence.severity}`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: "0.7rem" }}
                        />
                      )}
                      {activeEvidence.added_on_site && <AddedOnSiteChip />}
                    </Stack>
                  </Box>

                  {/* Verified Site Measurements */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" display="block" mb={0.75}>
                      Site Measurements
                    </Typography>
                    <Box sx={{ p: 1.25, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "6px" }}>
                      <Typography variant="body2">
                        <strong>Calculated Qty:</strong>{" "}
                        {activeEvidence.calculated_qty !== null && activeEvidence.calculated_qty !== undefined
                          ? `${activeEvidence.calculated_qty} ${activeEvidence.output_unit || "units"}`
                          : "No quantity calculated"}
                      </Typography>
                      {activeEvidence.dimensions?.length > 0 && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                          {activeEvidence.dimensions.map((d, i) => (
                            <Chip
                              key={i}
                              label={`${d.name}: ${d.value} ${d.unit || ""}`}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.65rem" }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Box>

                  {/* Defect Details */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" display="block" mb={0.75}>
                      Defect & Remedial Work
                    </Typography>
                    <Box sx={{ p: 1.25, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "6px" }}>
                      <Typography variant="body2">
                        <strong>Damage Type:</strong> {activeEvidence.damage_type_name || "None recorded"}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.25 }}>
                        <strong>Material:</strong> {activeEvidence.material_name || "Unspecified"}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.25 }}>
                        <strong>Recommended Action:</strong>{" "}
                        {activeEvidence.repair_action ? activeEvidence.repair_action.replace(/_/g, " ") : "None specified"}
                      </Typography>
                      {activeEvidence.notes && (
                        <Typography variant="caption" sx={{ mt: 0.5, color: "text.secondary", display: "block" }}>
                          &ldquo;{activeEvidence.notes}&rdquo;
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Photo Evidence Gallery */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" display="block" mb={0.75}>
                      Site Evidence Photos ({activeEvidence.photos?.length || 0})
                    </Typography>

                    {activeEvidence.photos?.length > 0 ? (
                      <Grid container spacing={1}>
                        {activeEvidence.photos.map((photo) => (
                          <Grid size={{ xs: 6 }} key={photo.id}>
                            <Box
                              sx={{
                                position: "relative",
                                width: "100%",
                                paddingTop: "75%",
                                borderRadius: "6px",
                                overflow: "hidden",
                                border: "1px solid",
                                borderColor: "divider",
                                cursor: "pointer",
                                "&:hover": { opacity: 0.85 },
                              }}
                              onClick={() => setPreviewPhoto(photo)}
                            >
                              <Box
                                component="img"
                                src={surveyPhotoUrl(photo.file_path)}
                                alt={photo.caption || "Inspection photo"}
                                sx={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                              {photo.photo_type === "damage" && (
                                <Chip
                                  label="Damage"
                                  color="error"
                                  size="small"
                                  sx={{ position: "absolute", top: 6, left: 6, height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                                />
                              )}
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontStyle: "italic" }}>
                        No photos attached for this element.
                      </Typography>
                    )}
                  </Box>
                </Stack>
              ) : (
                <Box sx={{ py: 6, textAlign: "center" }}>
                  <IconCamera size={32} color="#94a3b8" />
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Press &quot;View evidence&quot; on a work line to see the surveyor&apos;s photos and defect details here.
                  </Typography>
                </Box>
              )}
            </Box>
          </BlankCard>
        </Grid>
      </Grid>

      {/* ================================================================== */}
      {/* 5. MODALS (Add Line, Request Rework, Lock Baseline, Photo Zoom)    */}
      {/* ================================================================== */}

      {/* Modal: Add Work Item */}
      <Dialog
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "10px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add Commercial Work Line</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <CustomTextField
              select
              fullWidth
              size="small"
              label="Link to Surveyed Element (Optional)"
              value={newItemData.survey_item_id}
              onChange={(e: any) => {
                const val = e.target.value;
                const item = scopeData.evidence_items.find((ei) => ei.id === Number(val));
                setNewItemData((prev) => ({
                  ...prev,
                  survey_item_id: val,
                  room_name: item ? item.room_name : prev.room_name,
                  element_name: item ? item.element_name : prev.element_name,
                  quantity: item?.calculated_qty ? Number(item.calculated_qty) : prev.quantity,
                  unit: item?.output_unit || prev.unit,
                }));
              }}
            >
              <MenuItem value="">None / Custom line</MenuItem>
              {scopeData.evidence_items.map((ei) => (
                <MenuItem key={ei.id} value={ei.id}>
                  {ei.room_name} • {ei.element_name} ({ei.condition || "uninspected"}){ei.added_on_site ? " · added on site" : ""}
                </MenuItem>
              ))}
            </CustomTextField>

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size="small"
                  label="Area / Room Name"
                  value={newItemData.room_name}
                  onChange={(e: any) => setNewItemData({ ...newItemData, room_name: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size="small"
                  label="Element Name"
                  value={newItemData.element_name}
                  onChange={(e: any) => setNewItemData({ ...newItemData, element_name: e.target.value })}
                />
              </Grid>
            </Grid>

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size="small"
                  label="Item Code (e.g. PL-01)"
                  value={newItemData.item_code}
                  onChange={(e: any) => setNewItemData({ ...newItemData, item_code: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size="small"
                  label="Unit (e.g. m2, m, nr, item)"
                  value={newItemData.unit}
                  onChange={(e: any) => setNewItemData({ ...newItemData, unit: e.target.value })}
                />
              </Grid>
            </Grid>

            <CustomTextField
              fullWidth
              size="small"
              label="Work Description *"
              multiline
              rows={2}
              value={newItemData.description}
              onChange={(e: any) => setNewItemData({ ...newItemData, description: e.target.value })}
              placeholder="e.g. Prepare wall plaster and apply 2 coats vinyl matt emulsion"
            />

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Commercial Quantity *"
                  inputProps={{ min: 0, step: "any" }}
                  value={newItemData.quantity}
                  onChange={(e: any) => setNewItemData({ ...newItemData, quantity: e.target.value === "" ? "" : Number(e.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Unit Rate (£) *"
                  inputProps={{ min: 0, step: "any" }}
                  value={newItemData.unit_rate}
                  onChange={(e: any) => setNewItemData({ ...newItemData, unit_rate: e.target.value === "" ? "" : Number(e.target.value) })}
                />
              </Grid>
            </Grid>

            <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: "6px" }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Line Total: {formatMoney((Number(newItemData.quantity) || 0) * (Number(newItemData.unit_rate) || 0))}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddWorkItem} disabled={actionLoading} sx={{ fontWeight: 600 }}>
            Add Line
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Request Rework */}
      <Dialog
        open={reworkModalOpen}
        onClose={() => setReworkModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "10px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Request Surveyor Rework</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Sending this survey back will transition its status to <strong>In Progress</strong> and reopen the field inspection workspace for surveyor <strong>{survey.surveyor?.first_name} {survey.surveyor?.last_name}</strong>.
          </Typography>

          <CustomTextField
            fullWidth
            required
            multiline
            rows={3}
            label="Rework Instructions & Missing Evidence *"
            placeholder="Detail why rework is needed (e.g. missing defect photos, dimension check)..."
            value={reworkNotes}
            onChange={(e: any) => setReworkNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReworkModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRequestRework}
            disabled={actionLoading || !reworkNotes.trim()}
            sx={{ fontWeight: 600 }}
          >
            Confirm Rework
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Lock Baseline */}
      <Dialog
        open={lockModalOpen}
        onClose={() => setLockModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "10px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Approve Scope & Lock Commercial Baseline</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Locking the baseline completes the commercial review and freezes the remediation costing figures.
          </Typography>

          <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: "8px", mb: 2, border: "1px solid", borderColor: "divider" }}>
            <Stack spacing={0.75}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Base Estimate ({totals.total_count} items):</Typography>
                <Typography variant="subtitle2" fontWeight={600}>{formatMoney(totals.base_amount)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Whole-Scope Adjustment:</Typography>
                <Typography variant="subtitle2" fontWeight={600}>{formatMoney(totals.adjust_amount)}</Typography>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1" fontWeight={700}>Proposed Baseline Total:</Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">{formatMoney(totals.total_amount)}</Typography>
              </Stack>
            </Stack>
          </Box>

          <CustomTextField
            fullWidth
            multiline
            rows={2}
            label="Approval Notes (Optional)"
            placeholder="e.g. Approved following joint client review and schedule of rates sign-off."
            value={lockNotes}
            onChange={(e: any) => setLockNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLockModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleLockBaseline}
            disabled={actionLoading}
            sx={{ fontWeight: 700 }}
          >
            Lock Baseline & Complete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Photo Preview Modal */}
      <Dialog
        open={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: "10px", overflow: "hidden" } }}
      >
        <DialogContent sx={{ p: 0, position: "relative", bgcolor: "black", textAlign: "center" }}>
          <IconButton
            onClick={() => setPreviewPhoto(null)}
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
          {previewPhoto && (
            <Box
              component="img"
              src={surveyPhotoUrl(previewPhoto.file_path)}
              alt={previewPhoto.caption || "Inspection Photo"}
              sx={{
                maxWidth: "100%",
                maxHeight: "75vh",
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
