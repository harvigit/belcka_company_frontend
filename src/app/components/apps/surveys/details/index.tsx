"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  CardContent,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Alert,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AlertTitle,
  LinearProgress,
  Checkbox,
} from "@mui/material";
import {
  IconArrowLeft,
  IconEdit,
  IconCamera,
  IconBuilding,
  IconMapPin,
  IconUser,
  IconCalendar,
  IconChevronDown,
  IconCheck,
  IconRuler,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconDoor,
  IconWindow,
  IconTool,
  IconLayersIntersect,
  IconInfoCircle,
  IconCalculator,
  IconLock,
  IconAlertTriangle,
  IconDownload,
  IconPrinter,
  IconEye,
  IconFileDescription,
  IconCoins,
  IconReceiptTax,
  IconClock,
  IconX,
  IconBriefcase,
  IconPlus,
  IconPlayerPlay,
  IconArchive,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import BlankCard from "@/app/components/shared/BlankCard";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import {
  Survey,
  SurveyItem,
  SurveyStatus,
  SurveyScopeItem,
  SurveyWorkOrder,
  SurveyWorkOrderItem,
  SurveyVariationOrder,
} from "../types";
import { exportSurveyReportToPdf, exportWorkOrderJobPackToPdf } from "./pdf/surveyPdfExport";
import SurveyPrintableReport from "./pdf/SurveyPrintableReport";
import WorkOrderJobPackReport from "./pdf/WorkOrderJobPackReport";

const statusColorMap: Record<
  SurveyStatus,
  "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"
> = {
  draft: "default",
  assigned: "info",
  in_progress: "warning",
  submitted: "primary",
  qs_review: "secondary",
  completed: "success",
  frozen: "success",
};

const statusLabelMap: Record<SurveyStatus, string> = {
  draft: "Draft",
  assigned: "Assigned",
  in_progress: "In Progress",
  submitted: "Submitted",
  qs_review: "QS Review",
  completed: "Completed",
  frozen: "Frozen",
};

const ALLOWED_SURVEY_TRANSITIONS: Record<SurveyStatus, SurveyStatus[]> = {
  draft: ["assigned", "in_progress", "submitted"],
  assigned: ["in_progress", "submitted", "draft"],
  in_progress: ["submitted", "assigned"],
  submitted: ["qs_review", "in_progress"],
  qs_review: ["completed", "in_progress"],
  completed: ["frozen"],
  frozen: [],
};

interface SurveyDetailsProps {
  id: string;
}

export default function SurveyDetails({ id }: SurveyDetailsProps) {
  const router = useRouter();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  // Status Menu Anchor
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Accordion expanded state
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});

  // Contractors list for Work Order Handoff
  const [contractors, setContractors] = useState<{ id: number; name: string; email?: string }[]>([]);

  // Work Order Handoff Dialog State
  const [woDialogOpen, setWoDialogOpen] = useState(false);
  const [submittingWo, setSubmittingWo] = useState(false);
  const [woForm, setWoForm] = useState({
    contractor_id: "",
    contractor_name: "",
    trade_name: "",
    start_date: "",
    target_completion_date: "",
    notes: "",
  });

  // Variation Order Dialog State
  const [voDialogOpen, setVoDialogOpen] = useState(false);
  const [submittingVo, setSubmittingVo] = useState(false);
  const [actioningVoId, setActioningVoId] = useState<number | null>(null);
  const [voForm, setVoForm] = useState({
    reason: "",
    amount: "",
    notes: "",
  });

  // PDF Export & Preview State
  const [exportingPdf, setExportingPdf] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const reportPrintRef = React.useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();

  // Tab synchronization with query parameter
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam === "commercial" || tabParam === "work-order" || tabParam === "1") {
      setTabValue(1);
    }
  }, [searchParams]);

  // Freeze / Archive Confirmation Dialog State
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [freezing, setFreezing] = useState(false);

  // Work Order Execution Status Management
  const [updatingWoStatus, setUpdatingWoStatus] = useState(false);
  const [cancelWoDialogOpen, setCancelWoDialogOpen] = useState(false);
  const [cancelWoReason, setCancelWoReason] = useState("");

  // Work Order Item Progress Toggle State
  const [togglingItemId, setTogglingItemId] = useState<number | null>(null);

  // Work Order Job Pack PDF Export & Preview State
  const [exportingWoPdf, setExportingWoPdf] = useState(false);
  const [woPreviewOpen, setWoPreviewOpen] = useState(false);
  const woReportPrintRef = React.useRef<HTMLDivElement>(null);

  const handleExportWoJobPackPdf = async () => {
    const wo = survey?.work_order || survey?.work_orders?.[0];
    if (!survey || !wo || !woReportPrintRef.current) return;
    try {
      setExportingWoPdf(true);
      toast.loading("Generating Contractor Work Order Job Pack PDF...", { id: "wo-pdf-export" });
      const filename = `${wo.reference || `WO-${survey.reference}`}-Job-Pack.pdf`;
      await exportWorkOrderJobPackToPdf(woReportPrintRef.current, filename);
      toast.success("Work Order Job Pack PDF downloaded successfully!", { id: "wo-pdf-export" });
    } catch (err: any) {
      console.error("Job Pack export failed:", err);
      toast.error(err?.message || "Failed to generate Job Pack PDF", { id: "wo-pdf-export" });
    } finally {
      setExportingWoPdf(false);
    }
  };

  const handleFreezeSurvey = async () => {
    if (!survey) return;
    try {
      setFreezing(true);
      const res = await api.post(`/surveys/${survey.id}/freeze`);
      if (res.data?.IsSuccess) {
        toast.success("Survey successfully frozen and archived permanently!");
        setFreezeDialogOpen(false);
        void fetchSurvey();
      } else {
        toast.error(res.data?.message || "Failed to freeze survey");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to freeze survey");
    } finally {
      setFreezing(false);
    }
  };

  const handleUpdateWoStatus = async (targetStatus: "in_progress" | "completed" | "cancelled", notes?: string) => {
    if (!survey) return;
    try {
      setUpdatingWoStatus(true);
      const res = await api.patch(`/surveys/${survey.id}/work-order/status`, {
        status: targetStatus,
        notes: notes || undefined,
      });

      if (res.data?.IsSuccess) {
        toast.success(res.data.message || `Work order status updated to ${targetStatus}!`);
        if (targetStatus === "cancelled") {
          setCancelWoDialogOpen(false);
          setCancelWoReason("");
        }
        void fetchSurvey();
      } else {
        toast.error(res.data?.message || "Failed to update work order status");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update work order status");
    } finally {
      setUpdatingWoStatus(false);
    }
  };

  const handleToggleWoItemProgress = async (itemId: number, currentCompleted: boolean) => {
    if (!survey) return;
    try {
      setTogglingItemId(itemId);
      const nextCompleted = !currentCompleted;
      const res = await api.patch(`/surveys/${survey.id}/work-order/items/${itemId}/progress`, {
        is_completed: nextCompleted,
      });

      if (res.data?.IsSuccess) {
        toast.success(res.data.message || `Item marked ${nextCompleted ? "completed" : "incomplete"}`);
        void fetchSurvey();
      } else {
        toast.error(res.data?.message || "Failed to update item progress");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update item progress");
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleExportPdf = async () => {
    if (!survey || !reportPrintRef.current) return;
    try {
      setExportingPdf(true);
      toast.loading("Generating professional survey PDF report...", { id: "pdf-export" });
      const filename = `${survey.reference || `SURVEY-${survey.id}`}-Inspection-Report.pdf`;
      await exportSurveyReportToPdf(reportPrintRef.current, filename);
      toast.success("PDF survey report downloaded successfully!", { id: "pdf-export" });
    } catch (err: any) {
      console.error("PDF export failed:", err);
      toast.error(err?.message || "Failed to generate PDF report", { id: "pdf-export" });
    } finally {
      setExportingPdf(false);
    }
  };

  const fetchSurvey = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`surveys/${id}`);
      if (res.data?.IsSuccess) {
        const loaded: Survey = res.data.info || res.data.data;
        setSurvey(loaded);

        // Default all rooms expanded
        const exp: Record<string, boolean> = {};
        (loaded.rooms || []).forEach((r) => {
          exp[String(r.id)] = true;
        });
        setExpandedRooms(exp);
      } else {
        setSurvey(null);
      }
    } catch (err) {
      console.error("Failed to load survey details", err);
      setSurvey(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchSurvey();
  }, [fetchSurvey]);

  // Load registered contractors / users
  useEffect(() => {
    const loadContractors = async () => {
      try {
        const res = await api.get("/user/list");
        if (res.data?.info) {
          setContractors(
            res.data.info.map((u: any) => ({
              id: u.id,
              name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || `User #${u.id}`,
              email: u.email,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load user list", err);
      }
    };
    void loadContractors();
  }, []);

  const handleOpenHandoff = () => {
    if (!survey) return;
    setWoForm({
      contractor_id: survey.surveyor_id ? String(survey.surveyor_id) : "",
      contractor_name: survey.surveyor_name || "",
      trade_name: "",
      start_date: new Date().toISOString().split("T")[0],
      target_completion_date: "",
      notes: `Handoff from survey ${survey.reference}. Baseline total: £${Number(survey.baseline_total || 0).toFixed(2)}.`,
    });
    setWoDialogOpen(true);
  };

  const handleCreateWorkOrder = async () => {
    if (!survey) return;
    try {
      setSubmittingWo(true);
      const res = await api.post(`/surveys/${survey.id}/work-order`, {
        contractor_id: woForm.contractor_id ? Number(woForm.contractor_id) : undefined,
        contractor_name: woForm.contractor_name.trim() || undefined,
        trade_name: woForm.trade_name.trim() || undefined,
        start_date: woForm.start_date || undefined,
        target_completion_date: woForm.target_completion_date || undefined,
        notes: woForm.notes.trim() || undefined,
      });

      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Work order successfully issued!");
        setWoDialogOpen(false);
        void fetchSurvey();
      } else {
        toast.error(res.data?.message || "Failed to issue work order");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to issue work order");
    } finally {
      setSubmittingWo(false);
    }
  };

  const handleCreateVariationOrder = async () => {
    if (!survey) return;
    if (!voForm.reason.trim()) {
      toast.error("Please provide a reason for the variation order");
      return;
    }
    const amt = parseFloat(voForm.amount);
    if (isNaN(amt)) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setSubmittingVo(true);
      const res = await api.post(`/surveys/${survey.id}/variation-orders`, {
        reason: voForm.reason.trim(),
        amount: amt,
        notes: voForm.notes.trim() || undefined,
      });

      if (res.data?.IsSuccess) {
        toast.success("Variation order requested successfully!");
        setVoDialogOpen(false);
        setVoForm({ reason: "", amount: "", notes: "" });
        void fetchSurvey();
      } else {
        toast.error(res.data?.message || "Failed to create variation order");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to create variation order");
    } finally {
      setSubmittingVo(false);
    }
  };

  const handleUpdateVoStatus = async (voId: number, nextStatus: "approved" | "rejected") => {
    if (!survey) return;
    try {
      setActioningVoId(voId);
      const res = await api.patch(`/surveys/${survey.id}/variation-orders/${voId}/status`, {
        status: nextStatus,
      });

      if (res.data?.IsSuccess) {
        toast.success(`Variation order #${voId} has been ${nextStatus}!`);
        void fetchSurvey();
      } else {
        toast.error(res.data?.message || "Failed to update variation order");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update variation order");
    } finally {
      setActioningVoId(null);
    }
  };

  const toggleRoomAccordion = (roomId: string | number) => {
    setExpandedRooms((prev) => ({
      ...prev,
      [String(roomId)]: !prev[String(roomId)],
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    (survey?.rooms || []).forEach((r) => {
      next[String(r.id)] = true;
    });
    setExpandedRooms(next);
  };

  const handleCollapseAll = () => {
    const next: Record<string, boolean> = {};
    (survey?.rooms || []).forEach((r) => {
      next[String(r.id)] = false;
    });
    setExpandedRooms(next);
  };

  const handleUpdateStatus = async (nextStatus: SurveyStatus) => {
    setStatusMenuAnchor(null);
    setUpdatingStatus(true);
    try {
      const res = await api.post("surveys/change-status", {
        id: Number(id),
        status: nextStatus,
      });
      if (res.data?.IsSuccess) {
        toast.success(`Survey status updated to ${statusLabelMap[nextStatus] || nextStatus}!`);
        setSurvey((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      } else {
        toast.error(res.data?.message || "Failed to update status");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Helper to format dimensions
  const formatDimensions = (item: SurveyItem) => {
    const dims: string[] = [];
    if (item.dimension_1_name && item.dimension_1_value !== undefined && item.dimension_1_value !== null) {
      dims.push(`${item.dimension_1_name}: ${item.dimension_1_value} ${item.dimension_1_unit || ""}`.trim());
    }
    if (item.dimension_2_name && item.dimension_2_value !== undefined && item.dimension_2_value !== null) {
      dims.push(`${item.dimension_2_name}: ${item.dimension_2_value} ${item.dimension_2_unit || ""}`.trim());
    }
    if (item.dimension_3_name && item.dimension_3_value !== undefined && item.dimension_3_value !== null) {
      dims.push(`${item.dimension_3_name}: ${item.dimension_3_value} ${item.dimension_3_unit || ""}`.trim());
    }
    if (item.dimension_4_name && item.dimension_4_value !== undefined && item.dimension_4_value !== null) {
      dims.push(`${item.dimension_4_name}: ${item.dimension_4_value} ${item.dimension_4_unit || ""}`.trim());
    }
    return dims;
  };

  // Helper for condition rating score
  const renderConditionScore = (
    score?: number | null,
    condition?: string | null,
    photoCount?: number,
  ) => {
    if (condition) {
      const map: Record<
        string,
        { label: string; color: "success" | "warning" | "error" | "default" }
      > = {
        good: { label: "Good", color: "success" },
        minor_defects: { label: "Minor Defects", color: "warning" },
        damaged: { label: "Damaged", color: "error" },
        not_accessible: { label: "Not Accessible", color: "default" },
      };
      const opt = map[condition] || { label: condition, color: "default" };
      return (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Chip
            size="small"
            color={opt.color}
            variant="filled"
            label={opt.label}
            sx={{ fontWeight: 700, fontSize: "0.75rem" }}
          />
          {photoCount && photoCount > 0 ? (
            <Chip
              size="small"
              icon={<IconCamera size={14} />}
              label={photoCount}
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: "0.7rem", height: 22 }}
            />
          ) : null}
        </Stack>
      );
    }

    if (score === undefined || score === null) {
      return (
        <Typography variant="caption" color="text.secondary" fontStyle="italic">
          Pending inspection
        </Typography>
      );
    }

    let color: "success" | "info" | "warning" | "error" = "success";
    let label = "Excellent";
    if (score === 4) {
      color = "info";
      label = "Good";
    } else if (score === 3) {
      color = "warning";
      label = "Fair";
    } else if (score === 2) {
      color = "warning";
      label = "Poor";
    } else if (score <= 1) {
      color = "error";
      label = "Very Poor";
    }

    return (
      <Chip
        size="small"
        color={color}
        variant="outlined"
        label={`${score}/5 • ${label}`}
        sx={{ fontWeight: 600, fontSize: "0.75rem" }}
      />
    );
  };

  if (loading) {
    return (
      <Box p={8} textAlign="center">
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">
            Loading survey details...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!survey) {
    return (
      <Box p={4} textAlign="center">
        <Alert severity="warning" sx={{ maxWidth: 500, mx: "auto", mb: 3 }}>
          Survey with ID #{id} was not found.
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

  const totalElements = (survey.rooms || []).reduce(
    (acc, r) => acc + (r.items ? r.items.length : 0),
    0,
  );

  const activeWorkOrder: SurveyWorkOrder | undefined =
    survey.work_order || (survey.work_orders && survey.work_orders.length > 0 ? survey.work_orders[0] : undefined);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Top Navigation Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton
            onClick={() => router.push("/apps/surveys/list")}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "8px",
            }}
            aria-label="Back to surveys"
          >
            <IconArrowLeft size={20} />
          </IconButton>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography variant="h4" fontWeight={700}>
                {survey.reference || `SRV-${survey.id}`}
              </Typography>
              <Chip
                label={statusLabelMap[survey.status] || survey.status}
                color={statusColorMap[survey.status] || "default"}
                size="small"
                sx={{ fontWeight: 600, textTransform: "capitalize" }}
              />
            </Stack>
            {survey.title && (
              <Typography variant="body2" color="text.secondary" mt={0.25}>
                {survey.title}
              </Typography>
            )}
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {/* Status Change Dropdown (Strictly aligned with ALLOWED_SURVEY_TRANSITIONS) */}
          {survey.status !== "frozen" && (ALLOWED_SURVEY_TRANSITIONS[survey.status] || []).length > 0 && (
            <>
              <Button
                variant="outlined"
                color="secondary"
                endIcon={<IconChevronDown size={16} />}
                onClick={(e) => setStatusMenuAnchor(e.currentTarget)}
                disabled={updatingStatus}
                sx={{ fontWeight: 600, borderRadius: "8px" }}
              >
                Change Status
              </Button>
              <Menu
                anchorEl={statusMenuAnchor}
                open={Boolean(statusMenuAnchor)}
                onClose={() => setStatusMenuAnchor(null)}
              >
                {(ALLOWED_SURVEY_TRANSITIONS[survey.status] || []).map((st) => (
                  <MenuItem
                    key={st}
                    onClick={() => {
                      setStatusMenuAnchor(null);
                      if (st === "frozen") {
                        setFreezeDialogOpen(true);
                      } else {
                        handleUpdateStatus(st);
                      }
                    }}
                  >
                    <Chip
                      size="small"
                      label={statusLabelMap[st]}
                      color={statusColorMap[st]}
                      sx={{ mr: 1.5, minWidth: 80, fontWeight: 600 }}
                    />
                    <Typography variant="body2">{statusLabelMap[st]}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}

          {/* Explicit Freeze & Archive Button for Completed surveys */}
          {survey.status === "completed" && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<IconLock size={18} />}
              onClick={() => setFreezeDialogOpen(true)}
              sx={{ fontWeight: 700, borderRadius: "8px" }}
            >
              Freeze & Archive
            </Button>
          )}

          {/* Frozen Indicator */}
          {survey.status === "frozen" && (
            <Chip
              icon={<IconLock size={16} />}
              label="Survey Frozen & Archived"
              color="default"
              variant="outlined"
              sx={{ fontWeight: 700, height: 36, px: 1, borderColor: "grey.400" }}
            />
          )}

          <Button
            variant="outlined"
            color="inherit"
            startIcon={<IconEye size={18} />}
            onClick={() => setPreviewOpen(true)}
            sx={{ fontWeight: 600, borderRadius: "8px" }}
          >
            Preview Report
          </Button>

          <Button
            variant="outlined"
            color="primary"
            startIcon={exportingPdf ? <CircularProgress size={16} /> : <IconDownload size={18} />}
            onClick={handleExportPdf}
            disabled={exportingPdf || !survey}
            sx={{ fontWeight: 600, borderRadius: "8px" }}
          >
            {exportingPdf ? "Exporting PDF..." : "Export Report (PDF)"}
          </Button>

          {["submitted", "qs_review", "completed", "frozen"].includes(survey.status) && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<IconCalculator size={18} />}
              component={Link}
              href={`/apps/surveys/qs/${survey.id}`}
              sx={{ fontWeight: 700, borderRadius: "8px" }}
            >
              QS Assessment & Costing
            </Button>
          )}

          {(survey.status === "assigned" || survey.status === "in_progress" || survey.status === "draft") && (
            <Button
              variant="contained"
              color="success"
              startIcon={<IconCamera size={18} />}
              component={Link}
              href={`/apps/surveys/inspect/${survey.id}`}
              sx={{ fontWeight: 700, borderRadius: "8px" }}
            >
              Conduct Inspection
            </Button>
          )}

          {/* Work Order Action Button */}
          {(survey.status === "completed" || survey.status === "frozen") && survey.baseline_locked_at && (
            (survey.work_order || survey.work_orders?.[0]) ? (
              <Button
                variant="outlined"
                color="primary"
                startIcon={<IconBriefcase size={18} />}
                onClick={() => setTabValue(1)}
                sx={{ fontWeight: 700, borderRadius: "8px" }}
              >
                WO: {(survey.work_order || survey.work_orders?.[0])?.reference}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                startIcon={<IconBriefcase size={18} />}
                onClick={handleOpenHandoff}
                sx={{ fontWeight: 700, borderRadius: "8px" }}
              >
                Issue Work Order
              </Button>
            )
          )}

          {!["completed", "frozen"].includes(survey.status) && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<IconEdit size={18} />}
              component={Link}
              href={`/apps/surveys/edit/${survey.id}`}
              sx={{ fontWeight: 600, borderRadius: "8px" }}
            >
              Edit Survey
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Rework Alert Banner */}
      {survey.qs_status === "rework_requested" && survey.rework_notes && (
        <Alert severity="warning" icon={<IconAlertTriangle size={20} />} sx={{ mb: 3 }}>
          <strong>Survey Rework Requested:</strong> {survey.rework_notes}
        </Alert>
      )}

      {/* Locked Baseline Alert Banner */}
      {survey.status === "completed" && survey.baseline_total !== null && survey.baseline_total !== undefined && (
        <Alert severity="success" icon={<IconLock size={20} />} sx={{ mb: 3 }}>
          <strong>Commercial Baseline Locked:</strong> Approved remediation cost: £{Number(survey.baseline_total).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
        </Alert>
      )}

      {/* Overview Cards (Equal height grid) */}
      <Grid container spacing={2.5} mb={3}>
        {/* Project */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <BlankCard sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                <Avatar sx={{ bgcolor: "primary.light", color: "primary.main", width: 40, height: 40, borderRadius: "10px" }}>
                  <IconBuilding size={20} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Project
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="subtitle1" fontWeight={700} noWrap title={survey.project_name || "—"}>
                {survey.project_name || "—"}
              </Typography>
            </CardContent>
          </BlankCard>
        </Grid>

        {/* Property Address */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <BlankCard sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                <Avatar sx={{ bgcolor: "info.light", color: "info.main", width: 40, height: 40, borderRadius: "10px" }}>
                  <IconMapPin size={20} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Property Address
                  </Typography>
                </Box>
              </Stack>
              <Tooltip title={survey.property_name || "—"} arrow placement="top">
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    lineHeight: 1.3,
                  }}
                >
                  {survey.property_name || "—"}
                </Typography>
              </Tooltip>
            </CardContent>
          </BlankCard>
        </Grid>

        {/* Assigned Surveyor */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <BlankCard sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                <Avatar sx={{ bgcolor: "warning.light", color: "warning.main", width: 40, height: 40, borderRadius: "10px" }}>
                  <IconUser size={20} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Assigned Surveyor
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="subtitle1" fontWeight={700} noWrap title={survey.surveyor_name || "Unassigned"}>
                {survey.surveyor_name || (
                  <Typography component="span" variant="subtitle1" color="text.secondary" fontStyle="italic">
                    Unassigned
                  </Typography>
                )}
              </Typography>
            </CardContent>
          </BlankCard>
        </Grid>

        {/* Inspection Date */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <BlankCard sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                <Avatar sx={{ bgcolor: "success.light", color: "success.main", width: 40, height: 40, borderRadius: "10px" }}>
                  <IconCalendar size={20} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Inspection Date
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="subtitle1" fontWeight={700}>
                {survey.survey_date ? new Date(survey.survey_date).toLocaleDateString() : "—"}
              </Typography>
            </CardContent>
          </BlankCard>
        </Grid>
      </Grid>

      {/* Main Content Area */}
      <BlankCard>
        {/* Card Tabs Bar */}
        <Box
          sx={{
            px: 3,
            pt: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, val) => setTabValue(val)}
            sx={{
              "& .MuiTab-root": {
                fontWeight: 600,
                fontSize: "0.925rem",
                py: 2,
              },
            }}
          >
            <Tab label={`Rooms & Inspection Elements (${survey.rooms?.length || 0})`} />
            <Tab
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Commercial Scope & Costing</span>
                  {(survey.scope_items?.length || 0) > 0 && (
                    <Chip
                      size="small"
                      label={survey.scope_items?.length}
                      color={survey.baseline_locked_at ? "success" : "secondary"}
                      sx={{ height: 20, fontSize: "0.72rem", fontWeight: 700 }}
                    />
                  )}
                </Stack>
              }
            />
            <Tab label="Survey Details & Metadata" />
          </Tabs>

          {tabValue === 0 && (survey.rooms || []).length > 0 && (
            <Stack direction="row" spacing={1} pb={{ xs: 1.5, sm: 0 }}>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<IconArrowsMaximize size={15} />}
                onClick={handleExpandAll}
                sx={{ fontSize: "0.75rem", textTransform: "none" }}
              >
                Expand All
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<IconArrowsMinimize size={15} />}
                onClick={handleCollapseAll}
                sx={{ fontSize: "0.75rem", textTransform: "none" }}
              >
                Collapse All
              </Button>
            </Stack>
          )}
        </Box>

        {/* Tab 0: Rooms & Elements Table Layout */}
        {tabValue === 0 && (
          <Box p={3}>
            {(!survey.rooms || survey.rooms.length === 0) ? (
              <Box p={6} textAlign="center">
                <Avatar sx={{ bgcolor: "grey.100", color: "grey.600", width: 56, height: 56, mx: "auto", mb: 2 }}>
                  <IconLayersIntersect size={28} />
                </Avatar>
                <Typography variant="h6" fontWeight={600} mb={1}>
                  No rooms or inspection areas defined
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  This survey currently has no inspection elements configured.
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<IconEdit size={16} />}
                  component={Link}
                  href={`/apps/surveys/edit/${survey.id}`}
                >
                  Configure Rooms in Edit Mode
                </Button>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {survey.rooms.map((room, rIdx) => {
                  const isExpanded = Boolean(expandedRooms[String(room.id)]);
                  return (
                    <Accordion
                      key={room.id}
                      expanded={isExpanded}
                      onChange={() => toggleRoomAccordion(room.id)}
                      disableGutters
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "10px !important",
                        overflow: "hidden",
                        "&:before": { display: "none" },
                        boxShadow: "none",
                      }}
                    >
                      {/* Room Accordion Header */}
                      <AccordionSummary
                        component="div"
                        expandIcon={<IconChevronDown size={20} />}
                        sx={{
                          bgcolor: isExpanded ? "grey.50" : "background.paper",
                          px: 2.5,
                          py: 1,
                          "&:hover": { bgcolor: "grey.100" },
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center" flex={1}>
                          <Chip
                            label={`#${rIdx + 1}`}
                            size="small"
                            color="primary"
                            variant="filled"
                            sx={{ fontWeight: 700, borderRadius: "6px", height: 24 }}
                          />
                          <Box flex={1}>
                            <Typography variant="subtitle1" fontWeight={700}>
                              {room.name}
                            </Typography>
                            {room.notes && (
                              <Typography variant="caption" color="text.secondary">
                                {room.notes}
                              </Typography>
                            )}
                          </Box>
                          <Chip
                            label={`${room.items?.length || 0} Elements`}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              borderColor: "divider",
                              bgcolor: "background.paper",
                            }}
                          />
                        </Stack>
                      </AccordionSummary>

                      {/* Room Table Details */}
                      <AccordionDetails sx={{ p: 0 }}>
                        <Divider />
                        {(!room.items || room.items.length === 0) ? (
                          <Box p={3} textAlign="center" bgcolor="background.paper">
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                              No elements assigned to this room.
                            </Typography>
                          </Box>
                        ) : (
                          <TableContainer>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: "grey.50" }}>
                                <TableRow>
                                  <TableCell sx={{ width: 50, py: 1.5, fontWeight: 700, fontSize: "0.75rem" }}>
                                    #
                                  </TableCell>
                                  <TableCell sx={{ width: "25%", py: 1.5, fontWeight: 700, fontSize: "0.75rem" }}>
                                    ELEMENT NAME
                                  </TableCell>
                                  <TableCell sx={{ width: 100, py: 1.5, fontWeight: 700, fontSize: "0.75rem" }}>
                                    UNIT
                                  </TableCell>
                                  <TableCell sx={{ py: 1.5, fontWeight: 700, fontSize: "0.75rem" }}>
                                    DIMENSIONS & MEASUREMENTS
                                  </TableCell>
                                  <TableCell sx={{ width: 160, py: 1.5, fontWeight: 700, fontSize: "0.75rem" }}>
                                    CONDITION
                                  </TableCell>
                                  <TableCell sx={{ width: 140, py: 1.5, fontWeight: 700, fontSize: "0.75rem" }}>
                                    ACTION / REPAIR
                                  </TableCell>
                                  <TableCell sx={{ width: "20%", py: 1.5, fontWeight: 700, fontSize: "0.75rem" }}>
                                    NOTES
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {room.items.map((item, iIdx) => {
                                  const dims = formatDimensions(item);
                                  return (
                                    <TableRow key={item.id || iIdx} hover>
                                      {/* Index */}
                                      <TableCell sx={{ py: 1.5, color: "text.secondary", fontWeight: 600 }}>
                                        {iIdx + 1}
                                      </TableCell>

                                      {/* Element Name with Icon */}
                                      <TableCell sx={{ py: 1.5 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                          {item.name?.toLowerCase().includes("door") ? (
                                            <IconDoor size={18} color="#475569" />
                                          ) : item.name?.toLowerCase().includes("window") ? (
                                            <IconWindow size={18} color="#475569" />
                                          ) : (
                                            <IconTool size={18} color="#475569" />
                                          )}
                                          <Typography variant="body2" fontWeight={700}>
                                            {item.name}
                                          </Typography>
                                        </Stack>
                                      </TableCell>

                                      {/* Unit */}
                                      <TableCell sx={{ py: 1.5 }}>
                                        {item.output_unit ? (
                                          <Chip
                                            label={item.output_unit}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                              fontWeight: 600,
                                              fontSize: "0.75rem",
                                              height: 22,
                                              bgcolor: "grey.50",
                                            }}
                                          />
                                        ) : (
                                          <Typography variant="caption" color="text.secondary">
                                            —
                                          </Typography>
                                        )}
                                      </TableCell>

                                      {/* Dimensions */}
                                      <TableCell sx={{ py: 1.5 }}>
                                        {dims.length > 0 ? (
                                          <Stack direction="row" spacing={1} flexWrap="wrap">
                                            {dims.map((dim, dIdx) => (
                                              <Chip
                                                key={dIdx}
                                                label={dim}
                                                size="small"
                                                variant="filled"
                                                sx={{
                                                  bgcolor: "primary.light",
                                                  color: "primary.main",
                                                  fontWeight: 600,
                                                  fontSize: "0.75rem",
                                                  height: 22,
                                                }}
                                              />
                                            ))}
                                          </Stack>
                                        ) : (
                                          <Typography variant="caption" color="text.secondary" fontStyle="italic">
                                            No dimensions recorded
                                          </Typography>
                                        )}
                                      </TableCell>

                                      {/* Condition */}
                                      <TableCell sx={{ py: 1.5 }}>
                                        {renderConditionScore(
                                          item.condition_score,
                                          item.condition,
                                          item.photos?.length,
                                        )}
                                      </TableCell>

                                      {/* Action / Repair */}
                                      <TableCell sx={{ py: 1.5 }}>
                                        {item.repair_action ? (
                                          <Typography variant="body2" fontWeight={600} color="text.primary">
                                            {item.repair_action}
                                          </Typography>
                                        ) : (
                                          <Typography variant="caption" color="text.secondary">
                                            —
                                          </Typography>
                                        )}
                                      </TableCell>

                                      {/* Notes */}
                                      <TableCell sx={{ py: 1.5 }}>
                                        {item.notes ? (
                                          <Typography variant="body2" color="text.secondary">
                                            {item.notes}
                                          </Typography>
                                        ) : (
                                          <Typography variant="caption" color="text.secondary">
                                            —
                                          </Typography>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}

        {/* Tab 1: Commercial Scope & Costing */}
        {tabValue === 1 && (() => {
          const scopeItems = survey.scope_items || [];
          const baseEstimate = scopeItems.reduce((acc, l) => acc + (Number(l.total_amount) || 0), 0);
          const adjustSign = survey.scope_adjust_sign === -1 ? -1 : 1;
          const adjustType = survey.scope_adjust_type || "percent";
          const adjustValue = Number(survey.scope_adjust_value) || 0;
          let adjustAmount = 0;
          if (adjustType === "percent") {
            adjustAmount = Math.round((baseEstimate * (adjustValue / 100) * adjustSign + Number.EPSILON) * 100) / 100;
          } else {
            adjustAmount = Math.round((adjustValue * adjustSign + Number.EPSILON) * 100) / 100;
          }
          const baselineTotal =
            survey.baseline_total !== null && survey.baseline_total !== undefined
              ? Number(survey.baseline_total)
              : Math.max(0, baseEstimate + adjustAmount);

          if (scopeItems.length === 0) {
            return (
              <Box p={6} textAlign="center">
                <Avatar
                  sx={{
                    bgcolor: "secondary.light",
                    color: "secondary.main",
                    width: 64,
                    height: 64,
                    mx: "auto",
                    mb: 2,
                    borderRadius: "16px",
                  }}
                >
                  <IconCalculator size={36} />
                </Avatar>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  No Commercial Scope Generated Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" maxWidth={540} mx="auto" mb={3}>
                  Commercial scope line items, remedial measurements, and Schedule of Rates are compiled
                  and priced by the Quantity Surveyor during the commercial assessment phase.
                </Typography>
                {["submitted", "qs_review", "completed", "frozen"].includes(survey.status) ? (
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<IconCalculator size={18} />}
                    component={Link}
                    href={`/apps/surveys/qs/${survey.id}`}
                    sx={{ fontWeight: 700, borderRadius: "8px" }}
                  >
                    Open QS Assessment & Costing Studio
                  </Button>
                ) : (
                  <Alert severity="info" sx={{ maxWidth: 520, mx: "auto", textAlign: "left" }}>
                    Commercial scope becomes available once the site inspection has been submitted for QS review.
                  </Alert>
                )}
              </Box>
            );
          }

          return (
            <Box p={3}>
              {/* Financial KPI Cards */}
              <Grid container spacing={2.5} mb={3}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <BlankCard sx={{ height: "100%", p: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                      <Avatar sx={{ bgcolor: "primary.light", color: "primary.main", width: 38, height: 38, borderRadius: "8px" }}>
                        <IconCoins size={20} />
                      </Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}>
                          Base Schedule Total
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={800}>
                          £{baseEstimate.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {scopeItems.length} remedial line item(s)
                    </Typography>
                  </BlankCard>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <BlankCard sx={{ height: "100%", p: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                      <Avatar sx={{ bgcolor: "warning.light", color: "warning.main", width: 38, height: 38, borderRadius: "8px" }}>
                        <IconReceiptTax size={20} />
                      </Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}>
                          Scope Adjustment
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={800} color={adjustSign === -1 ? "error.main" : "text.primary"}>
                          {adjustSign === -1 ? "-" : "+"}£{Math.abs(adjustAmount).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {adjustType === "percent" ? `${adjustValue}% ${adjustSign === -1 ? "Discount" : "Contingency"}` : "Fixed Commercial Adjustment"}
                    </Typography>
                  </BlankCard>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <BlankCard sx={{ height: "100%", p: 2, border: "2px solid", borderColor: survey.baseline_locked_at ? "success.main" : "primary.main" }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                      <Avatar sx={{ bgcolor: "success.light", color: "success.main", width: 38, height: 38, borderRadius: "8px" }}>
                        <IconLock size={20} />
                      </Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}>
                          Approved Baseline
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={800} color="success.main">
                          £{baselineTotal.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {survey.baseline_locked_at ? `Baseline locked ${new Date(survey.baseline_locked_at).toLocaleDateString()}` : "Pending final baseline lock"}
                    </Typography>
                  </BlankCard>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <BlankCard sx={{ height: "100%", p: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                      <Avatar sx={{ bgcolor: "info.light", color: "info.main", width: 38, height: 38, borderRadius: "8px" }}>
                        <IconClock size={20} />
                      </Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}>
                          Target Duration
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={800}>
                          {survey.estimated_duration_days ? `${survey.estimated_duration_days} Days` : "—"}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Estimated remedial period
                    </Typography>
                  </BlankCard>
                </Grid>
              </Grid>

              {/* Status Alert Banner */}
              {survey.baseline_locked_at ? (
                <Alert severity="success" icon={<IconLock size={20} />} sx={{ mb: 3 }}>
                  <AlertTitle sx={{ fontWeight: 700 }}>Commercial Baseline Approved & Locked</AlertTitle>
                  The commercial remediation baseline totaling <strong>£{baselineTotal.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> was approved on {new Date(survey.baseline_locked_at).toLocaleDateString()}. All scope items and contractor rates are frozen for project execution.
                </Alert>
              ) : (
                <Alert
                  severity="info"
                  icon={<IconInfoCircle size={20} />}
                  action={
                    ["submitted", "qs_review", "completed", "frozen"].includes(survey.status) && (
                      <Button
                        size="small"
                        variant="contained"
                        color="secondary"
                        component={Link}
                        href={`/apps/surveys/qs/${survey.id}`}
                        sx={{ fontWeight: 600, textTransform: "none" }}
                      >
                        Edit in QS Studio
                      </Button>
                    )
                  }
                  sx={{ mb: 3 }}
                >
                  <AlertTitle sx={{ fontWeight: 700 }}>Preliminary Commercial Assessment</AlertTitle>
                  These scope quantities and unit rates have been compiled by the QS team and remain subject to final verification and baseline lock.
                </Alert>
              )}

              {/* Scope & Schedule of Rates Table */}
              <Typography variant="h6" fontWeight={700} mb={1.5}>
                Approved Schedule of Rates & Works
              </Typography>

              <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px", mb: 3, overflowX: "auto" }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: "grey.100" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: 80 }}>Item #</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 180 }}>Room & Element</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Remedial Scope & Description</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, width: 90 }}>Qty</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: 80 }}>Unit</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, width: 120 }}>Unit Rate (£)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, width: 130 }}>Total Amount (£)</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: 110 }}>QS Review</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scopeItems.map((item, idx) => (
                      <TableRow key={item.id || idx} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>
                          {item.item_code || `#${idx + 1}`}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {item.room_name || "General"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.element_name || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.description}</Typography>
                          {item.notes && (
                            <Typography variant="caption" color="text.secondary" display="block" fontStyle="italic" mt={0.5}>
                              Note: {item.notes}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            {Number(item.quantity).toLocaleString("en-GB", { maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip size="small" variant="outlined" label={item.unit || "item"} sx={{ height: 22, fontSize: "0.75rem" }} />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            £{Number(item.unit_rate || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700}>
                            £{Number(item.total_amount || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {item.is_reviewed ? (
                            <Chip size="small" color="success" label="Reviewed" sx={{ fontWeight: 600, height: 22, fontSize: "0.75rem" }} />
                          ) : (
                            <Chip size="small" color="warning" variant="outlined" label="Pending" sx={{ fontWeight: 600, height: 22, fontSize: "0.75rem" }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Financial Reconciliation Cards & Details */}
              <Grid container spacing={3} alignItems="flex-start" mb={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <BlankCard sx={{ p: 2.5, height: "100%" }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                      Commercial Execution & Duration
                    </Typography>
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                          ESTIMATED PROJECT DURATION
                        </Typography>
                        <Typography variant="body2" fontWeight={600} mt={0.5}>
                          {survey.estimated_duration_days ? `${survey.estimated_duration_days} working days` : "Not scheduled"}
                        </Typography>
                      </Box>
                      {survey.rework_notes && (
                        <Box p={1.5} bgcolor="warning.light" borderRadius="6px">
                          <Typography variant="caption" color="warning.dark" fontWeight={700} display="block">
                            SURVEY REWORK / SCOPE INSTRUCTIONS
                          </Typography>
                          <Typography variant="body2" color="warning.dark" mt={0.5}>
                            {survey.rework_notes}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </BlankCard>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <BlankCard sx={{ p: 2.5, height: "100%" }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                      Financial Reconciliation
                    </Typography>
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Base Schedule Total ({scopeItems.length} items):
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          £{baseEstimate.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Commercial Adjustment ({adjustSign === -1 ? "-" : "+"}{adjustType === "percent" ? `${adjustValue}%` : `£${adjustValue}`}):
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color={adjustSign === -1 ? "error.main" : "text.primary"}>
                          {adjustSign === -1 ? "-" : "+"}£{Math.abs(adjustAmount).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Stack>
                      <Divider />
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                        <Typography variant="subtitle1" fontWeight={700}>
                          Approved Baseline Total:
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="primary.main">
                          £{baselineTotal.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Stack>
                    </Stack>
                  </BlankCard>
                </Grid>
              </Grid>

              {/* Contractor Work Order & Variations (Visible for completed / frozen surveys) */}
              {(survey.status === "completed" || survey.status === "frozen") && (() => {
                const wo = survey.work_order || (survey.work_orders && survey.work_orders[0]);
                const vos: SurveyVariationOrder[] = survey.variation_orders || (wo?.variation_orders) || [];
                const approvedVos = vos.filter((v) => v.status === "approved");
                const totalApprovedVoAmount = approvedVos.reduce((sum, v) => sum + Number(v.amount || 0), 0);
                const currentTotal = Number(wo?.total_amount ?? ((Number(wo?.baseline_total || survey.baseline_total || 0)) + totalApprovedVoAmount));

                return (
                  <Box mb={3}>
                    {wo ? (
                      <BlankCard sx={{ p: 3, border: "1.5px solid", borderColor: "primary.light" }}>
                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2} mb={2.5}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ bgcolor: "primary.main", color: "white", width: 44, height: 44, borderRadius: "10px" }}>
                              <IconBriefcase size={24} />
                            </Avatar>
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="h6" fontWeight={800}>
                                  Contractor Work Order: {wo.reference}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={wo.status.toUpperCase()}
                                  color={
                                    wo.status === "in_progress"
                                      ? "warning"
                                      : wo.status === "completed"
                                      ? "success"
                                      : wo.status === "cancelled"
                                      ? "error"
                                      : "primary"
                                  }
                                  sx={{ fontWeight: 700, fontSize: "0.72rem", height: 22 }}
                                />
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                Issued {wo.issued_at ? new Date(wo.issued_at).toLocaleDateString() : "—"} • Baseline Total Snapshot: £{Number(wo.baseline_total || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Typography>
                            </Box>
                          </Stack>

                          {/* Work Order Execution and Export Actions */}
                          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              startIcon={<IconEye size={16} />}
                              onClick={() => setWoPreviewOpen(true)}
                              sx={{ fontWeight: 600, borderRadius: "8px", textTransform: "none" }}
                            >
                              Preview Job Pack
                            </Button>
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              startIcon={<IconDownload size={16} />}
                              onClick={handleExportWoJobPackPdf}
                              disabled={exportingWoPdf}
                              sx={{ fontWeight: 600, borderRadius: "8px", textTransform: "none" }}
                            >
                              {exportingWoPdf ? "Exporting..." : "Download Job Pack (PDF)"}
                            </Button>

                            {/* Status Transition Actions */}
                            {wo.status === "issued" && (
                              <Button
                                variant="contained"
                                color="warning"
                                size="small"
                                startIcon={<IconPlayerPlay size={16} />}
                                onClick={() => handleUpdateWoStatus("in_progress")}
                                disabled={updatingWoStatus}
                                sx={{ fontWeight: 700, borderRadius: "8px", textTransform: "none" }}
                              >
                                Start Works
                              </Button>
                            )}

                            {wo.status === "in_progress" && (
                              <Tooltip
                                title={
                                  (wo.progress?.completed ?? 0) < (wo.progress?.total ?? 0)
                                    ? `All ${wo.progress?.total} items must be marked complete before completing the work order (${(wo.progress?.completed ?? 0)}/${wo.progress?.total ?? 0} done)`
                                    : "Mark all works completed and finish work order"
                                }
                              >
                                <span>
                                  <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    startIcon={<IconCheck size={16} />}
                                    onClick={() => handleUpdateWoStatus("completed")}
                                    disabled={updatingWoStatus || ((wo.progress?.completed ?? 0) < (wo.progress?.total ?? 0))}
                                    sx={{ fontWeight: 700, borderRadius: "8px", textTransform: "none" }}
                                  >
                                    Complete Work Order
                                  </Button>
                                </span>
                              </Tooltip>
                            )}

                            {(wo.status === "issued" || wo.status === "in_progress") && (
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<IconX size={16} />}
                                onClick={() => setCancelWoDialogOpen(true)}
                                disabled={updatingWoStatus}
                                sx={{ fontWeight: 600, borderRadius: "8px", textTransform: "none" }}
                              >
                                Cancel
                              </Button>
                            )}

                            {(wo.status === "issued" || wo.status === "in_progress") && (
                              <Button
                                variant="outlined"
                                color="secondary"
                                size="small"
                                startIcon={<IconPlus size={16} />}
                                onClick={() => setVoDialogOpen(true)}
                                sx={{ fontWeight: 700, borderRadius: "8px", textTransform: "none" }}
                              >
                                Request Variation
                              </Button>
                            )}
                          </Stack>
                        </Stack>

                        <Grid container spacing={2.5} mb={3}>
                          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box p={2} bgcolor="grey.50" borderRadius="8px" border="1px solid" borderColor="grey.200">
                              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ textTransform: "uppercase" }}>
                                Assigned Contractor
                              </Typography>
                              <Typography variant="subtitle2" fontWeight={700} mt={0.5}>
                                {wo.contractor_name || "Direct Subcontractor"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Trade: {wo.trade_name || "General Works"}
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box p={2} bgcolor="grey.50" borderRadius="8px" border="1px solid" borderColor="grey.200">
                              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ textTransform: "uppercase" }}>
                                Schedule & Period
                              </Typography>
                              <Typography variant="subtitle2" fontWeight={700} mt={0.5}>
                                {wo.start_date ? new Date(wo.start_date).toLocaleDateString() : "TBD"} – {wo.target_completion_date ? new Date(wo.target_completion_date).toLocaleDateString() : "TBD"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {wo.duration_days ? `${wo.duration_days} Days Scheduled` : "Estimated duration"}
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box p={2} bgcolor="grey.50" borderRadius="8px" border="1px solid" borderColor="grey.200">
                              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ textTransform: "uppercase" }}>
                                Locked Baseline
                              </Typography>
                              <Typography variant="subtitle2" fontWeight={800} color="success.main" mt={0.5}>
                                £{Number(wo.baseline_total || survey.baseline_total || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Immutable contract baseline
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box p={2} bgcolor="primary.light" borderRadius="8px" border="1px solid" borderColor="primary.main">
                              <Typography variant="caption" color="primary.dark" fontWeight={700} display="block" sx={{ textTransform: "uppercase" }}>
                                Current Contract Value
                              </Typography>
                              <Typography variant="subtitle2" fontWeight={800} color="primary.dark" mt={0.5}>
                                £{currentTotal.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Typography>
                              <Typography variant="caption" color="primary.dark">
                                Baseline + £{totalApprovedVoAmount.toFixed(2)} variations
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        {wo.notes && (
                          <Box p={1.5} bgcolor="grey.50" borderRadius="6px" mb={2.5}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                              WORK ORDER INSTRUCTIONS & NOTES
                            </Typography>
                            <Typography variant="body2" mt={0.5}>
                              {wo.notes}
                            </Typography>
                          </Box>
                        )}

                        {/* Work Order Execution Progress */}
                        {wo.progress && (
                          <Box p={2.5} bgcolor="grey.50" borderRadius="8px" border="1px solid" borderColor="grey.200" mb={3}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="subtitle2" fontWeight={700}>
                                  Work Order Execution Progress
                                </Typography>
                                <Chip
                                  size="small"
                                  label={
                                    wo.status === "completed"
                                      ? "100% COMPLETE"
                                      : wo.status === "cancelled"
                                      ? "CANCELLED"
                                      : `${wo.progress.completed} of ${wo.progress.total} items completed (${wo.progress.percentage}%)`
                                  }
                                  color={wo.status === "completed" ? "success" : wo.status === "cancelled" ? "error" : "primary"}
                                  sx={{ fontWeight: 700, fontSize: "0.72rem" }}
                                />
                              </Stack>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                {wo.status === "completed"
                                  ? "All scheduled scope verified and completed"
                                  : wo.status === "cancelled"
                                  ? "Execution halted"
                                  : `${wo.progress.total - wo.progress.completed} items remaining`}
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={wo.progress.percentage}
                              color={wo.status === "completed" ? "success" : wo.status === "cancelled" ? "error" : "primary"}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        )}

                        {/* Itemized Work Order Scope & Checklist */}
                        <Box mb={3}>
                          <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                            Schedule of Works & Progress Tracking ({wo.items?.length || 0} items)
                          </Typography>
                          {(!wo.items || wo.items.length === 0) ? (
                            <Box p={2.5} textAlign="center" bgcolor="grey.50" borderRadius="8px" border="1px dashed" borderColor="grey.300">
                              <Typography variant="body2" color="text.secondary">
                                No work items recorded in this work order.
                              </Typography>
                            </Box>
                          ) : (
                            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px", mb: 2 }}>
                              <Table size="small">
                                <TableHead sx={{ bgcolor: "grey.100" }}>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 700, width: 60 }} align="center">Done</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 100 }}>Item Code</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 140 }}>Location</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 160 }}>Element</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 90 }}>Qty</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 110 }}>Rate (£)</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 120 }}>Total (£)</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, width: 130 }}>Status</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {wo.items.map((it: SurveyWorkOrderItem) => {
                                    const isCompleted = Boolean(it.is_completed);
                                    const isImmutable = wo.status === "completed" || wo.status === "cancelled" || survey.status === "frozen";

                                    return (
                                      <TableRow
                                        key={it.id}
                                        hover
                                        sx={{
                                          bgcolor: isCompleted ? "success.lighter" : "inherit",
                                        }}
                                      >
                                        <TableCell align="center" sx={{ py: 0.5 }}>
                                          <Checkbox
                                            checked={isCompleted}
                                            disabled={isImmutable || togglingItemId === it.id}
                                            onChange={() => handleToggleWoItemProgress(it.id, isCompleted)}
                                            size="small"
                                            color="success"
                                          />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600, fontSize: "0.82rem" }}>
                                          {it.item_code || `ITM-${it.id}`}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "0.82rem" }}>
                                          {it.room_name || "General"}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                                          {it.element_name || "—"}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "0.82rem" }}>
                                          <Typography variant="body2" sx={{ fontSize: "0.82rem", fontWeight: isCompleted ? 600 : 400 }}>
                                            {it.description}
                                          </Typography>
                                          {it.notes && (
                                            <Typography variant="caption" color="text.secondary" display="block">
                                              {it.notes}
                                            </Typography>
                                          )}
                                          {it.completed_at && (
                                            <Typography variant="caption" color="success.dark" display="block">
                                              Completed: {new Date(it.completed_at).toLocaleDateString()} {new Date(it.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                          )}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontSize: "0.82rem" }}>
                                          {Number(it.quantity).toFixed(2)} {it.unit}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontSize: "0.82rem" }}>
                                          £{Number(it.unit_rate).toFixed(2)}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.82rem" }}>
                                          £{Number(it.total_amount).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell align="center">
                                          <Chip
                                            size="small"
                                            label={isCompleted ? "COMPLETED" : "PENDING"}
                                            color={isCompleted ? "success" : "default"}
                                            sx={{ fontWeight: 700, fontSize: "0.68rem", height: 20 }}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}
                        </Box>

                        {/* Variation Orders List */}
                        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                          Variation Orders ({vos.length})
                        </Typography>

                        {vos.length === 0 ? (
                          <Box p={2.5} textAlign="center" bgcolor="grey.50" borderRadius="8px" border="1px dashed" borderColor="grey.300">
                            <Typography variant="body2" color="text.secondary">
                              No variation orders requested yet. Any site alterations, extra scope, or rate changes must be requested as formal variation orders to protect baseline integrity.
                            </Typography>
                          </Box>
                        ) : (
                          <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px" }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: "grey.100" }}>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 700, width: 140 }}>VO Reference</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>Reason & Description</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700, width: 120 }}>Amount (£)</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 700, width: 120 }}>Status</TableCell>
                                  <TableCell sx={{ fontWeight: 700, width: 140 }}>Created Date</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 700, width: 150 }}>QS / Admin Action</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {vos.map((vo: any) => (
                                  <TableRow key={vo.id} hover>
                                    <TableCell sx={{ fontWeight: 700, color: "primary.main" }}>
                                      {vo.reference}
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="body2" fontWeight={600}>
                                        {vo.reason}
                                      </Typography>
                                      {vo.notes && (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          {vo.notes}
                                        </Typography>
                                      )}
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="body2" fontWeight={700} color={Number(vo.amount) < 0 ? "error.main" : "text.primary"}>
                                        {Number(vo.amount) < 0 ? "-" : "+"}£{Math.abs(Number(vo.amount)).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      <Chip
                                        size="small"
                                        label={vo.status.toUpperCase()}
                                        color={vo.status === "approved" ? "success" : vo.status === "rejected" ? "error" : "warning"}
                                        sx={{ fontWeight: 700, fontSize: "0.7rem", height: 20 }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" color="text.secondary">
                                        {vo.created_at ? new Date(vo.created_at).toLocaleDateString() : "—"}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      {vo.status === "pending" ? (
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                          <Button
                                            size="small"
                                            variant="contained"
                                            color="success"
                                            disabled={actioningVoId === vo.id}
                                            onClick={() => handleUpdateVoStatus(vo.id, "approved")}
                                            sx={{ fontSize: "0.72rem", py: 0.25, px: 1, minWidth: 64, textTransform: "none" }}
                                          >
                                            Approve
                                          </Button>
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            disabled={actioningVoId === vo.id}
                                            onClick={() => handleUpdateVoStatus(vo.id, "rejected")}
                                            sx={{ fontSize: "0.72rem", py: 0.25, px: 1, minWidth: 64, textTransform: "none" }}
                                          >
                                            Reject
                                          </Button>
                                        </Stack>
                                      ) : (
                                        <Typography variant="caption" color="text.secondary">
                                          {vo.status === "approved" ? "Approved & Reconciled" : "Rejected"}
                                        </Typography>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </BlankCard>
                    ) : (
                      <BlankCard sx={{ p: 3, bgcolor: "grey.50", border: "1.5px dashed", borderColor: "success.main" }}>
                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: "success.light", color: "success.main", width: 48, height: 48, borderRadius: "10px" }}>
                              <IconLock size={26} />
                            </Avatar>
                            <Box>
                              <Typography variant="h6" fontWeight={700}>
                                Commercial Baseline Locked & Ready for Contractor Handoff
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Approved commercial scope (£{Number(survey.baseline_total || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) is ready to be converted into an official contractor work order.
                              </Typography>
                            </Box>
                          </Stack>

                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<IconBriefcase size={18} />}
                            onClick={handleOpenHandoff}
                            sx={{ fontWeight: 700, borderRadius: "8px", px: 3, py: 1 }}
                          >
                            Issue Work Order
                          </Button>
                        </Stack>
                      </BlankCard>
                    )}
                  </Box>
                );
              })()}

              {/* Action Buttons in Tab 1 */}
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<IconEye size={18} />}
                  onClick={() => setPreviewOpen(true)}
                  sx={{ fontWeight: 600, borderRadius: "8px" }}
                >
                  Preview Printable Report
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={exportingPdf ? <CircularProgress size={16} /> : <IconDownload size={18} />}
                  onClick={handleExportPdf}
                  disabled={exportingPdf}
                  sx={{ fontWeight: 600, borderRadius: "8px" }}
                >
                  {exportingPdf ? "Generating PDF..." : "Export Report (PDF)"}
                </Button>
                {["submitted", "qs_review", "completed", "frozen"].includes(survey.status) && (
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<IconCalculator size={18} />}
                    component={Link}
                    href={`/apps/surveys/qs/${survey.id}`}
                    sx={{ fontWeight: 700, borderRadius: "8px" }}
                  >
                    Open QS Assessment & Costing Studio
                  </Button>
                )}
              </Stack>
            </Box>
          );
        })()}

        {/* Tab 2: Survey Metadata & Audit */}
        {tabValue === 2 && (
          <Box p={3}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <BlankCard sx={{ p: 2.5, height: "100%" }}>
                  <Typography variant="subtitle1" fontWeight={700} mb={2}>
                    Specification & Provenance
                  </Typography>

                  <Stack spacing={2} divider={<Divider />}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        SURVEY TEMPLATE
                      </Typography>
                      <Typography variant="body2" fontWeight={600} mt={0.5}>
                        {survey.template_name || (survey.creation_method === "blank" ? "Custom Blank Survey" : "Standard")}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        CREATION METHOD
                      </Typography>
                      <Typography variant="body2" fontWeight={600} mt={0.5} sx={{ textTransform: "capitalize" }}>
                        {survey.creation_method}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        SCOPE TOTALS
                      </Typography>
                      <Typography variant="body2" fontWeight={600} mt={0.5}>
                        {survey.rooms?.length || 0} Room(s), {totalElements} Element(s)
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        SURVEYOR NOTES & INSTRUCTIONS
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mt={0.5} fontStyle={survey.notes ? "normal" : "italic"}>
                        {survey.notes || "No notes provided for this survey."}
                      </Typography>
                    </Box>
                  </Stack>
                </BlankCard>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <BlankCard sx={{ p: 2.5, height: "100%" }}>
                  <Typography variant="subtitle1" fontWeight={700} mb={2}>
                    Audit & System Information
                  </Typography>

                  <Stack spacing={2} divider={<Divider />}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        SURVEY ID
                      </Typography>
                      <Typography variant="body2" fontWeight={600} mt={0.5}>
                        #{survey.id}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        CREATED DATE
                      </Typography>
                      <Typography variant="body2" fontWeight={600} mt={0.5}>
                        {survey.created_at ? new Date(survey.created_at).toLocaleString() : "—"}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        LAST UPDATED
                      </Typography>
                      <Typography variant="body2" fontWeight={600} mt={0.5}>
                        {survey.updated_at ? new Date(survey.updated_at).toLocaleString() : "—"}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        CURRENT WORKFLOW STATUS
                      </Typography>
                      <Box mt={0.5}>
                        <Chip
                          label={statusLabelMap[survey.status] || survey.status}
                          color={statusColorMap[survey.status] || "default"}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    </Box>
                  </Stack>
                </BlankCard>
              </Grid>
            </Grid>
          </Box>
        )}
      </BlankCard>

      {/* Report Preview Modal Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "12px", maxHeight: "90vh" },
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconFileDescription size={22} />
            <Typography variant="h6" fontWeight={700}>
              Survey Inspection & Commercial Report Preview
            </Typography>
          </Stack>
          <IconButton size="small" onClick={() => setPreviewOpen(false)}>
            <IconX size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#f1f5f9", p: 3, display: "flex", justifyContent: "center" }}>
          <Box
            sx={{
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
              bgcolor: "#ffffff",
              maxWidth: "100%",
              overflowX: "auto",
            }}
          >
            <SurveyPrintableReport survey={survey} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<IconPrinter size={18} />}
            onClick={() => window.print()}
          >
            Print
          </Button>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={exportingPdf ? <CircularProgress size={16} color="inherit" /> : <IconDownload size={18} />}
              onClick={handleExportPdf}
              disabled={exportingPdf}
              sx={{ fontWeight: 700 }}
            >
              {exportingPdf ? "Generating PDF..." : "Download PDF"}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Work Order Handoff Dialog */}
      <Dialog
        open={woDialogOpen}
        onClose={() => !submittingWo && setWoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar sx={{ bgcolor: "primary.light", color: "primary.main", width: 36, height: 36 }}>
              <IconBriefcase size={20} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Issue Contractor Work Order
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Survey Ref: {survey?.reference} • Baseline: £
                {Number(survey?.baseline_total || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                bgcolor: "grey.50",
                border: "1px dashed",
                borderColor: "grey.300",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                This will create a legally binding contractor/subcontractor work order snapshotting
                the approved scope items and rates. The original commercial baseline of{" "}
                <strong>
                  £
                  {Number(survey?.baseline_total || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>{" "}
                will be preserved. Any future scope changes must be handled via formal Variation Orders.
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  select
                  fullWidth
                  label="Assign Contractor / Subcontractor"
                  value={woForm.contractor_id}
                  onChange={(e: any) => {
                    const selId = e.target.value;
                    const found = contractors.find((s) => String(s.id) === String(selId));
                    setWoForm((prev) => ({
                      ...prev,
                      contractor_id: selId,
                      contractor_name: found ? found.name : prev.contractor_name,
                    }));
                  }}
                >
                  <MenuItem value="">
                    <em>Select from registered users</em>
                  </MenuItem>
                  {contractors.map((s) => (
                    <MenuItem key={s.id} value={String(s.id)}>
                      {s.name} {s.email ? `(${s.email})` : ""}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  label="Contractor Name / Firm"
                  placeholder="e.g. Acme Demolition Ltd"
                  value={woForm.contractor_name}
                  onChange={(e: any) =>
                    setWoForm((prev) => ({ ...prev, contractor_name: e.target.value }))
                  }
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  label="Trade / Package Name"
                  placeholder="e.g. General Building Works, Strip Out, Electrical"
                  value={woForm.trade_name}
                  onChange={(e: any) =>
                    setWoForm((prev) => ({ ...prev, trade_name: e.target.value }))
                  }
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  type="date"
                  label="Scheduled Start Date"
                  value={woForm.start_date}
                  onChange={(e: any) =>
                    setWoForm((prev) => ({ ...prev, start_date: e.target.value }))
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  type="date"
                  label="Target Completion Date"
                  value={woForm.target_completion_date}
                  onChange={(e: any) =>
                    setWoForm((prev) => ({ ...prev, target_completion_date: e.target.value }))
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Handoff Notes & Instructions"
                  placeholder="Site access details, safety precautions, handover conditions..."
                  value={woForm.notes}
                  onChange={(e: any) =>
                    setWoForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setWoDialogOpen(false)} disabled={submittingWo}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={submittingWo ? <CircularProgress size={16} color="inherit" /> : <IconBriefcase size={18} />}
            onClick={handleCreateWorkOrder}
            disabled={submittingWo}
          >
            {submittingWo ? "Issuing Work Order..." : "Issue Work Order"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Variation Order Dialog */}
      <Dialog
        open={voDialogOpen}
        onClose={() => !submittingVo && setVoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar sx={{ bgcolor: "warning.light", color: "warning.main", width: 36, height: 36 }}>
              <IconFileDescription size={20} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Request Variation Order (VO)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Work Order: {(survey?.work_order || survey?.work_orders?.[0])?.reference || survey?.reference}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                bgcolor: "grey.50",
                border: "1px dashed",
                borderColor: "grey.300",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Submit extra scope, unforeseen site conditions, or contractual value adjustments.
                Once submitted, a Quantity Surveyor (QS) or Admin must approve this Variation Order before it is reconciled into the current contract total.
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  required
                  label="Variation Reason / Justification"
                  placeholder="e.g. Discovered rotted timber joists requiring replacement behind bathroom wall"
                  value={voForm.reason}
                  onChange={(e: any) =>
                    setVoForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  required
                  type="number"
                  label="Variation Cost (£ Amount)"
                  placeholder="e.g. 850.00"
                  value={voForm.amount}
                  onChange={(e: any) =>
                    setVoForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  helperText="Positive value for additional costs; negative value for scope reductions/credits."
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Detailed Notes / Schedule Reference"
                  placeholder="Additional trade details, materials specification, or site photos reference..."
                  value={voForm.notes}
                  onChange={(e: any) =>
                    setVoForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setVoDialogOpen(false)} disabled={submittingVo}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={submittingVo ? <CircularProgress size={16} color="inherit" /> : <IconCheck size={18} />}
            onClick={handleCreateVariationOrder}
            disabled={submittingVo}
          >
            {submittingVo ? "Submitting..." : "Submit Variation Order"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Freeze & Archive Confirmation Dialog */}
      <Dialog
        open={freezeDialogOpen}
        onClose={() => !freezing && setFreezeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconArchive size={22} color="#d32f2f" />
          Freeze & Archive Survey Permanently
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle sx={{ fontWeight: 700 }}>Irreversible Action</AlertTitle>
            Freezing a survey permanently locks all inspection data, commercial scope items, baseline costs, and work orders.
            Once frozen, no further modifications, status changes, room/item edits, or variation orders can be made.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Survey Reference: <strong>{survey?.reference}</strong>
            <br />
            Property: <strong>{survey?.property_name || "—"}</strong>
            <br />
            Commercial Baseline: <strong>£{Number(survey?.baseline_total || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setFreezeDialogOpen(false)} disabled={freezing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={freezing ? <CircularProgress size={16} color="inherit" /> : <IconArchive size={18} />}
            onClick={handleFreezeSurvey}
            disabled={freezing}
          >
            {freezing ? "Freezing..." : "Yes, Freeze & Archive Survey"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Work Order Dialog */}
      <Dialog
        open={cancelWoDialogOpen}
        onClose={() => !updatingWoStatus && setCancelWoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconX size={22} color="#d32f2f" />
          Cancel Work Order
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle sx={{ fontWeight: 700 }}>Notice</AlertTitle>
            Cancelling this work order will permanently halt all work and mark the work order cancelled. This action cannot be undone.
          </Alert>
          <CustomTextField
            fullWidth
            required
            multiline
            rows={3}
            label="Cancellation Reason / Notes"
            placeholder="Provide a clear reason for cancelling this contractor work order..."
            value={cancelWoReason}
            onChange={(e: any) => setCancelWoReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCancelWoDialogOpen(false)} disabled={updatingWoStatus}>
            Keep Work Order
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={updatingWoStatus ? <CircularProgress size={16} color="inherit" /> : <IconX size={18} />}
            onClick={() => handleUpdateWoStatus("cancelled", cancelWoReason)}
            disabled={updatingWoStatus || !cancelWoReason.trim()}
          >
            {updatingWoStatus ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contractor Job Pack PDF Preview Dialog */}
      <Dialog
        open={woPreviewOpen}
        onClose={() => setWoPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconBriefcase size={22} />
            <Typography variant="h6" fontWeight={700}>
              Contractor Work Order Job Pack Preview
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<IconDownload size={16} />}
              onClick={handleExportWoJobPackPdf}
              disabled={exportingWoPdf}
            >
              {exportingWoPdf ? "Downloading..." : "Download Job Pack PDF"}
            </Button>
            <IconButton size="small" onClick={() => setWoPreviewOpen(false)}>
              <IconX size={18} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "grey.100", p: 3, display: "flex", justifyContent: "center" }}>
          {activeWorkOrder ? (
            <Box sx={{ width: "794px", bgcolor: "#fff", boxShadow: 3, borderRadius: 1, overflow: "hidden" }}>
              <WorkOrderJobPackReport
                survey={survey}
                workOrder={activeWorkOrder}
              />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No work order data available to preview.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setWoPreviewOpen(false)}>Close Preview</Button>
        </DialogActions>
      </Dialog>

      {/* Off-screen render container for PDF export generator */}
      <Box
        sx={{
          position: "fixed",
          left: -99999,
          top: 0,
          width: "794px",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        <SurveyPrintableReport survey={survey} containerRef={reportPrintRef} />
      </Box>

      {/* Off-screen render container for Contractor Work Order Job Pack PDF export */}
      {activeWorkOrder && (
        <Box
          sx={{
            position: "fixed",
            left: -99999,
            top: 0,
            width: "794px",
            opacity: 0,
            pointerEvents: "none",
            zIndex: -1,
          }}
        >
          <WorkOrderJobPackReport
            survey={survey}
            workOrder={activeWorkOrder}
            containerRef={woReportPrintRef}
          />
        </Box>
      )}
    </Box>
  );
}
