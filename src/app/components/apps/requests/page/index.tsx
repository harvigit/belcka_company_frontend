"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { Theme } from "@mui/material/styles";
import {
  IconArrowLeft,
  IconBriefcase,
  IconCalendar,
  IconCheck,
  IconCircleCheck,
  IconClockStop,
  IconCurrentLocation,
  IconInfoCircle,
  IconMapPin,
  IconExternalLink,
  IconFileText,
  IconFilter,
  IconInbox,
  IconMessage,
  IconNotes,
  IconPaperclip,
  IconSearch,
  IconSparkles,
  IconTag,
  IconUser,
  IconX,
} from "@tabler/icons-react";

import api from "@/utils/axios";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import EvidenceFilesDrawer, {
  EvidenceFile,
} from "@/app/components/common/EvidenceFilesDrawer";
import RejectReasonDialog from "@/app/components/common/RejectReasonDialog";
import { orderBillingDiffs, prepareDisplayDiffs } from "@/utils/diffDisplay";
import {
  REQUEST_MESSAGE_TRANSLATION_KEYS,
  getRequestHref,
  getStatusColor,
  getStatusKey,
  getTypeColor,
  isBillingInfoRequest,
  isPendingRequest,
  isProjectCapacityRequest,
  loadDateRangeFromStorage,
  needsRejectReason,
  postRequestAction,
  saveDateRangeToStorage,
} from "@/app/components/apps/requests/requestUtils";

type FilterOption = { id: number; name?: string };
type StatusTab = "all" | "pending" | "approved" | "rejected";

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const defaultFilters = {
  users: "" as string | number,
  types: "" as string | number,
};

// Placeholder rows for the AI Verification card (no backend yet, shown disabled).
const AI_CHECKS = [
  "AI-generated image check",
  "Image metadata (date, device)",
  "Duplicate check (used before)",
];

const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif", "heic"];
const isImageFile = (file: EvidenceFile) =>
  IMAGE_EXT.includes(
    file.image_url.split("?")[0].split(".").pop()?.toLowerCase() ?? "",
  );

const cardSx = {
  borderRadius: "16px",
  border: "1px solid #eaeaea",
  bgcolor: "background.paper",
  boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
};

