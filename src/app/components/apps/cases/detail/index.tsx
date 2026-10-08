"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  Divider,
  Drawer,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import {
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconHistory,
  IconX,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
  Circle,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import api from "@/utils/axios";
import { GOOGLE_MAPS_SHARED_LOADER_OPTIONS } from "@/utils/googleMaps";
import {
  EmptyState,
  overviewTableSx,
} from "@/app/components/apps/project/detail/OverviewRecordsDrawer";

dayjs.extend(customParseFormat);

type CaseDetailData = {
  id: number;
  name?: string | null;
  case_id?: string | null;
  ref?: string | null;
  project_id?: number | null;
  project_name?: string | null;
  project_names?: string | null;
  parent_address_name?: string | null;
  status_text?: string | null;
  status_int?: number | null;
  progress?: string | number | null;
  start_date?: string | null;
  end_date?: string | null;
  trades?: number | null;
  check_ins?: number | null;
  documents?: number | null;
  type?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  radius?: string | number | null;
  color?: string | null;
};

type CaseActivityItem = {
  id: number | string;
  user_name?: string | null;
  message?: string | null;
  date_added?: string | null;
  type_name?: string | null;
  request_type?: number | null;
};

type CheckinAttachment = {
  id?: number;
  image?: string | null;
};

type CaseCheckinItem = {
  id: number;
  user_name?: string | null;
  trade_name?: string | null;
  type?: string | null;
  task_name?: string | null;
  pricework_amount?: string | number | null;
  currency?: string | null;
  date_added?: string | null;
  formatted_check_in_time?: string | null;
  formatted_check_out_time?: string | null;
  duration?: number | null;
  project_name?: string | null;
  before_attachments_count?: number | null;
  after_attachments_count?: number | null;
  before_attachments?: CheckinAttachment[] | null;
  after_attachments?: CheckinAttachment[] | null;
};

const ADDRESS_PROGRESS_STATUS = {
  TODO: { status_int: 13, status_text: "To Do" },
  IN_PROGRESS: { status_int: 3, status_text: "In Progress" },
  COMPLETED: { status_int: 4, status_text: "Completed" },
} as const;

const parseProgress = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace("%", "")) || 0;
};

const progressToStatus = (progress: number) => {
  if (progress <= 0) return ADDRESS_PROGRESS_STATUS.TODO;
  if (progress >= 100) return ADDRESS_PROGRESS_STATUS.COMPLETED;
  return ADDRESS_PROGRESS_STATUS.IN_PROGRESS;
};

const formatCheckinAmount = (item: CaseCheckinItem) => {
  const amount = item.pricework_amount;
  if (item.type === "Pricework" && amount) {
    return `${item.currency || "$"}${Number(amount).toFixed(2)}`;
  }
  return "-";
};

const formatDuration = (secs?: number | null) => {
  const total = Number(secs || 0);
  if (!total) return "-";
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (!hrs && !mins) return "-";
  return `${hrs}h ${mins}m`;
};

const formatValue = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = dayjs(
    value,
    [
      "DD/MM/YYYY HH:mm:ss",
      "DD/MM/YYYY HH:mm",
      "DD/MM/YYYY",
      "YYYY-MM-DD HH:mm:ss",
      "YYYY-MM-DD",
    ],
    true,
  );
  const source = parsed.isValid() ? parsed : dayjs(value);
  if (!source.isValid()) return String(value);
  return source.hour() || source.minute()
    ? source.format("DD/MM/YYYY")
    : source.format("DD/MM/YYYY");
};

const statusColor = (statusInt?: number | null) => {
  if (statusInt === 13) return "#999999";
  if (statusInt === 4) return "#32A852";
  if (statusInt === 3) return "#FF7F00";
  return "text.primary";
};

