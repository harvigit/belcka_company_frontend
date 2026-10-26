"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import BlankCard from "@/app/components/shared/BlankCard";
import { Survey, SurveyItem, SurveyStatus } from "../types";

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

  useEffect(() => {
    const fetchSurvey = async () => {
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
    };

    void fetchSurvey();
  }, [id]);

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
          {/* Status Change Dropdown */}
          <Button
            variant="outlined"
            color="secondary"
            endIcon={<IconChevronDown size={16} />}
            onClick={(e) => setStatusMenuAnchor(e.currentTarget)}
            disabled={updatingStatus || survey.status === "frozen"}
            sx={{ fontWeight: 600, borderRadius: "8px" }}
          >
            Change Status
          </Button>
          <Menu
            anchorEl={statusMenuAnchor}
            open={Boolean(statusMenuAnchor)}
            onClose={() => setStatusMenuAnchor(null)}
          >
            {(["draft", "assigned", "in_progress", "submitted", "qs_review", "completed"] as SurveyStatus[]).map(
              (st) => (
                <MenuItem
                  key={st}
                  selected={survey.status === st}
                  onClick={() => handleUpdateStatus(st)}
                >
                  <Chip
                    size="small"
                    label={statusLabelMap[st]}
                    color={statusColorMap[st]}
                    sx={{ mr: 1.5, minWidth: 80, fontWeight: 600 }}
                  />
                  <Typography variant="body2">{statusLabelMap[st]}</Typography>
                </MenuItem>
              ),
            )}
          </Menu>

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

          {survey.status !== "frozen" && (
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

        {/* Tab 1: Survey Metadata & Audit */}
        {tabValue === 1 && (
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
    </Box>
  );
}
