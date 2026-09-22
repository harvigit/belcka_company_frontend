"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Avatar,
  CircularProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  IconButton,
  DialogContent,
  DialogActions,
  Autocomplete,
  TextField,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from "@mui/material";
import {
  IconUsers,
  IconShoppingCart,
  IconClock,
  IconAlertCircle,
  IconEye,
  IconCoinRupee,
  IconUsersPlus,
  IconFilter,
  IconX,
  IconReceipt,
} from "@tabler/icons-react";
import { Stack } from "@mui/system";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import DiffChanges from "@/app/components/common/DiffChanges";
import { fallbackDiffsFromPayload } from "@/utils/diffDisplay";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Actor {
  id: number;
  name: string;
  image: string | null;
}

interface ActivityItem {
  id: number;
  title: string;
  module: string;
  record_id: number | null;
  note: string | null;
  old_data?: any;
  new_data?: any;
  date_of_action: string;
  created_at: string;
  date?: string;
  time: string;
  company: { id: number; name: string; image: string | null } | null;
  added_by: Actor | null;
  edited_by: Actor | null;
  deleted_by?: Actor | null;
  diffs?: { key: string; old: any; new: any }[];
}

type ActorRole =
  | "added by"
  | "edited by"
  | "requested by"
  | "approved by"
  | "rejected by";

type UserFilters = {
  status: string[];
  type: string[];
};

const getActivityActor = (
  item: ActivityItem,
): { actor: Actor | null; role: ActorRole } => {
  const title = (item.title || "").toLowerCase();
  const isApproved = /approved by|has been approved|\bis approved\b/.test(
    title,
  );
  const isRejected = /rejected by|has been rejected|\bis rejected\b/.test(
    title,
  );
  const isRequested = /^requested\b|requested to\b/.test(title);

  if (isRejected) {
    return {
      actor: item.deleted_by || item.edited_by || item.added_by,
      role: "rejected by",
    };
  }

  if (isApproved) {
    return {
      actor: item.added_by || item.edited_by,
      role: "approved by",
    };
  }

  if (isRequested) {
    return {
      actor: item.edited_by || item.added_by,
      role: "requested by",
    };
  }

  if (item.edited_by) {
    return { actor: item.edited_by, role: "edited by" };
  }

  if (item.added_by) {
    return { actor: item.added_by, role: "added by" };
  }

  return { actor: null, role: "added by" };
};

interface ActivityGroup {
  label: string;
  date: string;
  items: ActivityItem[];
}

interface ActivityInfo {
  total: number;
  activities: ActivityItem[] | ActivityGroup[];
  start?: string | null;
  end?: string | null;
}

interface UserActivityProps {
  companyId: number;
  userId: number;
  active: boolean;
  isRemoveUser?: boolean;
  isArchivedUser?: boolean;
}

// ─── Module config ────────────────────────────────────────────────────────────

type ModuleCfg = {
  label: string;
  icon: React.ElementType;
  chipBg: string;
  chipColor: string;
  chipBorder: string;
  dotBg: string;
  dotColor: string;
};

const MODULE_CONFIG: Record<string, ModuleCfg> = {
  users: {
    label: "User",
    icon: IconUsers,
    chipBg: "#EEF2FF",
    chipColor: "#4338CA",
    chipBorder: "#C7D2FE",
    dotBg: "#EEF2FF",
    dotColor: "#4338CA",
  },
  user_companies: {
    label: "Rate",
    icon: IconCoinRupee,
    chipBg: "#EEF2FF",
    chipColor: "#125018ff",
    chipBorder: "#cbfec7ff",
    dotBg: "#EEF2FF",
    dotColor: "#125018ff",
  },
  employee_orders: {
    label: "Orders",
    icon: IconShoppingCart,
    chipBg: "#FFF7ED",
    chipColor: "#C2410C",
    chipBorder: "#FED7AA",
    dotBg: "#FFF7ED",
    dotColor: "#C2410C",
  },
  user_worklogs: {
    label: "Worklogs",
    icon: IconClock,
    chipBg: "#F0FDF4",
    chipColor: "#15803D",
    chipBorder: "#BBF7D0",
    dotBg: "#F0FDF4",
    dotColor: "#15803D",
  },
  teams: {
    label: "Team",
    icon: IconUsersPlus,
    chipBg: "#F0FDF4",
    chipColor: "#9333EA",
    chipBorder: "#E9D5FF",
    dotBg: "#FDF4FF",
    dotColor: "#9333EA",
  },
  billing_infos: {
    label: "Billing Info",
    icon: IconReceipt,
    chipBg: "#f4fff7ff",
    chipColor: "#2E7D32",
    chipBorder: "#d5ffdeff",
    dotBg: "#f4fff4ff",
    dotColor: "#2E7D32",
  },
};

