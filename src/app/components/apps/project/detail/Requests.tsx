"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { IconCheck, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import RejectReasonDialog from "@/app/components/common/RejectReasonDialog";

type CapacityRequest = {
  request_id: number;
  current_capacity?: number | null;
  requested_capacity?: number | null;
  note?: string | null;
  status?: number;
  status_text?: string | null;
  requested_by_name?: string | null;
  requested_at?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  rejected_by_name?: string | null;
  rejected_at?: string | null;
  reject_reason?: string | null;
};

type StatusKey = "pending" | "approved" | "rejected" | "other";
type FilterKey = "all" | "pending" | "approved" | "rejected";

const PENDING_STATUS = 3;

const cellSx = {
  py: "6px",
  px: 1.25,
  fontSize: 13,
  lineHeight: 1.3,
  whiteSpace: "nowrap" as const,
};

const capacityLabel = (value: unknown) => {
  const amount = Number(value ?? 0);
  return amount > 0 ? String(amount) : "0";
};

const formatWhen = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusKeyOf = (item: CapacityRequest): StatusKey => {
  const label = String(item.status_text || "").toLowerCase();
  if (Number(item.status) === PENDING_STATUS || label === "pending") {
    return "pending";
  }
  if (label === "approved" || Number(item.status) === 5) return "approved";
  if (label === "rejected" || Number(item.status) === 12) return "rejected";
  return "other";
};

const STATUS_META: Record<
  StatusKey,
  { label: string; color: "warning" | "success" | "error" | "default" }
> = {
  pending: { label: "Pending", color: "warning" },
  approved: { label: "Approved", color: "success" },
  rejected: { label: "Rejected", color: "error" },
  other: { label: "Closed", color: "default" },
};