const AdminProgressField = ({
  value,
  statusInt,
  canEdit,
  saving,
  onSave,
}: {
  value?: string | number | null;
  statusInt?: number | null;
  canEdit: boolean;
  saving: boolean;
  onSave: (progress: number) => Promise<void>;
}) => {
  const numericValue = parseProgress(value);
  const [localValue, setLocalValue] = React.useState(numericValue);
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    setLocalValue(numericValue);
  }, [numericValue]);

  const display = value == null || value === "" ? "-" : String(value);

  if (!canEdit) {
    return (
      <Typography fontSize={14} fontWeight={600} color={statusColor(statusInt)}>
        {display}
      </Typography>
    );
  }

  const saveProgress = async () => {
    const clampedValue = Math.min(100, Math.max(0, localValue));
    if (clampedValue === numericValue) {
      setIsEditing(false);
      return;
    }
    try {
      await onSave(clampedValue);
      setIsEditing(false);
    } catch {
      setLocalValue(numericValue);
    }
  };

  if (isEditing) {
    return (
      <TextField
        type="text"
        size="small"
        autoFocus
        disabled={saving}
        inputProps={{
          maxLength: 3,
          inputMode: "numeric",
          pattern: "[0-9]*",
        }}
        value={localValue}
        onChange={(e) => setLocalValue(Number(e.target.value) || 0)}
        onBlur={saveProgress}
        onKeyDown={(e) => e.key === "Enter" && saveProgress()}
        sx={{
          width: 72,
          "& .MuiInputBase-input": { textAlign: "center", p: "6px" },
        }}
      />
    );
  }

  return (
    <Typography
      fontSize={14}
      fontWeight={700}
      color={statusColor(statusInt)}
      sx={{ cursor: "pointer", width: "fit-content" }}
      onClick={() => setIsEditing(true)}
      title="Click to edit progress"
    >
      {display}
    </Typography>
  );
};

const DetailField = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <Stack spacing={0.5} minWidth={0}>
    <Typography fontSize={12} color="text.secondary" fontWeight={600}>
      {label}
    </Typography>
    <Typography fontSize={14} fontWeight={500} sx={{ wordBreak: "break-word" }}>
      {value}
    </Typography>
  </Stack>
);

const CaseLocationMap = ({
  latitude,
  longitude,
  radius,
  color,
}: {
  latitude?: string | number | null;
  longitude?: string | number | null;
  radius?: string | number | null;
  color?: string | null;
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const { isLoaded } = useJsApiLoader({
    ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  });

  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasValidCenter = Number.isFinite(lat) && Number.isFinite(lng);
  const mapRadius = Number(radius) > 0 ? Number(radius) : 200;
  const zoneColor = color || "#FF0000";

  const fitToCircle = () => {
    const map = mapRef.current;
    const circle = circleRef.current;
    if (!map || !circle) return;
    const bounds = circle.getBounds();
    if (bounds) map.fitBounds(bounds, 48);
  };

  useEffect(() => {
    if (!hasValidCenter || !isLoaded) return;
    fitToCircle();
  }, [hasValidCenter, isLoaded, lat, lng, mapRadius]);

  if (!hasValidCenter) return null;

  if (!isLoaded) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%" minHeight={360}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        minHeight: { xs: 320, md: 420 },
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <GoogleMap
        zoom={15}
        center={{ lat, lng }}
        onLoad={(map) => {
          mapRef.current = map;
          fitToCircle();
        }}
        mapContainerStyle={{
          width: "100%",
          height: "100%",
          minHeight: 420,
        }}
        options={{
          gestureHandling: "greedy",
          draggable: true,
          scrollwheel: true,
          disableDoubleClickZoom: false,
          zoomControl: true,
          mapTypeControl: true,
          fullscreenControl: true,
          streetViewControl: false,
          keyboardShortcuts: true,
          clickableIcons: false,
        }}
      >
        <Marker position={{ lat, lng }} draggable={false} />
        <Circle
          center={{ lat, lng }}
          radius={mapRadius}
          onLoad={(circle) => {
            circleRef.current = circle;
            fitToCircle();
          }}
          options={{
            draggable: false,
            editable: false,
            clickable: false,
            fillColor: zoneColor,
            fillOpacity: 0.25,
            strokeColor: zoneColor,
            strokeOpacity: 0.9,
            strokeWeight: 2,
          }}
        />
      </GoogleMap>
    </Box>
  );
};