const FALLBACK_MODULE: ModuleCfg = {
  label: "Activity",
  icon: IconEye,
  chipBg: "#F1F5F9",
  chipColor: "#475569",
  chipBorder: "#CBD5E1",
  dotBg: "#F1F5F9",
  dotColor: "#475569",
};

// ─── Helpers ──────────────────────────────────────────────────────────────

const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const flattenActivities = (
  activities?: ActivityItem[] | ActivityGroup[] | null,
): ActivityItem[] => {
  if (!Array.isArray(activities) || activities.length === 0) return [];
  if ("items" in (activities[0] as ActivityGroup)) {
    return (activities as ActivityGroup[]).flatMap(
      (group) => group.items || [],
    );
  }
  return activities as ActivityItem[];
};

const activityTableSx = {
  minWidth: 720,
  "& .MuiTableCell-root": {
    fontSize: 12,
    py: 1,
    px: { xs: 1, md: 1.25 },
    borderColor: "#EEF2F7",
    verticalAlign: "top",
  },
  "& .MuiTableCell-head": {
    fontWeight: 700,
    color: "text.secondary",
    fontSize: 11,
    letterSpacing: 0.3,
    bgcolor: "#F8FAFC",
    whiteSpace: "nowrap",
    zIndex: 3,
  },
};

const ActorCell: React.FC<{ actor: Actor; role: ActorRole }> = ({
  actor,
  role,
}) => {
  const isEdit = role === "edited by";
  const isRequested = role === "requested by";
  const isApproved = role === "approved by";
  const isRejected = role === "rejected by";
  return (
    <Box display="flex" alignItems="center" gap={0.75} minWidth={0}>
      <Avatar
        sx={{
          width: 22,
          height: 22,
          fontSize: 9,
          fontWeight: 600,
          flexShrink: 0,
          bgcolor: isRejected
            ? "#FEE2E2"
            : isApproved
              ? "#DCFCE7"
              : isRequested || isEdit
                ? "#FEF9C3"
                : "#DBEAFE",
          color: isRejected
            ? "#991B1B"
            : isApproved
              ? "#166534"
              : isRequested || isEdit
                ? "#92400E"
                : "#1E40AF",
        }}
      >
        {getInitials(actor.name)}
      </Avatar>
      <Box minWidth={0}>
        <Typography fontSize={11} color="text.disabled" noWrap>
          {role}
        </Typography>
        <Typography
          fontSize={12}
          color="text.secondary"
          fontWeight={500}
          noWrap
        >
          {actor.name}
        </Typography>
      </Box>
    </Box>
  );
};

const TypeChip: React.FC<{ module: string }> = ({ module }) => {
  const { t } = useTranslation();
  const mc = MODULE_CONFIG[module] ?? FALLBACK_MODULE;
  return (
    <Chip
      label={t(mc.label)}
      size="small"
      sx={{
        height: 18,
        fontSize: 10,
        fontWeight: 600,
        bgcolor: mc.chipBg,
        color: mc.chipColor,
        border: `0.5px solid ${mc.chipBorder}`,
        borderRadius: "4px",
        letterSpacing: 0.2,
      }}
    />
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="60%"
      gap={1.5}
      minHeight={300}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconAlertCircle size={24} color="#94a3b8" />
      </Box>
      <Typography fontWeight={600} fontSize={14} color="text.secondary">
        {t("No activity found")}
      </Typography>
    </Box>
  );
};

