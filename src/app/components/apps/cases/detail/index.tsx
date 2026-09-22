"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
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
import { IconArrowLeft, IconHistory, IconX } from "@tabler/icons-react";
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

type CaseCheckinItem = {
  id: number;
  user_name?: string | null;
  trade_name?: string | null;
  type?: string | null;
  date_added?: string | null;
  formatted_check_in_time?: string | null;
  formatted_check_out_time?: string | null;
  duration?: number | null;
  project_name?: string | null;
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
  const { isLoaded } = useJsApiLoader({
    ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  });

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const center = { lat, lng };
  const mapRadius = Number(radius) > 0 ? Number(radius) : 200;
  const zoneColor = color || "#FF0000";

  if (!isLoaded) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", height: "100%", minHeight: 260 }}>
      <GoogleMap
        zoom={15}
        center={center}
        mapContainerStyle={{
          width: "100%",
          height: "100%",
          minHeight: 260,
          borderRadius: 8,
        }}
        options={{
          draggable: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
          zoomControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          keyboardShortcuts: false,
        }}
      >
        <Marker position={center} draggable={false} />
        <Circle
          center={center}
          radius={mapRadius}
          options={{
            draggable: false,
            editable: false,
            clickable: false,
            fillColor: zoneColor,
            fillOpacity: 0.3,
            strokeColor: zoneColor,
            strokeOpacity: 1,
            strokeWeight: 1,
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

  const handleClose = () => {
    setActivityDrawerOpen(false);
    setCheckinsDrawerOpen(false);
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
                  minHeight: { xs: 280, md: "100%" },
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
                <Box sx={{ flex: 1, minHeight: 260 }}>
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
        onClose={() => setCheckinsDrawerOpen(false)}
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
              onClick={() => setCheckinsDrawerOpen(false)}
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
            onClick={() => setCheckinsDrawerOpen(false)}
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
                  sx={{ ...overviewTableSx, minWidth: 640 }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Trade</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Start</TableCell>
                      <TableCell>End</TableCell>
                      <TableCell>Duration</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {checkins.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.user_name || "-"}</TableCell>
                        <TableCell>{item.trade_name || "-"}</TableCell>
                        <TableCell>{item.type || "-"}</TableCell>
                        <TableCell>{formatDate(item.date_added)}</TableCell>
                        <TableCell>
                          {item.formatted_check_in_time || "-"}
                        </TableCell>
                        <TableCell>
                          {item.formatted_check_out_time || "-"}
                        </TableCell>
                        <TableCell>{formatDuration(item.duration)}</TableCell>
                      </TableRow>
                    ))}
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