interface Props {
  open?: boolean;
  onClose?: () => void;
  caseId?: number | null;
  projectId?: number | null;
  onUpdated?: () => void;
}

const CaseDetail: React.FC<Props> = ({
  open,
  onClose,
  caseId: caseIdProp,
  projectId,
  onUpdated,
}) => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const user = session?.user as User & {
    company_id?: number | null;
    user_role_id?: number | null;
  };
  const isAdmin = Number(user?.user_role_id) === 1;
  const caseId = Number(caseIdProp ?? params?.id ?? 0);
  const isOpen = open ?? true;
  const fromProjectId = projectId ?? searchParams?.get("project_id");

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CaseDetailData | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);
  const [activity, setActivity] = useState<CaseActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [checkins, setCheckins] = useState<CaseCheckinItem[]>([]);
  const [checkinsLoading, setCheckinsLoading] = useState(false);
  const [checkinsDrawerOpen, setCheckinsDrawerOpen] = useState(false);
  const [checkinPage, setCheckinPage] = useState(0);
  const [checkinRowsPerPage, setCheckinRowsPerPage] = useState(50);
  const [checkinTotal, setCheckinTotal] = useState(0);
  const [imageDrawerOpen, setImageDrawerOpen] = useState(false);
  const [drawerImages, setDrawerImages] = useState<CheckinAttachment[]>([]);
  const [openPreview, setOpenPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);

  const closeCheckinImages = () => {
    setImageDrawerOpen(false);
    setOpenPreview(false);
  };

  const openAttachmentDrawer = (images?: CheckinAttachment[] | null) => {
    setDrawerImages(images || []);
    setImageDrawerOpen(true);
  };

  const handleClose = () => {
    setActivityDrawerOpen(false);
    setCheckinsDrawerOpen(false);
    closeCheckinImages();
    if (onClose) {
      onClose();
      return;
    }
    if (fromProjectId) {
      router.push(`/apps/project/list/${fromProjectId}?tab=cases`);
      return;
    }
    router.push("/apps/cases/list");
  };

  const fetchDetail = async () => {
    if (!caseId) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`address/address-detail?address_id=${caseId}`);
      if (res.data?.IsSuccess) {
        setDetail(res.data.info || null);
      } else {
        setDetail(null);
      }
    } catch (error) {
      console.error("Failed to load case details", error);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async (currentPage: number, currentLimit: number) => {
    if (!user?.company_id || !caseId) return;
    setActivityLoading(true);
    try {
      const params = new URLSearchParams({
        company_id: String(user.company_id),
        record_id: String(caseId),
        type: "107",
        page: String(currentPage),
        limit: String(currentLimit),
      });
      const res = await api.get(`project/get-history?${params}`);
      setActivity(res.data?.info || []);
      setTotalItems(Number(res.data?.data?.totalItems || 0));
    } catch (error) {
      console.error("Failed to load case activity", error);
      setActivity([]);
      setTotalItems(0);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchCheckins = async (currentPage: number, currentLimit: number) => {
    if (!caseId) return;
    setCheckinsLoading(true);
    try {
      const params = new URLSearchParams({
        address_id: String(caseId),
        page: String(currentPage),
        limit: String(currentLimit),
      });
      const res = await api.get(`user-checklog/company-checklogs?${params}`);
      setCheckins(res.data?.info || []);
      setCheckinTotal(Number(res.data?.data?.totalItems || 0));
    } catch (error) {
      console.error("Failed to load case check-ins", error);
      setCheckins([]);
      setCheckinTotal(0);
    } finally {
      setCheckinsLoading(false);
    }
  };

  const handleProgressSave = async (clampedValue: number) => {
    if (!caseId) return;
    setSavingProgress(true);
    try {
      const res = await api.put("address/change-address-progress", {
        id: caseId,
        progress: clampedValue,
      });
      if (!res.data?.IsSuccess) {
        throw new Error(res.data?.message || "Failed to update progress");
      }
      const info = res.data.info || {};
      const derived = progressToStatus(clampedValue);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              progress: info.progress ?? `${clampedValue}%`,
              status_int: info.status ?? derived.status_int,
              status_text: info.status_text ?? derived.status_text,
            }
          : prev,
      );
      toast.success(res.data.message || "Progress updated");
      onUpdated?.();
      if (activityDrawerOpen) {
        fetchActivity(page + 1, rowsPerPage);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update progress");
      throw error;
    } finally {
      setSavingProgress(false);
    }
  };

  const openActivityDrawer = () => {
    setPage(0);
    setActivityDrawerOpen(true);
  };

  const openCheckinsDrawer = () => {
    setCheckinPage(0);
    setCheckinsDrawerOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchDetail();
  }, [caseId, isOpen]);

  useEffect(() => {
    if (!activityDrawerOpen || !user?.company_id || !caseId) return;
    fetchActivity(page + 1, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityDrawerOpen, caseId, user?.company_id, page, rowsPerPage]);

  useEffect(() => {
    if (!checkinsDrawerOpen || !caseId) return;
    fetchCheckins(checkinPage + 1, checkinRowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinsDrawerOpen, caseId, checkinPage, checkinRowsPerPage]);

  const hasMap =
    Number.isFinite(Number(detail?.latitude)) &&
    Number.isFinite(Number(detail?.longitude));

  return (
    <Drawer
      anchor="bottom"
      open={isOpen}
      onClose={handleClose}
      PaperProps={{
        sx: {
          height: "95vh",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          p: 2,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        mb={1}
        sx={{ flexShrink: 0 }}
      >
        <IconButton onClick={handleClose} aria-label="Back">
          <IconArrowLeft size={20} />
        </IconButton>
        <Box minWidth={0} flex={1}>
          <Typography fontWeight={700} fontSize={18} noWrap>
            {detail?.name || "Case details"}
          </Typography>
          <Typography fontSize={13} color="text.secondary">
            {detail?.case_id || (detail?.id ? `Case #${detail.id}` : "")}
          </Typography>
        </Box>
        {detail ? (
          <Button
            variant="outlined"
            startIcon={<IconHistory size={18} />}
            onClick={openActivityDrawer}
            sx={{ whiteSpace: "nowrap", minHeight: 36, flexShrink: 0 }}
          >
            Activity
          </Button>
        ) : null}
        <IconButton onClick={handleClose} aria-label="Close">
          <IconX size={18} />
        </IconButton>
      </Stack>

      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          flex={1}
          py={8}
        >
          <CircularProgress />
        </Box>
      ) : !detail ? (
        <EmptyState message="Case not found." />
      ) : (
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            flex: 1,
            minHeight: 0,
            overflow: "auto",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: hasMap ? "minmax(0, 1fr) minmax(280px, 1fr)" : "1fr",
              },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            <Box minWidth={0}>
              <Typography
                fontWeight={700}
                fontSize={13}
                letterSpacing={0.4}
                mb={2}
              >
                CASE DETAILS
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                  },
                  gap: 2,
                }}
              >
                <DetailField label="Case" value={formatValue(detail.name)} />
                <DetailField
                  label="Case Id"
                  value={formatValue(detail.case_id)}
                />
                <DetailField
                  label="Reference"
                  value={formatValue(detail.ref)}
                />
                <DetailField
                  label="Project"
                  value={formatValue(
                    detail.project_names || detail.project_name,
                  )}
                />
                <DetailField
                  label="Parent address"
                  value={formatValue(detail.parent_address_name)}
                />
                <DetailField
                  label="Status"
                  value={
                    <Typography
                      fontSize={14}
                      fontWeight={600}
                      color={statusColor(detail.status_int)}
                    >
                      {formatValue(detail.status_text)}
                    </Typography>
                  }
                />
                <DetailField
                  label="Progress"
                  value={
                    <AdminProgressField
                      value={detail.progress}
                      statusInt={detail.status_int}
                      canEdit={isAdmin}
                      saving={savingProgress}
                      onSave={handleProgressSave}
                    />
                  }
                />
                <DetailField label="Type" value={formatValue(detail.type)} />
                <DetailField
                  label="Start date"
                  value={formatDate(detail.start_date)}
                />
                <DetailField
                  label="Finish date"
                  value={formatDate(detail.end_date)}
                />
                <DetailField
                  label="Trades"
                  value={formatValue(detail.trades)}
                />
                <DetailField
                  label="Check ins"
                  value={
                    <Typography
                      fontSize={14}
                      fontWeight={700}
                      color="#007AFF"
                      sx={{ cursor: "pointer", width: "fit-content" }}
                      onClick={openCheckinsDrawer}
                    >
                      {formatValue(detail.check_ins)}
                    </Typography>
                  }
                />
                <DetailField
                  label="Documents"
                  value={formatValue(detail.documents)}
                />
              </Box>
            </Box>
            {hasMap && (
              <Box
                minWidth={0}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  minHeight: { xs: 360, md: 480 },
                }}
              >
                <Typography
                  fontWeight={700}
                  fontSize={13}
                  letterSpacing={0.4}
                  mb={2}
                >
                  MAP
                </Typography>
                <Box sx={{ flex: 1, minHeight: { xs: 320, md: 420 } }}>
                  <CaseLocationMap
                    latitude={detail.latitude}
                    longitude={detail.longitude}
                    radius={detail.radius}
                    color={detail.color}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
      )}

      <Drawer
        anchor="right"
        open={checkinsDrawerOpen}
        onClose={() => {
          setCheckinsDrawerOpen(false);
          closeCheckinImages();
        }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 720, md: 1080 },
            display: "flex",
            flexDirection: "column",
            boxShadow: "none",
          },
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          px={2}
          py={1.5}
        >
          <Box display="flex" alignItems="center" gap={1} minWidth={0}>
            <IconButton
              onClick={() => {
                setCheckinsDrawerOpen(false);
                closeCheckinImages();
              }}
              aria-label="Back"
            >
              <IconArrowLeft size={20} />
            </IconButton>
            <Box minWidth={0}>
              <Typography variant="h6" fontWeight={700} noWrap>
                Check ins
              </Typography>
              <Typography fontSize={13} color="text.secondary" noWrap>
                {detail?.name || detail?.case_id || `Case #${detail?.id}`}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => {
              setCheckinsDrawerOpen(false);
              closeCheckinImages();
            }}
            aria-label="Close"
          >
            <IconX size={20} />
          </IconButton>
        </Box>
        <Divider />
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            p: 2,
          }}
        >
          {checkinsLoading && checkins.length === 0 ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress size={28} />
            </Box>
          ) : checkins.length > 0 || checkinTotal > 0 ? (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                <Table
                  stickyHeader
                  size="small"
                  aria-label="case check-ins"
                  sx={{ ...overviewTableSx, minWidth: 1080 }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Trade</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Task</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Start</TableCell>
                      <TableCell>End</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Photo Before</TableCell>
                      <TableCell>Photo After</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {checkins.map((item) => {
                      const beforeCount = item.before_attachments_count || 0;
                      const afterCount = item.after_attachments_count || 0;
                      return (
                      <TableRow key={item.id}>
                        <TableCell>{item.user_name || "-"}</TableCell>
                        <TableCell>{item.trade_name || "-"}</TableCell>
                        <TableCell>{item.type || "-"}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {item.task_name || "-"}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {formatCheckinAmount(item)}
                        </TableCell>
                        <TableCell>{formatDate(item.date_added)}</TableCell>
                        <TableCell>
                          {item.formatted_check_in_time || "-"}
                        </TableCell>
                        <TableCell>
                          {item.formatted_check_out_time || "-"}
                        </TableCell>
                        <TableCell>{formatDuration(item.duration)}</TableCell>
                        <TableCell>
                          <Typography
                            fontSize={14}
                            sx={{
                              width: "fit-content",
                              cursor: beforeCount > 0 ? "pointer" : "default",
                              "&:hover": {
                                color:
                                  beforeCount > 0 ? "primary.main" : "inherit",
                              },
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (beforeCount > 0) {
                                openAttachmentDrawer(item.before_attachments);
                              }
                            }}
                          >
                            {beforeCount || 0}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            fontSize={14}
                            sx={{
                              width: "fit-content",
                              cursor: afterCount > 0 ? "pointer" : "default",
                              "&:hover": {
                                color:
                                  afterCount > 0 ? "primary.main" : "inherit",
                              },
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (afterCount > 0) {
                                openAttachmentDrawer(item.after_attachments);
                              }
                            }}
                          >
                            {afterCount || 0}
                          </Typography>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={checkinTotal}
                page={checkinPage}
                onPageChange={(_, next) => setCheckinPage(next)}
                rowsPerPage={checkinRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setCheckinRowsPerPage(parseInt(event.target.value, 10));
                  setCheckinPage(0);
                }}
                rowsPerPageOptions={[50, 100, 250, 500]}
                sx={{
                  flexShrink: 0,
                  borderTop: "1px solid",
                  borderColor: "divider",
                }}
              />
            </Box>
          ) : (
            <EmptyState message="No check-ins found for this case." />
          )}
        </Box>
      </Drawer>

      <Drawer
        anchor="right"
        open={imageDrawerOpen}
        onClose={() => setImageDrawerOpen(false)}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 450 },
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          px={2}
          py={1.5}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton
              onClick={() => setImageDrawerOpen(false)}
              aria-label="Back"
            >
              <IconArrowLeft size={20} />
            </IconButton>
            <Typography variant="h6" fontWeight={600}>
              Images
            </Typography>
          </Box>
          <IconButton
            onClick={() => setImageDrawerOpen(false)}
            aria-label="Close"
          >
            <IconX size={20} />
          </IconButton>
        </Box>
        <Divider />
        <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
          <Grid container spacing={2}>
            {drawerImages.map((item, index) => (
              <Grid size={{ xs: 6 }} key={item.id ?? index}>
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: 2,
                    overflow: "hidden",
                    cursor: "pointer",
                    bgcolor: "grey.100",
                    transition: "0.2s",
                    "&:hover": { transform: "scale(1.03)" },
                  }}
                >
                  <Image
                    onClick={(event) => {
                      event.stopPropagation();
                      setPreviewImage(
                        item.image || "/images/products/product.svg",
                      );
                      setPreviewIndex(index);
                      setZoomScale(1);
                      setOpenPreview(true);
                    }}
                    src={item.image || "/images/products/product.svg"}
                    alt={`Image ${index + 1}`}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
          {drawerImages.length === 0 && (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              height={250}
            >
              <Typography color="text.secondary">No images available</Typography>
            </Box>
          )}
        </Box>
      </Drawer>

      <Dialog
        open={openPreview}
        onClose={() => setOpenPreview(false)}
        fullScreen
        sx={{ zIndex: (theme) => theme.zIndex.modal + 3 }}
        PaperProps={{
          sx: {
            backgroundColor: "rgba(0,0,0,0.9)",
            boxShadow: "none",
          },
        }}
      >
        <IconButton
          onClick={() => setOpenPreview(false)}
          sx={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 1301,
            backgroundColor: "#fff",
            "&:hover": { backgroundColor: "#eee", color: "#1e4db7" },
          }}
        >
          <IconX />
        </IconButton>
        <Box
          sx={{
            width: "100vw",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
          onClick={() => setOpenPreview(false)}
        >
          {drawerImages.length > 1 && (
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                setPreviewIndex((prev) =>
                  prev > 0 ? prev - 1 : drawerImages.length - 1,
                );
                setZoomScale(1);
              }}
              sx={{
                position: "absolute",
                left: 20,
                zIndex: 1301,
                backgroundColor: "rgba(255,255,255,0.7)",
                "&:hover": { backgroundColor: "#fff" },
              }}
            >
              <IconChevronLeft size={30} />
            </IconButton>
          )}
          <Box
            sx={{
              width: "80%",
              height: "80%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={drawerImages[previewIndex]?.image || previewImage || ""}
              alt="Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                transform: `scale(${zoomScale})`,
                transition: "transform 0.2s",
              }}
            />
          </Box>
          {drawerImages.length > 1 && (
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                setPreviewIndex((prev) =>
                  prev < drawerImages.length - 1 ? prev + 1 : 0,
                );
                setZoomScale(1);
              }}
              sx={{
                position: "absolute",
                right: 20,
                zIndex: 1301,
                backgroundColor: "rgba(255,255,255,0.7)",
                "&:hover": { backgroundColor: "#fff" },
              }}
            >
              <IconChevronRight size={30} />
            </IconButton>
          )}
          <Stack
            direction="row"
            spacing={2}
            onClick={(event) => event.stopPropagation()}
            sx={{
              position: "absolute",
              bottom: 20,
              backgroundColor: "rgba(255,255,255,0.8)",
              padding: "8px 16px",
              borderRadius: "30px",
              zIndex: 1301,
            }}
          >
            <IconButton
              onClick={() => setZoomScale((prev) => Math.min(prev + 0.5, 5))}
            >
              <IconZoomIn />
            </IconButton>
            <IconButton
              onClick={() => setZoomScale((prev) => Math.max(prev - 0.5, 0.5))}
            >
              <IconZoomOut />
            </IconButton>
            <IconButton
              onClick={async () => {
                const url =
                  drawerImages[previewIndex]?.image || previewImage || "";
                if (!url) return;
                try {
                  const response = await fetch(url);
                  const blob = await response.blob();
                  const blobUrl = window.URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = blobUrl;
                  link.download = `checkin_image_${previewIndex + 1}.jpg`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(blobUrl);
                } catch (error) {
                  console.error("Failed to download image", error);
                }
              }}
            >
              <IconDownload />
            </IconButton>
          </Stack>
        </Box>
      </Dialog>

      <Drawer
        anchor="right"
        open={activityDrawerOpen}
        onClose={() => setActivityDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 720, md: 860 },
            display: "flex",
            flexDirection: "column",
            boxShadow: "none",
          },
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          px={2}
          py={1.5}
        >
          <Box display="flex" alignItems="center" gap={1} minWidth={0}>
            <IconButton
              onClick={() => setActivityDrawerOpen(false)}
              aria-label="Back"
            >
              <IconArrowLeft size={20} />
            </IconButton>
            <Box minWidth={0}>
              <Typography variant="h6" fontWeight={700} noWrap>
                Activity
              </Typography>
              <Typography fontSize={13} color="text.secondary" noWrap>
                {detail?.name || detail?.case_id || `Case #${detail?.id}`}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setActivityDrawerOpen(false)}
            aria-label="Close"
          >
            <IconX size={20} />
          </IconButton>
        </Box>
        <Divider />
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            p: 2,
          }}
        >
          {activityLoading && activity.length === 0 ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress size={28} />
            </Box>
          ) : activity.length > 0 || totalItems > 0 ? (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                <Table
                  stickyHeader
                  size="small"
                  aria-label="case activity"
                  sx={{
                    ...overviewTableSx,
                    minWidth: 640,
                    "& td:first-of-type": {
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Message</TableCell>
                      <TableCell sx={{ width: 160 }}>Type</TableCell>
                      <TableCell sx={{ width: 170 }}>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activity.map((item) => (
                      <TableRow key={String(item.id)}>
                        <TableCell
                          sx={{ whiteSpace: "normal", wordBreak: "break-word" }}
                        >
                          {item.user_name
                            ? `${item.user_name}: ${item.message || "-"}`
                            : item.message || "-"}
                        </TableCell>
                        <TableCell>
                          <Box
                            width="fit-content"
                            bgcolor="#FF7F00"
                            px={1.5}
                            borderRadius="10px"
                          >
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              fontSize="12px !important"
                              color="#fff"
                            >
                              {item.type_name || "Cases"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{formatDate(item.date_added)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={totalItems}
                page={page}
                onPageChange={(_, next) => setPage(next)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[50, 100, 250, 500]}
                sx={{
                  flexShrink: 0,
                  borderTop: "1px solid",
                  borderColor: "divider",
                }}
              />
            </Box>
          ) : (
            <EmptyState message="No activity found for this case." />
          )}
        </Box>
      </Drawer>
    </Drawer>
  );
};

export default CaseDetail;