const ProjectCapacityRequests = ({
  projectId,
  companyId,
  isAdmin,
  refreshKey = 0,
  onCountChange,
  onAction,
}: {
  projectId: number;
  companyId?: number | null;
  isAdmin: boolean;
  refreshKey?: number;
  onCountChange?: (total: number) => void;
  onAction?: () => void;
}) => {
  const [rows, setRows] = useState<CapacityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const loadRequests = useCallback(async () => {
    if (!projectId || !companyId) return;
    setLoading(true);
    try {
      const res = await api.get(
        `project/capacity-requests?company_id=${companyId}&project_id=${projectId}`,
      );
      const list = Array.isArray(res.data?.info) ? res.data.info : [];
      setRows(list);
      onCountChange?.(Number(res.data?.data?.total ?? list.length));
    } catch (error) {
      console.error(error);
      setRows([]);
      onCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, companyId, refreshKey, onCountChange]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const runAction = async (
    requestId: number,
    action: "approve" | "reject",
    reason?: string,
  ) => {
    if (!requestId || actionId) return;
    setActionId(requestId);
    setActionType(action);
    try {
      const res = await api.post(
        `project/manage-projects/capacity-request/${action}`,
        {
          request_id: requestId,
          company_id: Number(companyId),
          ...(action === "reject" ? { reason: reason?.trim() || "" } : {}),
        },
      );
      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        setRejectId(null);
        await loadRequests();
        onAction?.();
      }
    } catch {
      // Axios interceptor already shows the error toast.
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const counts = useMemo(() => {
    const next = { all: rows.length, pending: 0, approved: 0, rejected: 0 };
    rows.forEach((item) => {
      const key = statusKeyOf(item);
      if (key === "pending" || key === "approved" || key === "rejected") {
        next[key] += 1;
      }
    });
    return next;
  }, [rows]);

  const visibleRows = rows.filter((item) =>
    filter === "all" ? true : statusKeyOf(item) === filter,
  );

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  const headings = [
    "Requested by",
    "Requested at",
    "Current",
    "Requested",
    "Note",
    "Status",
    "Reviewed by",
    "",
  ];

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 1.5,
          py: 1,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
          overflowX: "auto",
        }}
      >
        {filters.map((item) => {
          const selected = filter === item.key;
          return (
            <Chip
              key={item.key}
              size="small"
              label={`${item.label} (${loading ? "—" : counts[item.key]})`}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              onClick={() => setFilter(item.key)}
              sx={{ fontWeight: 600 }}
            />
          );
        })}
      </Stack>

      <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <Table stickyHeader size="small" aria-label="project capacity requests">
          <TableHead>
            <TableRow>
              {headings.map((heading) => (
                <TableCell
                  key={heading || "actions"}
                  sx={{
                    ...cellSx,
                    fontWeight: 700,
                    bgcolor: "background.paper",
                  }}
                >
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={headings.length} sx={{ border: 0 }}>
                  <Stack alignItems="center" py={6}>
                    <CircularProgress size={28} />
                  </Stack>
                </TableCell>
              </TableRow>
            ) : visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={headings.length} sx={{ border: 0 }}>
                  <Typography
                    color="text.secondary"
                    align="center"
                    sx={{ py: 6 }}
                  >
                    {rows.length === 0
                      ? "No capacity requests for this project."
                      : `No ${filter} requests.`}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((item) => {
                const status = statusKeyOf(item);
                const meta = STATUS_META[status];
                const pending = status === "pending";
                const busy = actionId === item.request_id;
                const reviewer =
                  item.approved_by_name || item.rejected_by_name || "";
                const reviewedAt = item.approved_at || item.rejected_at;
                return (
                  <TableRow key={item.request_id} hover>
                    <TableCell sx={cellSx}>
                      {item.requested_by_name || "Unknown user"}
                    </TableCell>
                    <TableCell sx={cellSx}>
                      {formatWhen(item.requested_at)}
                    </TableCell>
                    <TableCell sx={cellSx}>
                      {capacityLabel(item.current_capacity)}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, fontWeight: 700 }}>
                      {capacityLabel(item.requested_capacity)}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, maxWidth: 280 }}>
                      <Tooltip title={item.note || ""} disableHoverListener={!item.note}>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ fontSize: 13, maxWidth: 260 }}
                        >
                          {item.note || "—"}
                        </Typography>
                      </Tooltip>
                      {item.reject_reason ? (
                        <Tooltip title={item.reject_reason}>
                          <Typography
                            noWrap
                            sx={{ fontSize: 12, color: "error.main", maxWidth: 260 }}
                          >
                            Rejection: {item.reject_reason}
                          </Typography>
                        </Tooltip>
                      ) : null}
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={item.status_text || meta.label}
                        color={meta.color}
                        sx={{
                          height: 22,
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "capitalize",
                        }}
                      />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      {reviewer ? (
                        <Box>
                          <Typography sx={{ fontSize: 13 }} noWrap>
                            {reviewer}
                          </Typography>
                          <Typography
                            sx={{ fontSize: 11, color: "text.secondary" }}
                            noWrap
                          >
                            {formatWhen(reviewedAt)}
                          </Typography>
                        </Box>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell align="right" sx={cellSx}>
                      {pending && isAdmin ? (
                        <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                          <Button
                            variant="outlined"
                            color="success"
                            size="small"
                            disabled={Boolean(actionId)}
                            startIcon={
                              busy && actionType === "approve" ? (
                                <CircularProgress size={12} color="inherit" />
                              ) : (
                                <IconCheck size={14} />
                              )
                            }
                            onClick={() => runAction(item.request_id, "approve")}
                            sx={{
                              textTransform: "none",
                              fontWeight: 700,
                              minHeight: 28,
                              py: 0.25,
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            disabled={Boolean(actionId)}
                            startIcon={
                              busy && actionType === "reject" ? (
                                <CircularProgress size={12} color="inherit" />
                              ) : (
                                <IconX size={14} />
                              )
                            }
                            onClick={() => setRejectId(item.request_id)}
                            sx={{
                              textTransform: "none",
                              fontWeight: 700,
                              minHeight: 28,
                              py: 0.25,
                            }}
                          >
                            Reject
                          </Button>
                        </Stack>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <RejectReasonDialog
        open={Boolean(rejectId)}
        onClose={() => setRejectId(null)}
        onConfirm={(reason) => {
          if (rejectId) return runAction(rejectId, "reject", reason);
        }}
        title="Reject capacity request"
        message="Add a reason for rejecting this capacity change."
        loading={actionType === "reject"}
      />
    </Box>
  );
};

export default ProjectCapacityRequests;
