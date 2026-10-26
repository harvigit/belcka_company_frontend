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
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
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
  in_progress: "warning",
  submitted: "primary",
  qs_review: "secondary",
  completed: "success",
  frozen: "default",
};

export default function SurveyQSWorkspace({ id }: SurveyQSWorkspaceProps) {
  const router = useRouter();

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
  const isLocked = useMemo(() => {
    if (!scopeData?.survey?.status) return false;
    return ["completed", "frozen"].includes(scopeData.survey.status);
  }, [scopeData]);

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
        item.element_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_code?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRoom && matchQuery;
    });
  }, [scopeData, selectedRoom, searchQuery]);

  // Active selected evidence item for right pane
  const activeEvidence = useMemo(() => {
    if (!scopeData?.evidence_items || !selectedEvidenceId) return null;
    return scopeData.evidence_items.find((e) => e.id === selectedEvidenceId) || null;
  }, [scopeData, selectedEvidenceId]);

  // Live real-time totals reflecting unsaved table edits and adjustment changes
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

    for (const item of scopeData.scope_items) {
      const qty = editedLines[item.id]?.quantity !== undefined ? Number(editedLines[item.id]!.quantity) || 0 : Number(item.quantity) || 0;
      const rate = editedLines[item.id]?.unit_rate !== undefined ? Number(editedLines[item.id]!.unit_rate) || 0 : Number(item.unit_rate) || 0;
      const isRev = editedLines[item.id]?.is_reviewed !== undefined ? Boolean(editedLines[item.id]!.is_reviewed) : Boolean(item.is_reviewed);

      base += Math.round((qty * rate + Number.EPSILON) * 100) / 100;
      if (isRev) reviewed++;
    }

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
        // Clear edited state for this line
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
        toast.success(newStatus ? "Line verified" : "Line marked pending review");
        await fetchScopeData();
      } else {
        toast.error(res.data?.message || "Failed to update review status");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update review status");
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

  // ----------------------------------------------------
  // Whole Scope Adjustments Handler
  // ----------------------------------------------------
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
        toast.success("Scope adjustments updated successfully");
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

  // ----------------------------------------------------
  // Auto-Generate Work Items from Survey Defects
  // ----------------------------------------------------
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

  // ----------------------------------------------------
  // Add Custom Work Item Dialog Handler
  // ----------------------------------------------------
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
        is_reviewed: false,
      };

      if (newItemData.survey_item_id) {
        payload.survey_item_id = Number(newItemData.survey_item_id);
      }

      const res = await api.post(`surveys/${id}/scope-items`, payload);
      if (res.data?.IsSuccess) {
        toast.success("Commercial work line added");
        setAddModalOpen(false);
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

  // ----------------------------------------------------
  // Quality Review: Request Rework Handler
  // ----------------------------------------------------
  const handleRequestRework = async () => {
    if (isLocked) return;
    if (!reworkNotes.trim()) {
      toast.error("Please explain what requires rework or correction");
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
        router.push(`/apps/surveys/details/${id}`);
      } else {
        toast.error(res.data?.message || "Failed to request rework");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to request rework");
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // Lock Baseline Handler
  // ----------------------------------------------------
  const handleLockBaseline = async () => {
    if (isLocked) return;
    try {
      setActionLoading(true);
      const res = await api.post(`surveys/${id}/lock-scope`, {
        notes: lockNotes.trim() || undefined,
      });

      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Commercial baseline locked successfully!");
        setLockModalOpen(false);
        setLockNotes("");
        await fetchScopeData();
      } else {
        toast.error(res.data?.message || "Failed to lock scope");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to lock scope");
    } finally {
      setActionLoading(false);
    }
  };

  // Format currency helper
  const formatMoney = (val: number | undefined | null) => {
    const num = Number(val) || 0;
    return `£${num.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!scopeData) {
    return (
      <Alert severity="error" sx={{ mt: 3 }}>
        Survey not found or you do not have permission to access the commercial scope.
      </Alert>
    );
  }

  const { survey, totals } = scopeData;

  return (
    <Box>
      {/* ------------------------------------------------------------------ */}
      {/* Top Header Bar */}
      {/* ------------------------------------------------------------------ */}
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconButton component={Link} href={`/apps/surveys/details/${survey.id}`} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
              <IconArrowLeft size={20} />
            </IconButton>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h4" fontWeight={700}>
                  {survey.title || "Commercial QS Assessment"}
                </Typography>
                <Chip
                  label={survey.status.replace("_", " ").toUpperCase()}
                  color={statusColorMap[survey.status] || "default"}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                {isLocked && (
                  <Chip
                    icon={<IconLock size={14} />}
                    label="Baseline Locked"
                    color="success"
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Stack>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                Ref: <strong>{survey.reference}</strong>
                {survey.project?.name && ` • Project: ${survey.project.name}`}
                {survey.address?.name && ` • Property: ${survey.address.name}`}
                {survey.surveyor && ` • Surveyor: ${survey.surveyor.first_name} ${survey.surveyor.last_name}`}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            {!isLocked && (
              <>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<IconRotateClockwise size={18} />}
                  onClick={() => setReworkModalOpen(true)}
                  disabled={actionLoading}
                >
                  Request Rework
                </Button>

                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<IconSparkles size={18} />}
                  onClick={handleAutoGenerate}
                  disabled={actionLoading}
                >
                  Auto-generate Lines
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<IconPlus size={18} />}
                  onClick={() => setAddModalOpen(true)}
                  disabled={actionLoading}
                >
                  Add Work Line
                </Button>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<IconShieldCheck size={18} />}
                  onClick={() => setLockModalOpen(true)}
                  disabled={actionLoading || liveTotals.pending_count > 0 || liveTotals.total_count === 0}
                >
                  Lock Baseline & Approve
                </Button>
              </>
            )}

            {isLocked && (
              <Chip
                icon={<IconLock size={16} />}
                label={`Approved Baseline: ${formatMoney(survey.baseline_total)}`}
                color="success"
                sx={{ fontSize: "14px", height: "38px", px: 1, fontWeight: 700 }}
              />
            )}
          </Stack>
        </Stack>
      </Box>

      {/* ------------------------------------------------------------------ */}
      {/* Locked / Rework Banners */}
      {/* ------------------------------------------------------------------ */}
      {isLocked && (
        <Alert severity="success" icon={<IconLock size={20} />} sx={{ mb: 3 }}>
          <strong>Commercial Baseline Locked:</strong> This survey has been reviewed, approved, and locked. The commercial quantities and schedule of rates are now immutable field records.
        </Alert>
      )}

      {survey.qs_status === "rework_requested" && survey.rework_notes && (
        <Alert severity="warning" icon={<IconAlertTriangle size={20} />} sx={{ mb: 3 }}>
          <strong>Previous Rework Note:</strong> {survey.rework_notes}
        </Alert>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* KPI / Metric Summary Cards (Live Real-time Totals) */}
      {/* ------------------------------------------------------------------ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <BlankCard>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                    Work Items Reviewed
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                    {liveTotals.reviewed_count} / {liveTotals.total_count}
                  </Typography>
                  <Typography variant="caption" color={liveTotals.pending_count > 0 ? "warning.main" : "success.main"} fontWeight={600}>
                    {liveTotals.pending_count > 0 ? `${liveTotals.pending_count} lines require review` : "All lines reviewed"}
                  </Typography>
                </Box>
                <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: liveTotals.pending_count > 0 ? "warning.light" : "success.light", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {liveTotals.pending_count > 0 ? <IconClock size={24} color="#d97706" /> : <IconCheck size={24} color="#059669" />}
                </Box>
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <BlankCard>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                    Base Estimate
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                    {formatMoney(liveTotals.base_amount)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Direct line item sum
                  </Typography>
                </Box>
                <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: "primary.light", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconCalculator size={24} color="#2563eb" />
                </Box>
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <BlankCard>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                    Scope Adjustment
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                    {liveTotals.adjust_amount >= 0 ? `+${formatMoney(liveTotals.adjust_amount)}` : `-${formatMoney(Math.abs(liveTotals.adjust_amount))}`}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {adjustType === "percent" ? `${adjustSign > 0 ? "+" : "-"}${adjustValue}% global markup` : "Fixed global adjustment"}
                  </Typography>
                </Box>
                <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: "info.light", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconSparkles size={24} color="#0284c7" />
                </Box>
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <BlankCard>
            <CardContent sx={{ p: 2.5, bgcolor: isLocked ? "success.light" : undefined }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                    {isLocked ? "Locked Baseline Total" : "Proposed Scope Total"}
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color={isLocked ? "success.dark" : "primary.main"} sx={{ mt: 0.5 }}>
                    {formatMoney(liveTotals.total_amount)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {durationDays ? `Est. duration: ${durationDays} working days` : "Duration not specified"}
                  </Typography>
                </Box>
                <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: isLocked ? "success.main" : "primary.light", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isLocked ? <IconLock size={24} color="#ffffff" /> : <IconCalculator size={24} color="#2563eb" />}
                </Box>
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid>
      </Grid>

      {/* ------------------------------------------------------------------ */}
      {/* Main Dual-Pane Workspace */}
      {/* ------------------------------------------------------------------ */}
      <Grid container spacing={3}>
        {/* LEFT / MAIN COLUMN: Commercial Work Items & Rate Matching */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <BlankCard>
            <CardContent sx={{ p: 3 }}>
              {/* Toolbar: Filters & Actions */}
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 2.5 }}>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    Work Items & Schedule of Rates
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Match surveyed defects to commercial rate lines. Survey evidence remains separate and immutable.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id="filter-room-label">Room Filter</InputLabel>
                    <Select
                      labelId="filter-room-label"
                      label="Room Filter"
                      value={selectedRoom}
                      onChange={(e: any) => setSelectedRoom(e.target.value)}
                    >
                      <MenuItem value="All">All Rooms ({scopeData.scope_items.length})</MenuItem>
                      {roomOptions.map((r) => (
                        <MenuItem key={r} value={r}>
                          {r}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <CustomTextField
                    size="small"
                    placeholder="Search work lines..."
                    value={searchQuery}
                    onChange={(e: any) => setSearchQuery(e.target.value)}
                    sx={{ width: 180 }}
                  />
                </Stack>
              </Stack>

              {/* Table of Scope Items */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: "action.hover" }}>
                    <TableRow>
                      <TableCell width={50} align="center">Review</TableCell>
                      <TableCell width={160}>Area / Element</TableCell>
                      <TableCell width={80}>Code</TableCell>
                      <TableCell>Work Description</TableCell>
                      <TableCell width={85} align="right">Qty</TableCell>
                      <TableCell width={60}>Unit</TableCell>
                      <TableCell width={100} align="right">Rate (£)</TableCell>
                      <TableCell width={110} align="right">Amount (£)</TableCell>
                      <TableCell width={90} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                          <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 1 }}>
                            No commercial work items found
                          </Typography>
                          {!isLocked && (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<IconSparkles size={16} />}
                              onClick={handleAutoGenerate}
                            >
                              Auto-generate lines from survey defects
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
                              bgcolor: isSelectedEvidence
                                ? "rgba(37, 99, 235, 0.08)"
                                : hasChanges
                                ? "action.hover"
                                : undefined,
                              borderLeft: isSelectedEvidence ? "4px solid #2563eb" : "4px solid transparent",
                              transition: "all 0.15s ease-in-out",
                            }}
                          >
                            {/* Review Checkbox / Toggle */}
                            <TableCell align="center">
                              <Tooltip title={item.is_reviewed ? "Reviewed & verified" : "Click to mark reviewed"}>
                                <span>
                                  <IconButton
                                    size="small"
                                    color={item.is_reviewed ? "success" : "default"}
                                    onClick={() => handleToggleReviewed(item)}
                                    disabled={isLocked}
                                  >
                                    {item.is_reviewed ? <IconCheck size={18} /> : <IconClock size={18} />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>

                            {/* Area / Element */}
                            <TableCell>
                              <Typography variant="subtitle2" fontWeight={600} noWrap>
                                {item.room_name || "Whole property"}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" noWrap display="block">
                                {item.element_name || "General scope"}
                              </Typography>
                            </TableCell>

                            {/* Code */}
                            <TableCell>
                              {isLocked ? (
                                <Chip label={item.item_code || "—"} size="small" variant="outlined" />
                              ) : (
                                <CustomTextField
                                  size="small"
                                  value={editedLines[item.id]?.item_code !== undefined ? editedLines[item.id]!.item_code : item.item_code || ""}
                                  onChange={(e: any) => handleLineFieldChange(item.id, "item_code", e.target.value)}
                                  placeholder="Code"
                                  sx={{ width: 75 }}
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
                                  value={editedLines[item.id]?.description !== undefined ? editedLines[item.id]!.description : item.description}
                                  onChange={(e: any) => handleLineFieldChange(item.id, "description", e.target.value)}
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
                                  sx={{ width: 75 }}
                                />
                              )}
                            </TableCell>

                            {/* Unit */}
                            <TableCell>
                              <Typography variant="caption" color="textSecondary" fontWeight={600}>
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
                                  sx={{ width: 85 }}
                                />
                              )}
                            </TableCell>

                            {/* Amount */}
                            <TableCell align="right">
                              <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                                {formatMoney(lineAmount)}
                              </Typography>
                            </TableCell>

                            {/* Actions */}
                            <TableCell align="center">
                              <Stack direction="row" spacing={0.5} justifyContent="center">
                                {item.survey_item_id && (
                                  <Tooltip title="View original site evidence">
                                    <IconButton
                                      size="small"
                                      color={selectedEvidenceId === item.survey_item_id ? "primary" : "default"}
                                      onClick={() => setSelectedEvidenceId(item.survey_item_id!)}
                                    >
                                      <IconEye size={17} />
                                    </IconButton>
                                  </Tooltip>
                                )}

                                {!isLocked && hasChanges && (
                                  <Tooltip title="Save changes">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleSaveLine(item)}
                                      disabled={savingItem === item.id}
                                    >
                                      {savingItem === item.id ? <CircularProgress size={16} /> : <IconDeviceFloppy size={17} />}
                                    </IconButton>
                                  </Tooltip>
                                )}

                                {!isLocked && (
                                  <Tooltip title="Delete work line">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteLine(item.id)}
                                    >
                                      <IconTrash size={17} />
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

              {/* ------------------------------------------------------------------ */}
              {/* Whole-Scope Commercial Adjustment Form */}
              {/* ------------------------------------------------------------------ */}
              <Box sx={{ mt: 4, pt: 3, borderTop: "1px dashed", borderColor: "divider" }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Whole-Scope Commercial Adjustment
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Applied globally to the entire base estimate (e.g., contractor margin, overheads, or negotiated client discount).
                    </Typography>
                  </Box>
                  <Chip label="Global Scope" size="small" color="info" variant="outlined" />
                </Stack>

                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <FormControl fullWidth size="small" disabled={isLocked}>
                      <InputLabel id="adjust-sign-label">Direction</InputLabel>
                      <Select
                        labelId="adjust-sign-label"
                        label="Direction"
                        value={adjustSign}
                        onChange={(e: any) => setAdjustSign(Number(e.target.value))}
                      >
                        <MenuItem value={1}>Increase (+)</MenuItem>
                        <MenuItem value={-1}>Deduction (−)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 3 }}>
                    <FormControl fullWidth size="small" disabled={isLocked}>
                      <InputLabel id="adjust-type-label">Adjustment Type</InputLabel>
                      <Select
                        labelId="adjust-type-label"
                        label="Adjustment Type"
                        value={adjustType}
                        onChange={(e: any) => setAdjustType(e.target.value)}
                      >
                        <MenuItem value="percent">Percentage (%)</MenuItem>
                        <MenuItem value="fixed">Fixed Amount (£)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 3 }}>
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

                  <Grid size={{ xs: 12, sm: 3 }}>
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
                    <Grid size={{ xs: 12 }} sx={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<IconDeviceFloppy size={18} />}
                        onClick={handleSaveAdjustments}
                        disabled={savingAdjustments}
                      >
                        {savingAdjustments ? "Saving..." : "Save Adjustments"}
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </CardContent>
          </BlankCard>
        </Grid>

        {/* RIGHT COLUMN: Original Survey Evidence (Read-only Site Facts) */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <BlankCard>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Original Survey Evidence
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Inspector site observations & verified measurements
                  </Typography>
                </Box>
                <Chip label="Read Only" size="small" color="primary" variant="outlined" />
              </Stack>

              {activeEvidence ? (
                <Box>
                  {/* Element & Room Title */}
                  <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1.5, mb: 2.5 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {activeEvidence.room_name} • {activeEvidence.element_name}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
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
                        sx={{ fontWeight: 600 }}
                      />
                      {activeEvidence.severity && (
                        <Chip
                          label={`Severity: ${activeEvidence.severity}`}
                          color="error"
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </Stack>
                  </Box>

                  {/* Verified Site Measurements */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="subtitle2" color="textSecondary" textTransform="uppercase" fontWeight={600} sx={{ mb: 1 }}>
                      Verified Site Measurements
                    </Typography>
                    <Box sx={{ p: 1.5, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                      <Typography variant="body2">
                        <strong>Calculated Qty:</strong>{" "}
                        {activeEvidence.calculated_qty !== null && activeEvidence.calculated_qty !== undefined
                          ? `${activeEvidence.calculated_qty} ${activeEvidence.output_unit || "units"}`
                          : "No quantity calculated"}
                      </Typography>
                      {activeEvidence.dimensions?.length > 0 && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                          {activeEvidence.dimensions.map((d, i) => (
                            <Chip
                              key={i}
                              label={`${d.name}: ${d.value} ${d.unit || ""}`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Box>

                  {/* Defect Details */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="subtitle2" color="textSecondary" textTransform="uppercase" fontWeight={600} sx={{ mb: 1 }}>
                      Defect & Repair Action
                    </Typography>
                    <Box sx={{ p: 1.5, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                      <Typography variant="body2">
                        <strong>Damage Type:</strong> {activeEvidence.damage_type_name || "None recorded"}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        <strong>Material:</strong> {activeEvidence.material_name || "Unspecified"}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        <strong>Recommended Action:</strong>{" "}
                        {activeEvidence.repair_action ? activeEvidence.repair_action.replace(/_/g, " ") : "None specified"}
                      </Typography>
                      {activeEvidence.notes && (
                        <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", fontStyle: "italic" }}>
                          &ldquo;{activeEvidence.notes}&rdquo;
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Photo Evidence Gallery */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                        Site Photos ({activeEvidence.photos?.length || 0})
                      </Typography>
                    </Stack>

                    {activeEvidence.photos?.length > 0 ? (
                      <Grid container spacing={1}>
                        {activeEvidence.photos.map((photo) => (
                          <Grid size={{ xs: 6 }} key={photo.id}>
                            <Box
                              sx={{
                                position: "relative",
                                width: "100%",
                                paddingTop: "75%",
                                borderRadius: 1,
                                overflow: "hidden",
                                border: "1px solid",
                                borderColor: "divider",
                                cursor: "pointer",
                                "&:hover": { opacity: 0.9 },
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
                            {photo.caption && (
                              <Typography variant="caption" color="textSecondary" noWrap display="block" sx={{ mt: 0.5 }}>
                                {photo.caption}
                              </Typography>
                            )}
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Alert severity="info" sx={{ py: 0.5 }}>
                        No photos captured for this element.
                      </Alert>
                    )}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ py: 6, textAlign: "center" }}>
                  <IconCamera size={36} color="#94a3b8" />
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Select a work item in the schedule to view its verified site facts and photo evidence.
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              <Alert severity="info" variant="outlined" sx={{ fontSize: "12px" }}>
                <strong>Quality Protection:</strong> Site evidence and surveyor findings are immutable records and cannot be overwritten from the commercial assessment workspace.
              </Alert>
            </CardContent>
          </BlankCard>
        </Grid>
      </Grid>

      {/* ------------------------------------------------------------------ */}
      {/* Modal: Add Work Item */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Commercial Work Line</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="link-element-label">Link to Surveyed Element (Optional)</InputLabel>
              <Select
                labelId="link-element-label"
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
                <MenuItem value="">None / Custom item</MenuItem>
                {scopeData.evidence_items.map((ei) => (
                  <MenuItem key={ei.id} value={ei.id}>
                    {ei.room_name} • {ei.element_name} ({ei.condition || "uninspected"})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
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

            <Grid container spacing={2}>
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

            <Grid container spacing={2}>
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

            <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Line Total: {formatMoney(newItemData.quantity * newItemData.unit_rate)}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddWorkItem} disabled={actionLoading}>
            Add Line
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Modal: Request Rework */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={reworkModalOpen} onClose={() => setReworkModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: "warning.main", display: "flex", alignItems: "center", gap: 1 }}>
          <IconAlertTriangle size={22} /> Request Surveyor Rework
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Sending this survey back will transition its status to <strong>In Progress</strong> and unlock the field inspection workspace for surveyor <strong>{survey.surveyor?.first_name} {survey.surveyor?.last_name}</strong>.
          </Typography>

          <CustomTextField
            fullWidth
            required
            multiline
            rows={4}
            label="Rework Instructions & Missing Evidence *"
            placeholder="Please detail why rework is needed (e.g. missing defect photos, incorrect dimensions, uninspected elements)..."
            value={reworkNotes}
            onChange={(e: any) => setReworkNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReworkModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRequestRework}
            disabled={actionLoading || !reworkNotes.trim()}
          >
            Confirm Rework Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Modal: Lock Baseline */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={lockModalOpen} onClose={() => setLockModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: "primary.main", display: "flex", alignItems: "center", gap: 1 }}>
          <IconShieldCheck size={22} /> Approve Scope & Lock Commercial Baseline
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Locking the baseline completes the commercial review and fixes the remediation cost figures. Further edits will require formal Variation Orders.
          </Typography>

          <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1.5, mb: 2 }}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Base Estimate ({totals.total_count} items):</Typography>
                <Typography variant="subtitle2" fontWeight={600}>{formatMoney(totals.base_amount)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Whole-Scope Adjustment:</Typography>
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
          >
            Lock Baseline & Complete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Lightbox Photo Preview Modal */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={!!previewPhoto} onClose={() => setPreviewPhoto(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {previewPhoto?.caption || "Inspection Evidence Photo"}
          </Typography>
          <IconButton size="small" onClick={() => setPreviewPhoto(null)}>
            <IconX size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center", p: 1 }}>
          {previewPhoto && (
            <Box
              component="img"
              src={previewPhoto.file_path.startsWith("http") ? previewPhoto.file_path : `http://localhost:3001/${previewPhoto.file_path.replace(/^\/+/, "")}`}
              alt={previewPhoto.caption || "Inspection Photo"}
              sx={{
                maxWidth: "100%",
                maxHeight: "75vh",
                objectFit: "contain",
                borderRadius: 1,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
