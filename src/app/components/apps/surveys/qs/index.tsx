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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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

export default function SurveyQSWorkspace({ id }: SurveyQSWorkspaceProps) {
  const router = useRouter();
  const access = useSurveyAccess();

  const [loading, setLoading] = useState<boolean>(true);
  const [savingItem, setSavingItem] = useState<number | null>(null);
  const [savingAdjustments, setSavingAdjustments] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Scope Data
  const [scopeData, setScopeData] = useState<SurveyScopeData | null>(null);

  // Selected Evidence Item for Right-hand Inspector Pane
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<number | null>(null);

  // Room & Search Filters
  const [selectedRoom, setSelectedRoom] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Whole Scope Adjustment State
  const [adjustSign, setAdjustSign] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<string>("percent");
  const [adjustValue, setAdjustValue] = useState<number>(0);
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
    quantity: number;
    unit: string;
    unit_rate: number;
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
  // QS actions are limited to company administrators; everyone else gets the read-only view.
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

  const handleSaveLine = async (item: SurveyScopeItem) => {
    if (isLocked) return;
    const pendingChanges = editedLines[item.id];
    if (!pendingChanges || Object.keys(pendingChanges).length === 0) return;

    try {
      setSavingItem(item.id);
      const payload = {
        description: pendingChanges.description !== undefined ? pendingChanges.description : item.description,
        item_code: pendingChanges.item_code !== undefined ? pendingChanges.item_code : item.item_code,
        quantity: pendingChanges.quantity !== undefined ? Number(pendingChanges.quantity) : item.quantity,
        unit: pendingChanges.unit !== undefined ? pendingChanges.unit : item.unit,
        unit_rate: pendingChanges.unit_rate !== undefined ? Number(pendingChanges.unit_rate) : item.unit_rate,
        notes: pendingChanges.notes !== undefined ? pendingChanges.notes : item.notes,
        is_reviewed: pendingChanges.is_reviewed !== undefined ? pendingChanges.is_reviewed : item.is_reviewed,
      };

      const res = await api.put(`surveys/${id}/scope-items/${item.id}`, payload);
      if (res.data?.IsSuccess) {
        toast.success("Work line updated");
        setEditedLines((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
        await fetchScopeData();
      } else {
        toast.error(res.data?.message || "Failed to update item");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update item");
    } finally {
      setSavingItem(null);
    }
  };

  const handleToggleReviewed = async (item: SurveyScopeItem) => {
    if (isLocked) return;
    try {
      const newStatus = !item.is_reviewed;
      const res = await api.put(`surveys/${id}/scope-items/${item.id}`, {
        is_reviewed: newStatus,
      });
      if (res.data?.IsSuccess) {
        toast.success(newStatus ? "Line marked reviewed" : "Line marked pending review");
        await fetchScopeData();
      } else {
        toast.error(res.data?.message || "Failed to update review status");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update status");
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
            : "only company administrators can edit the commercial scope or lock the baseline."}
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
                    {adjustType === "percent" ? `${adjustSign > 0 ? "+" : "-"}${adjustValue}% global markup` : "Fixed adjustment"}
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
      {/* 4. MAIN DUAL-PANE WORKSPACE                                        */}
      {/* ================================================================== */}
      <Grid container spacing={2.5}>
        {/* LEFT PANE: Schedule of Rates Table */}
        <Grid size={{ xs: 12, xl: 8 }}>
          <BlankCard>
            <Box p={{ xs: 2, md: 2.5 }}>
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
                    Match surveyed defects to commercial rate lines. Survey evidence remains separate.
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

              {/* Table of Scope Items */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "8px", borderColor: "divider" }}>
                <Table size="small" sx={{ minWidth: 900 }}>
                  <TableHead sx={{ bgcolor: "grey.50" }}>
                    <TableRow>
                      <TableCell width={50} align="center">
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          Review
                        </Typography>
                      </TableCell>
                      <TableCell width={150}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          Area / Element
                        </Typography>
                      </TableCell>
                      <TableCell width={80}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          Code
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          Work Description
                        </Typography>
                      </TableCell>
                      <TableCell width={75} align="right">
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          Qty
                        </Typography>
                      </TableCell>
                      <TableCell width={50} align="center">
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          Unit
                        </Typography>
                      </TableCell>
                      <TableCell width={85} align="right">
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          Rate (£)
                        </Typography>
                      </TableCell>
                      <TableCell width={95} align="right">
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          Amount (£)
                        </Typography>
                      </TableCell>
                      <TableCell width={80} align="center">
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          Actions
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                          <Typography variant="body2" color="text.secondary" mb={1}>
                            No commercial work items found
                          </Typography>
                          {!isLocked && (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<IconSparkles size={15} />}
                              onClick={handleAutoGenerate}
                            >
                              Auto-generate lines from defects
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((item) => {
                        const hasChanges = !!editedLines[item.id];
                        const lineQty = editedLines[item.id]?.quantity !== undefined ? editedLines[item.id]!.quantity : item.quantity;
                        const lineRate = editedLines[item.id]?.unit_rate !== undefined ? editedLines[item.id]!.unit_rate : item.unit_rate;
                        const lineAmount = (Number(lineQty) || 0) * (Number(lineRate) || 0);

                        const isSelectedEvidence = Boolean(item.survey_item_id && selectedEvidenceId === item.survey_item_id);

                        return (
                          <TableRow
                            key={item.id}
                            hover
                            onClick={() => {
                              if (item.survey_item_id) {
                                setSelectedEvidenceId(item.survey_item_id);
                              }
                            }}
                            sx={{
                              cursor: item.survey_item_id ? "pointer" : "default",
                              bgcolor: isSelectedEvidence ? "grey.50" : undefined,
                              borderLeft: isSelectedEvidence ? "3px solid #1e4db7" : "3px solid transparent",
                            }}
                          >
                            {/* Review Checkbox / Toggle */}
                            <TableCell align="center">
                              <Tooltip title={item.is_reviewed ? "Reviewed & verified" : "Click to mark reviewed"}>
                                <span>
                                  <IconButton
                                    size="small"
                                    color={item.is_reviewed ? "success" : "default"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleReviewed(item);
                                    }}
                                    disabled={isLocked}
                                  >
                                    {item.is_reviewed ? <IconCheck size={16} /> : <IconClock size={16} />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>

                            {/* Area / Element */}
                            <TableCell>
                              <Typography variant="subtitle2" fontWeight={600} noWrap>
                                {item.room_name || "General"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap display="block">
                                {item.element_name || "Scope"}
                              </Typography>
                            </TableCell>

                            {/* Code */}
                            <TableCell>
                              {isLocked ? (
                                <Typography variant="caption" fontWeight={600}>
                                  {item.item_code || "—"}
                                </Typography>
                              ) : (
                                <CustomTextField
                                  size="small"
                                  value={editedLines[item.id]?.item_code !== undefined ? editedLines[item.id]!.item_code : item.item_code || ""}
                                  onChange={(e: any) => handleLineFieldChange(item.id, "item_code", e.target.value)}
                                  placeholder="Code"
                                  sx={{ width: 96 }}
                                />
                              )}
                            </TableCell>

                            {/* Work Description */}
                            <TableCell>
                              {isLocked ? (
                                <Typography variant="body2">{item.description}</Typography>
                              ) : (
                                <CustomTextField
                                  size="small"
                                  fullWidth
                                  multiline
                                  maxRows={3}
                                  value={editedLines[item.id]?.description !== undefined ? editedLines[item.id]!.description : item.description}
                                  onChange={(e: any) => handleLineFieldChange(item.id, "description", e.target.value)}
                                  sx={{ minWidth: 220 }}
                                />
                              )}
                            </TableCell>

                            {/* Quantity */}
                            <TableCell align="right">
                              {isLocked ? (
                                <Typography variant="body2" fontWeight={600}>
                                  {item.quantity}
                                </Typography>
                              ) : (
                                <CustomTextField
                                  size="small"
                                  type="number"
                                  inputProps={{ min: 0, step: "any" }}
                                  value={lineQty}
                                  onChange={(e: any) => handleLineFieldChange(item.id, "quantity", e.target.value)}
                                  sx={{ width: 90 }}
                                />
                              )}
                            </TableCell>

                            {/* Unit */}
                            <TableCell align="center">
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                {item.unit}
                              </Typography>
                            </TableCell>

                            {/* Unit Rate */}
                            <TableCell align="right">
                              {isLocked ? (
                                <Typography variant="body2" fontWeight={600}>
                                  {formatMoney(item.unit_rate)}
                                </Typography>
                              ) : (
                                <CustomTextField
                                  size="small"
                                  type="number"
                                  inputProps={{ min: 0, step: "any" }}
                                  value={lineRate}
                                  onChange={(e: any) => handleLineFieldChange(item.id, "unit_rate", e.target.value)}
                                  sx={{ width: 80 }}
                                />
                              )}
                            </TableCell>

                            {/* Amount */}
                            <TableCell align="right">
                              <Typography variant="subtitle2" fontWeight={700}>
                                {formatMoney(lineAmount)}
                              </Typography>
                            </TableCell>

                            {/* Actions */}
                            <TableCell align="center">
                              <Stack direction="row" spacing={0.25} justifyContent="center" alignItems="center">
                                {item.survey_item_id && (
                                  <Tooltip title="View site evidence">
                                    <IconButton
                                      size="small"
                                      color={selectedEvidenceId === item.survey_item_id ? "primary" : "default"}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEvidenceId(item.survey_item_id!);
                                      }}
                                    >
                                      <IconEye size={16} />
                                    </IconButton>
                                  </Tooltip>
                                )}

                                {!isLocked && hasChanges && (
                                  <Tooltip title="Save changes">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSaveLine(item);
                                      }}
                                      disabled={savingItem === item.id}
                                    >
                                      {savingItem === item.id ? <CircularProgress size={14} /> : <IconDeviceFloppy size={16} />}
                                    </IconButton>
                                  </Tooltip>
                                )}

                                {!isLocked && (
                                  <Tooltip title="Delete line">
                                    <IconButton
                                      size="small"
                                      color="default"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteLine(item.id);
                                      }}
                                      sx={{ "&:hover": { color: "error.main" } }}
                                    >
                                      <IconTrash size={16} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* ------------------------------------------------------------ */}
              {/* Whole-Scope Commercial Adjustment Panel                      */}
              {/* ------------------------------------------------------------ */}
              <Box sx={{ mt: 3, p: 2, borderRadius: "8px", bgcolor: "grey.50", border: "1px solid", borderColor: "divider" }}>
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
                      inputProps={{ min: 0, step: "any" }}
                      value={adjustValue}
                      onChange={(e: any) => setAdjustValue(Number(e.target.value))}
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
            <Box p={{ xs: 2, md: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Original Survey Evidence
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Immutable surveyor site data
                  </Typography>
                </Box>
                <Chip label="Read Only" size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
              </Stack>

              {activeEvidence ? (
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
                                src={photo.file_path.startsWith("http") ? photo.file_path : `http://localhost:3001/${photo.file_path.replace(/^\/+/, "")}`}
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
                    Select a line in the schedule to view its verified site facts and photo evidence.
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
                  {ei.room_name} • {ei.element_name} ({ei.condition || "uninspected"})
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
                  onChange={(e: any) => setNewItemData({ ...newItemData, quantity: Number(e.target.value) })}
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
                  onChange={(e: any) => setNewItemData({ ...newItemData, unit_rate: Number(e.target.value) })}
                />
              </Grid>
            </Grid>

            <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: "6px" }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Line Total: {formatMoney(newItemData.quantity * newItemData.unit_rate)}
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
              src={previewPhoto.file_path.startsWith("http") ? previewPhoto.file_path : `http://localhost:3001/${previewPhoto.file_path.replace(/^\/+/, "")}`}
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