function StatusBadge({ work, small }: { work: any; small?: boolean }) {
  const { t } = useTranslation();
  const color = getStatusColor(work);
  return (
    <Typography
      component="span"
      sx={{
        px: small ? 0.75 : 1.25,
        py: small ? 0.1 : 0.4,
        borderRadius: "12px",
        border: "1px solid",
        borderColor: color,
        color,
        bgcolor: `${color}12`,
        fontWeight: 600,
        fontSize: small ? "0.6rem" : "0.7rem",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {t(work.status_text)}
    </Typography>
  );
}

function SectionCard({
  title,
  action,
  children,
  sx,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  sx?: any;
}) {
  return (
    <Box sx={{ ...cardSx, p: 2, ...sx }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={1.5}
        gap={1}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      display="grid"
      gridTemplateColumns={{ xs: "1fr", sm: "180px 1fr" }}
      columnGap={2}
      rowGap={0.25}
      py={0.75}
    >
      <Box display="flex" alignItems="center" gap={1} color="text.secondary">
        {icon}
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
      <Typography
        component="div"
        variant="body2"
        fontWeight={500}
        sx={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
      >
        {children}
      </Typography>
    </Box>
  );
}

// Requests tied to a worklog: they get the System Information card.
const SYSTEM_INFO_TABLES = ["user_worklogs", "penalty_details", "penalty_appeals"];
const hasSystemInfo = (work: any) =>
  SYSTEM_INFO_TABLES.includes(String(work?.table_name || "").toLowerCase());

type WorklogSystemInfo = {
  start: { location: string | null; inside_zone: boolean | null; device: string | null };
  stop: { location: string | null; inside_zone: boolean | null; device: string | null };
  auto_stop_work: boolean;
  penalty: {
    total_minutes: number;
    outside_area_minutes: number;
    auto_stop_minutes: number;
  };
};

const GOOD_COLOR = "#4CBC6D";
const BAD_COLOR = "#FF484B";
const MUTED_COLOR = "#9e9e9e";

function SystemInfoRow({
  icon,
  label,
  value,
  color,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  hint?: string | null;
}) {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap={1.5}
      py={0.75}
    >
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        color="text.secondary"
        minWidth={0}
      >
        {icon}
        <Typography variant="body2" color="text.secondary" noWrap>
          {label}
        </Typography>
      </Box>
      <Tooltip title={hint || ""} placement="top" disableHoverListener={!hint}>
        <Box display="flex" alignItems="center" gap={0.75} flexShrink={0}>
          <Box
            sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }}
          />
          <Typography variant="body2" fontWeight={600} sx={{ color }}>
            {value}
          </Typography>
        </Box>
      </Tooltip>
    </Box>
  );
}

function WorklogSystemInfoCard({ requestId }: { requestId: number }) {
  const { t } = useTranslation();
  const [info, setInfo] = useState<WorklogSystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setInfo(null);
    api
      .get("requests/worklog-system-info", {
        params: { request_log_id: requestId },
      })
      .then((res) => {
        if (!cancelled) setInfo(res.data?.info ?? null);
      })
      .catch((err) => console.error("Failed to fetch worklog system info", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const zoneValue = (inside: boolean | null) =>
    inside === null
      ? { value: t("No GPS data"), color: MUTED_COLOR }
      : inside
        ? { value: t("Inside working zone"), color: GOOD_COLOR }
        : { value: t("Outside working zone"), color: BAD_COLOR };

  return (
    <SectionCard
      title={
        <Box display="flex" alignItems="center" gap={0.75}>
          <IconInfoCircle size={18} />
          {t("System Information")}
        </Box>
      }
    >
      {loading ? (
        <Box display="flex" justifyContent="center" py={2}>
          <CircularProgress size={22} />
        </Box>
      ) : !info ? (
        <Typography variant="body2" color="text.secondary">
          {t("System information is not available.")}
        </Typography>
      ) : (
        <>
          <SystemInfoRow
            icon={<IconMapPin size={18} />}
            label={t("GPS location (Start)")}
            hint={info.start.location}
            {...zoneValue(info.start.inside_zone)}
          />
          <SystemInfoRow
            icon={<IconCurrentLocation size={18} />}
            label={t("GPS location (Stop)")}
            hint={info.stop.location}
            {...zoneValue(info.stop.inside_zone)}
          />
          <SystemInfoRow
            icon={<IconClockStop size={18} />}
            label={t("Auto Stop Work")}
            value={info.auto_stop_work ? t("Triggered") : t("Not triggered")}
            color={info.auto_stop_work ? BAD_COLOR : GOOD_COLOR}
          />
          <SystemInfoRow
            icon={<IconInfoCircle size={18} />}
            label={t("Penalty")}
            value={
              info.penalty.total_minutes > 0
                ? `${info.penalty.total_minutes} ${t("min")}`
                : t("None")
            }
            color={info.penalty.total_minutes > 0 ? BAD_COLOR : GOOD_COLOR}
            hint={
              info.penalty.total_minutes > 0
                ? [
                    info.penalty.outside_area_minutes > 0 &&
                      `${t("Outside Area Penalty")}: ${info.penalty.outside_area_minutes} ${t("min")}`,
                    info.penalty.auto_stop_minutes > 0 &&
                      `${t("Autostop Work Penalty")}: ${info.penalty.auto_stop_minutes} ${t("min")}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : null
            }
          />
        </>
      )}
    </SectionCard>
  );
}

export default function RequestsPage() {
  const { t } = useTranslation();
  // List and detail side by side from lg; below that one panel at a time.
  const splitView = useMediaQuery((theme: Theme) => theme.breakpoints.up("md"));
  const session = useSession();
  const companyId = Number(
    (session.data?.user as { company_id?: string | number | null } | undefined)
      ?.company_id,
  );

  const [initialDates] = useState(() => {
    const stored = loadDateRangeFromStorage();
    if (stored?.startDate && stored?.endDate) return stored;
    // Current week (Mon - Sun), same default as the header drawer.
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1);
    const end = new Date(today);
    end.setDate(today.getDate() - today.getDay() + 7);
    return { startDate: start, endDate: end };
  });

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(
    initialDates.startDate,
  );
  const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [filters, setFilters] = useState(defaultFilters);
  const [tempFilters, setTempFilters] = useState(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [typeOptions, setTypeOptions] = useState<FilterOption[]>([]);
  const [userOptions, setUserOptions] = useState<FilterOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [actioningType, setActioningType] = useState<
    "approve" | "reject" | null
  >(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [evidenceRequest, setEvidenceRequest] = useState<any | null>(null);

  const translateRequestText = (value?: string | null) =>
    value
      ? REQUEST_MESSAGE_TRANSLATION_KEYS.reduce(
          (message, key) => message.replaceAll(key, t(key)),
          value,
        )
      : "";

  const fetchFilterOptions = async () => {
    try {
      const res = await api.get("requests/get-filters");
      const info = res.data?.info || [];
      setTypeOptions(
        info.find((item: any) => item.key === "types")?.data || [],
      );
      setUserOptions(
        info.find((item: any) => item.key === "users")?.data || [],
      );
    } catch (err) {
      console.error("Failed to fetch request filters", err);
    }
  };

  // Status is filtered on the client (tabs), so the counts stay right for every tab.
  const fetchRequests = async (silent = false) => {
    // Without company_id the API lists requests of every company.
    if (!startDate || !endDate || !companyId) return;
    try {
      if (!silent) setLoading(true);
      const param: any = {
        company_id: companyId,
        start_date: format(startDate, "dd/MM/yyyy"),
        end_date: format(endDate, "dd/MM/yyyy"),
      };
      const filterPayload: { users?: string; types?: string } = {};
      if (filters.users !== "") filterPayload.users = String(filters.users);
      if (filters.types !== "") filterPayload.types = String(filters.types);
      if (Object.keys(filterPayload).length) param.filters = filterPayload;
      if (debouncedSearch) param.search = debouncedSearch;

      const res = await api.post("requests/get-all-request", param);
      setData(res.data?.requests || []);
    } catch (err) {
      console.error("Failed to fetch requests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, startDate, endDate, filters, debouncedSearch]);

  const counts = useMemo(() => {
    const result: Record<StatusTab, number> = {
      all: data.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    data.forEach((work) => {
      const key = isPendingRequest(work) ? "pending" : getStatusKey(work);
      if (key in result && key !== "all") result[key as StatusTab] += 1;
    });
    return result;
  }, [data]);

  const visibleRequests = useMemo(() => {
    if (statusTab === "all") return data;
    return data.filter((work) =>
      statusTab === "pending"
        ? isPendingRequest(work)
        : getStatusKey(work) === statusTab,
    );
  }, [data, statusTab]);

  // Keep a request selected: the current one while it is still listed, else the first.
  useEffect(() => {
    if (visibleRequests.some((work) => work.id === selectedId)) return;
    setSelectedId(visibleRequests[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRequests]);

  const selected = useMemo(
    () => visibleRequests.find((work) => work.id === selectedId) ?? null,
    [visibleRequests, selectedId],
  );

  const handleDateRangeChange = (range: {
    from: Date | null;
    to: Date | null;
  }) => {
    if (range.from && range.to) {
      setStartDate(range.from);
      setEndDate(range.to);
      saveDateRangeToStorage(range.from, range.to);
    }
  };

  const handleRequestAction = async (
    work: any,
    action: "approve" | "reject",
    reason?: string,
  ) => {
    if (!work?.id || actioningType) return;

    if (action === "reject" && needsRejectReason(work) && !reason?.trim()) {
      setRejectTarget(work);
      return;
    }

    setActioningType(action);
    try {
      const res = await postRequestAction(work, action, reason?.trim());
      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        setRejectTarget(null);
        await fetchRequests(true);
      }
    } catch (err: any) {
      console.error(err, "error while approving or rejecting this request!");
      const message = err?.response?.data?.message || err?.message;
      if (message) toast.error(t(message));
    } finally {
      setActioningType(null);
    }
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  /* ------------------------------ List panel ------------------------------ */

  const listPanel = (
    <Box
      sx={{
        ...cardSx,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress size={32} />
          </Box>
        ) : visibleRequests.length === 0 ? (
          <Box textAlign="center" py={8} color="text.secondary">
            <IconInbox size={36} stroke={1.5} />
            <Typography variant="body2" color="text.secondary" mt={1}>
              {t("No requests found.")}
            </Typography>
          </Box>
        ) : (
          visibleRequests.map((work) => {
            const active = work.id === selectedId;
            return (
              <ButtonBase
                key={work.id}
                onClick={() => {
                  setSelectedId(work.id);
                  setMobileDetailOpen(true);
                }}
                sx={{
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-start",
                  textAlign: "left",
                  gap: 1.5,
                  p: 1.5,
                  mb: 0.5,
                  borderRadius: "12px",
                  border: "1px solid",
                  borderColor: active ? "primary.main" : "transparent",
                  bgcolor: active ? "primary.light" : "transparent",
                  transition: "background-color 0.15s",
                  "&:hover": {
                    bgcolor: active ? "primary.light" : "action.hover",
                  },
                }}
              >
                <Avatar
                  src={work.user_thumb_image || work.user_image}
                  alt={work.user_name}
                  sx={{ width: 40, height: 40 }}
                />
                <Box flex={1} minWidth={0}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    gap={1}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      noWrap
                      title={work.user_name}
                    >
                      {work.user_name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      flexShrink={0}
                    >
                      #REQ-{work.id}
                    </Typography>
                  </Box>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    gap={1}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{ color: getTypeColor(work) }}
                      noWrap
                    >
                      {t(work.type_name)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      flexShrink={0}
                    >
                      {work.date_added}
                    </Typography>
                  </Box>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    gap={1}
                    mt={0.5}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={0.5}
                      minWidth={0}
                      color="text.secondary"
                    >
                      {work.project_name && (
                        <>
                          <IconBriefcase size={13} style={{ flexShrink: 0 }} />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                          >
                            {work.project_name}
                          </Typography>
                        </>
                      )}
                      {work.files?.length > 0 && (
                        <Box
                          display="inline-flex"
                          alignItems="center"
                          gap={0.25}
                          ml={work.project_name ? 0.75 : 0}
                          color="primary.main"
                        >
                          <IconPaperclip size={12} />
                          <Typography variant="caption" fontWeight={600}>
                            {work.files.length}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <StatusBadge work={work} small />
                  </Box>
                </Box>
              </ButtonBase>
            );
          })
        )}
      </Box>
    </Box>
  );

  /* ----------------------------- Detail panel ----------------------------- */

  const renderDetail = (work: any) => {
    const href = getRequestHref(work);
    const diffs = prepareDisplayDiffs(
      isBillingInfoRequest(work)
        ? orderBillingDiffs(work.diff_data)
        : work.diff_data,
    );
    const files: EvidenceFile[] = work.files ?? [];
    const canAct = isPendingRequest(work) && work.can_approve !== false;
    const isRejected = getStatusKey(work) === "rejected";

    return (
      <Box
        sx={{
          ...cardSx,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          display="flex"
          alignItems="center"
          gap={2}
          p={2}
          borderBottom="1px solid #eaeaea"
        >
          {!mdUp && (
            <IconButton onClick={() => setMobileDetailOpen(false)}>
              <IconArrowLeft size={20} />
            </IconButton>
          )}
          <Avatar
            src={work.user_thumb_image || work.user_image}
            alt={work.user_name}
            sx={{ width: 52, height: 52 }}
          />
          <Box flex={1} minWidth={0}>
            <Typography variant="h5" fontWeight={700} noWrap>
              {work.user_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              #REQ-{work.id} · {t(work.type_name)}
            </Typography>
          </Box>
          <StatusBadge work={work} />
          {href && (
            <Tooltip title={t("Open")}>
              <IconButton component={Link} href={href}>
                <IconExternalLink size={20} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Body */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
          <Box
            display="grid"
            gridTemplateColumns={{
              // One column while the list sits beside it; two once there's room.
              xs: "1fr",
              xl: "minmax(0, 7fr) minmax(0, 5fr)",
            }}
            gap={2}
            alignItems="start"
          >
            <Stack spacing={2} minWidth={0}>
              <SectionCard title={t("Request Details")}>
                <DetailRow icon={<IconTag size={16} />} label={t("Type")}>
                  <Box
                    component="span"
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: "8px",
                      bgcolor: getTypeColor(work),
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {t(work.type_name)}
                  </Box>
                </DetailRow>
                <DetailRow
                  icon={<IconMessage size={16} />}
                  label={t("Request")}
                >
                  {translateRequestText(work.message) || "—"}
                </DetailRow>
                {work.project_name && (
                  <DetailRow
                    icon={<IconBriefcase size={16} />}
                    label={t("Project")}
                  >
                    {work.project_name}
                  </DetailRow>
                )}
                {work.date && (
                  <DetailRow
                    icon={<IconCalendar size={16} />}
                    label={t("Date")}
                  >
                    {work.date}
                  </DetailRow>
                )}
                <DetailRow
                  icon={<IconCalendar size={16} />}
                  label={t("Requested on")}
                >
                  {work.date_added || "—"}
                </DetailRow>
                <DetailRow
                  icon={<IconNotes size={16} />}
                  label={t("Explanation")}
                >
                  {work.request_note || t("Not provided")}
                </DetailRow>
                {!isPendingRequest(work) && work.action_by && (
                  <DetailRow
                    icon={<IconUser size={16} />}
                    label={isRejected ? t("Rejected by") : t("Approved by")}
                  >
                    {work.action_by}
                  </DetailRow>
                )}
                {isRejected && work.reject_reason && (
                  <Box
                    mt={1}
                    px={1.25}
                    py={0.75}
                    sx={{
                      borderRadius: "8px",
                      borderLeft: `3px solid ${getStatusColor(work)}`,
                      bgcolor: `${getStatusColor(work)}0D`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color={getStatusColor(work)}
                      display="block"
                    >
                      {t("Rejection note")}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {work.reject_reason}
                    </Typography>
                  </Box>
                )}
              </SectionCard>

              <SectionCard title={t("Changes")}>
                {diffs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t("No changes to compare.")}
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      borderRadius: "12px",
                      border: "1px solid #eaeaea",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      display="grid"
                      gridTemplateColumns="minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)"
                      sx={{ bgcolor: "grey.100", px: 1.5, py: 1 }}
                    >
                      <Typography variant="caption" fontWeight={700} />
                      <Typography variant="caption" fontWeight={700}>
                        {t("Current")}
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>
                        {t("Requested")}
                      </Typography>
                    </Box>
                    {diffs.map((diff) => {
                      const changed = diff.new != null;
                      return (
                        <Box
                          key={diff.key}
                          display="grid"
                          gridTemplateColumns="minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)"
                          alignItems="center"
                          sx={{
                            px: 1.5,
                            py: 1,
                            borderTop: "1px solid #eaeaea",
                          }}
                        >
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ textTransform: "capitalize" }}
                          >
                            {t(diff.label)}
                          </Typography>
                          {diff.old != null ? (
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{
                                color: changed ? "#C62828" : "text.primary",
                                wordBreak: "break-word",
                              }}
                            >
                              {String(diff.old)}
                            </Typography>
                          ) : (
                            // Field was empty before this request.
                            <Typography
                              variant="body2"
                              color="text.disabled"
                              fontStyle="italic"
                            >
                              {t("Not set")}
                            </Typography>
                          )}
                          <Box>
                            <Typography
                              component="span"
                              variant="body2"
                              fontWeight={700}
                              sx={{
                                px: changed ? 1 : 0,
                                py: 0.25,
                                borderRadius: "6px",
                                color: changed ? "#2E7D32" : "text.primary",
                                bgcolor: changed ? "#E8F5E9" : "transparent",
                                wordBreak: "break-word",
                              }}
                            >
                              {changed
                                ? String(diff.new)
                                : diff.old != null
                                  ? String(diff.old)
                                  : "—"}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </SectionCard>
            </Stack>

            <Stack spacing={2} minWidth={0}>
              <SectionCard
                title={`${t("Evidence")} (${files.length})`}
                action={
                  files.length > 0 && (
                    <Button
                      size="small"
                      onClick={() => setEvidenceRequest(work)}
                      sx={{ textTransform: "none" }}
                    >
                      {t("View all")}
                    </Button>
                  )
                }
              >
                {files.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t("No evidence attached.")}
                  </Typography>
                ) : (
                  <Box
                    display="grid"
                    gridTemplateColumns="repeat(3, minmax(0, 1fr))"
                    gap={1}
                  >
                    {files.slice(0, 6).map((file) => (
                      <ButtonBase
                        key={file.id}
                        onClick={() => setEvidenceRequest(work)}
                        sx={{
                          aspectRatio: "4 / 3",
                          borderRadius: "10px",
                          overflow: "hidden",
                          border: "1px solid #eaeaea",
                          bgcolor: "grey.100",
                          color: "text.secondary",
                        }}
                      >
                        {isImageFile(file) ? (
                          <Box
                            component="img"
                            src={file.thumb_url || file.image_url}
                            alt=""
                            loading="lazy"
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <IconFileText size={28} stroke={1.5} />
                        )}
                      </ButtonBase>
                    ))}
                  </Box>
                )}
              </SectionCard>

              {/* AI Verification: design only for now, no logic behind it yet. */}
              <SectionCard
                title={
                  <Box display="flex" alignItems="center" gap={0.75}>
                    <IconSparkles size={18} />
                    {t("AI Verification")}
                  </Box>
                }
                action={
                  <Chip
                    size="small"
                    label={t("Coming soon")}
                    sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
                  />
                }
                sx={{
                  opacity: 0.55,
                  pointerEvents: "none",
                  userSelect: "none",
                  bgcolor: "grey.50",
                }}
              >
                {AI_CHECKS.map((label) => (
                  <Box
                    key={label}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    gap={1}
                    py={0.75}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      color="text.secondary"
                    >
                      <IconCircleCheck size={18} />
                      <Typography variant="body2">{t(label)}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  </Box>
                ))}
              </SectionCard>

              {hasSystemInfo(work) && (
                <WorklogSystemInfoCard requestId={work.id} />
              )}
            </Stack>
          </Box>
        </Box>

        {/* Actions */}
        {canAct && (
          <Box
            display="flex"
            justifyContent="flex-end"
            gap={1.5}
            p={2}
            borderTop="1px solid #eaeaea"
          >
            <Button
              variant="outlined"
              color="error"
              disabled={Boolean(actioningType)}
              startIcon={
                actioningType === "reject" ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <IconX size={18} />
                )
              }
              onClick={() => handleRequestAction(work, "reject")}
              sx={{ minWidth: 130, fontWeight: 600 }}
            >
              {t("Reject")}
            </Button>
            <Button
              variant="contained"
              color="success"
              disabled={Boolean(actioningType)}
              startIcon={
                actioningType === "approve" ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <IconCheck size={18} />
                )
              }
              onClick={() => handleRequestAction(work, "approve")}
              sx={{ minWidth: 130, fontWeight: 600, color: "#fff" }}
            >
              {t("Approve")}
            </Button>
          </Box>
        )}
      </Box>
    );
  };

  const emptyDetail = (
    <Box
      sx={{
        ...cardSx,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "text.secondary",
        minHeight: 300,
      }}
    >
      <IconInbox size={42} stroke={1.5} />
      <Typography variant="body2" color="text.secondary" mt={1}>
        {loading ? t("Loading...") : t("Select a request to see its details.")}
      </Typography>
    </Box>
  );

  const showList = mdUp || !mobileDetailOpen || !selected;
  const showDetail = mdUp || (mobileDetailOpen && selected);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: { md: "calc(100vh - 140px)" },
        minHeight: { md: 560 },
      }}
    >
      {/* Toolbar */}
      <Box
        display="flex"
        flexWrap={{ xs: "wrap", md: "nowrap" }}
        alignItems="center"
        justifyContent="space-between"
        columnGap={2}
        rowGap={1.5}
      >
        <Box
          display="flex"
          alignItems="center"
          columnGap={2}
          rowGap={1}
          flexWrap="wrap"
          minWidth={0}
          sx={{ flex: { xs: "1 1 100%", md: "0 0 auto" } }}
        >
          {/* Tabs stay on one line and scroll sideways when there is no room. */}
          <Box
            display="flex"
            gap={1}
            minWidth={0}
            sx={{
              overflowX: "auto",
              maxWidth: "100%",
              pb: 0.25,
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {STATUS_TABS.map((tab) => {
              const active = statusTab === tab.key;
              return (
                <Button
                  key={tab.key}
                  size="small"
                  variant={active ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setStatusTab(tab.key)}
                  sx={{
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    borderRadius: "10px",
                    fontWeight: 600,
                    px: 1.5,
                    ...(!active && {
                      borderColor: "#eaeaea",
                      color: "text.primary",
                      bgcolor: "background.paper",
                    }),
                  }}
                >
                  {t(tab.label)}
                  {/* Only Pending shows how many are waiting. */}
                  {tab.key === "pending" && (
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        px: 0.75,
                        borderRadius: "8px",
                        fontSize: 11,
                        lineHeight: "18px",
                        bgcolor: active ? "rgba(255,255,255,0.25)" : "grey.100",
                      }}
                    >
                      {counts.pending}
                    </Box>
                  )}
                </Button>
              );
            })}
          </Box>
        </Box>

        <Box
          display="flex"
          alignItems="center"
          justifyContent="flex-end"
          gap={1}
          minWidth={0}
          sx={{ flex: { xs: "1 1 100%", md: "1 1 0" } }}
        >
          <TextField
            placeholder={t("Search...")}
            size="small"
            sx={{
              flex: "1 1 0",
              minWidth: 0,
              maxWidth: { md: 300 },
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconSearch size={16} />
                </InputAdornment>
              ),
            }}
          />
          <Box
            sx={{
              flex: "0 0 auto",
              "& .MuiButton-root": {
                whiteSpace: "nowrap",
                height: 40,
              },
            }}
          >
            <DateRangePickerBox
              from={startDate}
              to={endDate}
              onChange={handleDateRangeChange}
              labelFormat="dd MMM"
              buttonMinWidth={0}
              buttonLabelAlign="left"
            />
          </Box>
          <Button
            variant={hasActiveFilters ? "contained" : "outlined"}
            color="primary"
            onClick={() => {
              setTempFilters(filters);
              setFilterOpen(true);
            }}
            aria-label={t("Filters")}
            title={t("Filters")}
            sx={{ flexShrink: 0, minWidth: 40, width: 40, height: 40, p: 0 }}
          >
            <IconFilter size={18} />
          </Button>
        </Box>
      </Box>

      {/* List + detail */}
      <Box
        display="grid"
        gridTemplateColumns={{
          xs: "1fr",
          md: "minmax(280px, 5fr) minmax(0, 7fr)",
          lg: "minmax(300px, 4fr) minmax(0, 8fr)",
          xl: "minmax(340px, 3fr) minmax(0, 8fr)",
        }}
        gap={2}
        sx={{ flex: 1, minHeight: 0 }}
      >
        {showList && (
          <Box minHeight={0} sx={{ height: { xs: "70vh", lg: "100%" } }}>
            {listPanel}
          </Box>
        )}
        {showDetail && (
          <Box minHeight={0} sx={{ height: { xs: "auto", lg: "100%" } }}>
            {selected ? renderDetail(selected) : emptyDetail}
          </Box>
        )}
      </Box>

      <EvidenceFilesDrawer
        open={Boolean(evidenceRequest)}
        onClose={() => setEvidenceRequest(null)}
        files={evidenceRequest?.files ?? []}
        userName={evidenceRequest?.user_name}
        userImage={
          evidenceRequest?.user_thumb_image || evidenceRequest?.user_image
        }
        date={
          evidenceRequest
            ? [evidenceRequest.type_name, evidenceRequest.date]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
      />

      <RejectReasonDialog
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) =>
          handleRequestAction(rejectTarget, "reject", reason)
        }
        title={
          isProjectCapacityRequest(rejectTarget)
            ? t("Reject capacity request")
            : t("Reject Billing Info Request")
        }
        message={
          isProjectCapacityRequest(rejectTarget)
            ? t("Add a reason for rejecting this capacity change.")
            : undefined
        }
        loading={actioningType === "reject"}
      />

      <Dialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ m: 0, position: "relative" }}>
          {t("Filters")}
          <IconButton
            aria-label={t("Close")}
            onClick={() => setFilterOpen(false)}
            sx={{ position: "absolute", right: 12, top: 8 }}
          >
            <IconX size={24} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Autocomplete
              options={userOptions}
              getOptionLabel={(option) => (option.name ? t(option.name) : "")}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                userOptions.find(
                  (u) => String(u.id) === String(tempFilters.users),
                ) || null
              }
              onChange={(_, value) =>
                setTempFilters({ ...tempFilters, users: value ? value.id : "" })
              }
              renderInput={(params) => (
                <TextField {...params} label={t("User")} fullWidth />
              )}
            />
            <Autocomplete
              options={typeOptions}
              getOptionLabel={(option) => (option.name ? t(option.name) : "")}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                typeOptions.find(
                  (o) => String(o.id) === String(tempFilters.types),
                ) || null
              }
              onChange={(_, value) =>
                setTempFilters({ ...tempFilters, types: value ? value.id : "" })
              }
              renderInput={(params) => (
                <TextField {...params} label={t("Types")} fullWidth />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => {
              setTempFilters(defaultFilters);
              setFilters(defaultFilters);
              setFilterOpen(false);
            }}
          >
            {t("Clear")}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setFilters(tempFilters);
              setFilterOpen(false);
            }}
          >
            {t("Apply")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