const DEFAULT_USER_FILTERS: UserFilters = {
  type: [],
  status: [],
};

// ─── Main Component ───────────────────────────────────────────────────────────
const UserActivity: React.FC<UserActivityProps> = ({
  companyId,
  userId,
  active,
  isRemoveUser = false,
  isArchivedUser = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<ActivityInfo | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  const [filters, setFilters] = useState<UserFilters>(DEFAULT_USER_FILTERS);
  const [tempFilters, setTempFilters] = useState(filters);
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const status = [
    { id: "Pending Approval", name: "Pending Approval" },
    { id: "Approved", name: "Approved" },
    { id: "Rejected", name: "Rejected" },
  ];
  const types = [
    { id: "User", name: "Personal Info" },
    { id: "Billing info", name: "Billing info" },
    { id: "Company Rate", name: "Company Rate" },
    { id: "Team", name: "Team" },
    // { id: "Penalty", name: "Penalty" }
  ];

  const fetchActivity = useCallback(async () => {
    if (!userId || !companyId) return;
    setLoading(true);
    try {
      const res = await api.get("user/get-activity", {
        params: {
          user_id: Number(userId),
          company_id: Number(companyId),
          page: page + 1,
          limit: rowsPerPage,
          get_diffs: 1,
          ...(filters.type.length > 0 ? { types: filters.type.join(",") } : {}),
          ...(filters.status.length > 0
            ? { statuses: filters.status.join(",") }
            : {}),
          ...(isRemoveUser ? { is_remove_user: 1 } : {}),
          ...(isArchivedUser ? { is_archived_user: 1 } : {}),
        },
      });
      if (res.data?.IsSuccess) {
        setInfo(res.data.info ?? null);
        setTotalItems(
          Number(res.data?.data?.totalItems ?? res.data?.info?.total ?? 0),
        );
      } else {
        toast.error(res.data?.message || "Failed to load activity");
      }
    } catch {
      toast.error("Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [
    userId,
    companyId,
    isRemoveUser,
    isArchivedUser,
    filters,
    page,
    rowsPerPage,
  ]);

  useEffect(() => {
    if (!userId || !active) return;
    fetchActivity();
  }, [active, userId, fetchActivity]);

  const rows = flattenActivities(info?.activities);
  const total = totalItems || info?.total || 0;

  const handleFilterValueChange = (key: keyof UserFilters, value: string[]) => {
    setTempFilters((prev) => ({
      ...prev,
      [key]: value.map(String).filter(Boolean),
    }));
  };

  const normalizeUserFilters = (
    filters?: Partial<Record<keyof UserFilters, string | string[]>>,
  ): UserFilters => {
    const normalizeValue = (value?: string | string[]) => {
      const values = Array.isArray(value) ? value : value ? [value] : [];
      return values.filter((item) => item && item !== "All");
    };

    return {
      type: normalizeValue(filters?.type),
      status: normalizeValue(filters?.status),
    };
  };

  const renderFilterSelect = (
    label: string,
    key: keyof UserFilters,
    options: any[],
    showAvatar = false,
  ) => {
    const value = tempFilters[key];
    const selectedOptions = options.filter((option) =>
      value.includes(String(option.id)),
    );
    const allSelected =
      options.length > 0 &&
      options.every((option) => value.includes(String(option.id)));

    return (
      <Stack
        direction="row"
        spacing={0}
        alignItems="stretch"
        sx={{ width: "100%", minWidth: 0 }}
      >
        <Autocomplete
          multiple
          disableCloseOnSelect
          options={options}
          value={selectedOptions}
          getOptionLabel={(option) =>
            option.user_code
              ? `${option.name} (${option.user_code})`
              : option.name
          }
          isOptionEqualToValue={(option, selectedOption) =>
            String(option.id) === String(selectedOption.id)
          }
          filterOptions={(list, state) => {
            const query = state.inputValue.trim().toLowerCase();
            if (!query) return list;

            return list.filter((option) =>
              `${option.name} ${option.user_code ?? ""}`
                .toLowerCase()
                .includes(query),
            );
          }}
          onChange={(_, selected) => {
            handleFilterValueChange(
              key,
              selected.map((option) => String(option.id)),
            );
          }}
          renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => {
              const { key: chipKey, ...tagProps } = getTagProps({ index });

              return (
                <Chip
                  key={chipKey}
                  label={option.name}
                  color="primary"
                  size="small"
                  {...tagProps}
                  sx={{
                    borderRadius: "4px",
                    fontSize: "0.9rem",
                    height: 32,
                    "& .MuiChip-deleteIcon": {
                      color: "rgba(255,255,255,0.85)",
                      "&:hover": { color: "#fff" },
                    },
                  }}
                />
              );
            })
          }
          renderOption={(props, option, { selected }) => {
            const { key: optionKey, ...optionProps } = props;

            return (
              <Box
                component="li"
                key={optionKey}
                {...optionProps}
                sx={{
                  color: selected ? "#fff" : "inherit",
                  bgcolor: selected ? "#0b57d0 !important" : "transparent",
                  "&.Mui-focused": {
                    bgcolor: selected ? "#0b57d0 !important" : "#f5f5f5",
                  },
                }}
              >
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1.5}
                  minWidth={0}
                  width="100%"
                >
                  {showAvatar && (
                    <Avatar
                      src={
                        option.user_thumb_image ||
                        option.user_image ||
                        undefined
                      }
                      alt={option.name}
                      sx={{ width: 32, height: 32, fontSize: "14px" }}
                    >
                      {option.name?.[0]?.toUpperCase()}
                    </Avatar>
                  )}
                  <Typography
                    component="span"
                    variant="body1"
                    className="f-14"
                    sx={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {option.name}
                    {option.user_code ? ` (${option.user_code})` : ""}
                  </Typography>
                  {selected && (
                    <Typography
                      component="span"
                      sx={{ fontSize: 22, lineHeight: 1 }}
                    >
                      ✓
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          }}
          noOptionsText={t("filter.noOptionsFound", {
            label: label.toLowerCase(),
          })}
          slotProps={{
            paper: {
              sx: {
                mt: 1,
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              },
            },
            listbox: {
              sx: {
                maxHeight: 360,
                py: 0,
                "& .MuiAutocomplete-option": {
                  minHeight: 54,
                  fontSize: "1rem",
                },
              },
            },
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={selectedOptions.length ? "" : label}
              size="small"
            />
          )}
          sx={{
            flex: 1,
            minWidth: 0,
            "& .MuiOutlinedInput-root": {
              minHeight: 56,
              alignItems: "center",
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              "& fieldset": { borderColor: "#e0e0e0" },
              "&:hover fieldset": { borderColor: "#0d5ef4" },
              "&.Mui-focused fieldset": { borderColor: "#0d5ef4" },
            },
          }}
        />
        <Box
          onClick={() => {
            const allOptionValues = options.map((option) => String(option.id));
            handleFilterValueChange(key, allSelected ? [] : allOptionValues);
          }}
          sx={{
            width: { xs: 100, sm: 110 },
            minHeight: 56,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2,
            border: "1px solid",
            borderColor:
              allSelected || value.length > 0 ? "#0d5ef4" : "#e0e0e0",
            borderLeft: 0,
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            borderTopRightRadius: "6px",
            borderBottomRightRadius: "6px",
            cursor: "pointer",
            color: "#6b687d",
            userSelect: "none",
            transition: "border-color 150ms ease",
            "&:hover": {
              borderColor: "#0d5ef4",
            },
          }}
        >
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && value.length > 0}
            size="small"
            sx={{
              p: 0,
              pointerEvents: "none",
            }}
          />
          <Typography component="span" variant="body1">
            {t("All")}
          </Typography>
        </Box>
      </Stack>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "80vh",
        overflow: "hidden",
      }}
    >
      {/* ── Top bar ── */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          pt: 0,
          bgcolor: "background.paper",
          borderBottom: "0.5px solid",
          borderColor: "divider",
          flexShrink: 0,
          display: "flex",
          justifyContent: "end",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Button
          variant="contained"
          onClick={() => {
            setTempFilters(filters);
            setOpen(true);
          }}
          sx={{ mt: { xs: 1, sm: 0 }, ml: 1, minWidth: "40px", px: 1 }}
        >
          <IconFilter width={18} />
        </Button>
      </Box>

      {/* filters */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            width: { xs: "calc(100vw - 24px)", sm: "100%" },
            maxWidth: 600,
            m: { xs: 1.5, sm: 4 },
            overflow: "visible",
          },
        }}
      >
        <DialogTitle sx={{ m: 0, position: "relative", overflow: "visible" }}>
          {t("Filters")}
          <IconButton
            aria-label="close"
            onClick={() => setOpen(false)}
            size="large"
            sx={{
              position: "absolute",
              right: 12,
              top: 8,
              color: (theme) => theme.palette.grey[900],
              backgroundColor: "transparent",
              zIndex: 10,
              width: 50,
              height: 50,
            }}
          >
            <IconX size={40} style={{ width: 40, height: 40 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ overflowX: "hidden" }}>
          <Stack spacing={2} mt={1} sx={{ width: "100%", minWidth: 0 }}>
            {renderFilterSelect(t("Statuses"), "status", status)}
            {renderFilterSelect(t("Types"), "type", types)}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setTempFilters(DEFAULT_USER_FILTERS);
              setFilters(DEFAULT_USER_FILTERS);
              setPage(0);
              setOpen(false);
            }}
            color="inherit"
          >
            {t("Clear")}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setFilters(normalizeUserFilters(tempFilters));
              setPage(0);
              setOpen(false);
            }}
          >
            {t("Apply")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Body ── */}
      <Box
        sx={{
          p: 2,
          flex: 1,
          height: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {loading && rows.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={300}
            flex={1}
          >
            <CircularProgress size={30} thickness={4} />
          </Box>
        ) : total === 0 ? (
          <EmptyState />
        ) : (
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
                aria-label="user activity"
                sx={activityTableSx}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Message</TableCell>
                    <TableCell sx={{ width: 130 }}>Type</TableCell>
                    <TableCell sx={{ width: 180 }}>By</TableCell>
                    <TableCell sx={{ width: 150 }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((item) => {
                    const { actor, role } = getActivityActor(item);
                    const diffs = Array.isArray(item.diffs)
                      ? item.diffs
                      : fallbackDiffsFromPayload(item.old_data, item.new_data);
                    return (
                      <TableRow key={item.id}>
                        <TableCell
                          sx={{
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                          }}
                        >
                          <Box
                            display="flex"
                            alignItems="flex-start"
                            justifyContent="space-between"
                            gap={1}
                          >
                            <Box minWidth={0} flex={1}>
                              <Typography
                                fontSize={13}
                                color="text.primary"
                                lineHeight={1.5}
                              >
                                {item.title}
                              </Typography>
                              {item.note && (
                                <Typography
                                  fontSize={12}
                                  color="text.secondary"
                                  mt={0.5}
                                  fontWeight={500}
                                >
                                  NOTE : {item.note}
                                </Typography>
                              )}
                            </Box>
                            <DiffChanges diffs={diffs} variant="icon" />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <TypeChip module={item.module} />
                        </TableCell>
                        <TableCell>
                          {actor ? (
                            <ActorCell actor={actor} role={role} />
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {item.date ? `${item.date} ${item.time}` : item.time}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>No activities found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
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
                overflow: "visible",
                bgcolor: "background.paper",
                ".MuiTablePagination-toolbar": {
                  flexWrap: "wrap",
                  minHeight: 52,
                },
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default UserActivity;
