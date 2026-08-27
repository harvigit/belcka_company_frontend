"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Typography,
  Box,
  Grid,
  Button,
  IconButton,
  Drawer,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Stack,
  Chip,
  InputAdornment,
  Collapse,
} from "@mui/material";
import {
  IconX,
  IconArrowLeft,
  IconFilter,
  IconSearch,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import { format } from "date-fns";
import DateRangePickerBox from "../../common/DateRangePickerBox";
import CustomCheckbox from "../../forms/theme-elements/CustomCheckbox";

interface BookkeeperProps {
  open: boolean;
  onClose: () => void;
  userId?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

const ACTIVITY_FILTER_OPTIONS = [
  { value: "worklog", label: "Worklog", requestTypes: [102] },
  { value: "penalty", label: "Penalty", requestTypes: [118, 123] },
  { value: "expense", label: "Expense", requestTypes: [111] },
  { value: "leave", label: "Leave", requestTypes: [110] },
  { value: "pricework", label: "Pricework", requestTypes: [121] },
  { value: "adjustment", label: "Adjustment", requestTypes: [126] },
  { value: "billing_info", label: "Billing info", requestTypes: [103] },
  { value: "rate", label: "Rate", requestTypes: [105] },
  { value: "user", label: "Personal Info", requestTypes: [104] },
] as const;

const DiffView = ({ diffs }: { diffs: any[] }) => {
  const IGNORED_KEYS = [
    "id",
    "created_at",
    "updated_at",
    "deleted_at",
    "user_id",
    "company_id",
    "expired_at",
  ];
  const filteredDiffs = diffs.filter(
    (diff) => !IGNORED_KEYS.includes(diff.key),
  );
  const [open, setOpen] = useState(false);

  if (!filteredDiffs?.length) return null;

  return (
    <Box width="100%">
      <Box
        display="flex"
        alignItems="center"
        sx={{ cursor: "pointer", width: "fit-content" }}
        onClick={() => setOpen(!open)}
      >
        <Typography fontSize={12} color="primary" fontWeight={600}>
          {open ? "Hide Changes" : "View Changes"}
        </Typography>
      </Box>
      <Collapse in={open}>
        <Box
          mt={1}
          p={1.5}
          bgcolor="#f8fafc"
          borderRadius={2}
          border="1px solid #e2e8f0"
        >
          {filteredDiffs.map((diff: any, i: number) => (
            <Typography
              key={i}
              fontSize={11}
              color="text.secondary"
              mt={i > 0 ? 0.75 : 0}
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 0.5,
              }}
            >
              <Typography
                component="span"
                fontSize={11}
                fontWeight={600}
                sx={{ textTransform: "uppercase" }}
              >
                {diff.key.replace(/_/g, " ")}
              </Typography>
              {(!diff.old || diff.old === "") && diff.new && diff.new !== "" ? (
                <>
                  {" - added as "}
                  <Chip
                    size="small"
                    label={String(diff.new)}
                    sx={{
                      height: 18,
                      fontSize: 10,
                      bgcolor: "#E8F5E9",
                      color: "#2E7D32",
                      "& .MuiChip-label": { px: 1 },
                    }}
                  />
                </>
              ) : (
                <>
                  {" - changed from "}
                  <Chip
                    size="small"
                    label={String(diff.old || "none")}
                    sx={{
                      height: 18,
                      fontSize: 10,
                      bgcolor: "#E8F5E9",
                      color: "#2E7D32",
                      "& .MuiChip-label": { px: 1 },
                    }}
                  />
                  {" to "}
                  <Chip
                    size="small"
                    label={String(diff.new || "none")}
                    sx={{
                      height: 18,
                      fontSize: 10,
                      bgcolor: "#E8F5E9",
                      color: "#2E7D32",
                      "& .MuiChip-label": { px: 1 },
                    }}
                  />
                </>
              )}
            </Typography>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

const BookkeeperHistory: React.FC<BookkeeperProps> = ({
  open,
  onClose,
  userId,
  startDate,
  endDate,
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [draftSelectedTypes, setDraftSelectedTypes] = useState<string[]>([]);
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const limit = 50;
  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: number | null;
  };

  const [loading, setLoading] = useState(false);

  const rangeStart = filterStartDate ?? startDate ?? null;
  const rangeEnd = filterEndDate ?? endDate ?? null;

  useEffect(() => {
    if (!open) {
      setFilterStartDate(null);
      setFilterEndDate(null);
      return;
    }

    setFilterStartDate(startDate ?? null);
    setFilterEndDate(endDate ?? null);
  }, [open, startDate, endDate]);

  useEffect(() => {
    if (!open || !user?.company_id) {
      setHistory([]);
      setPage(1);
      setTotalItems(0);
      return;
    }

    const timer = setTimeout(() => {
      setHistory([]);
      setPage(1);
      setTotalItems(0);
      fetchHistories(1, selectedTypes, activitySearch);
    }, 350);

    return () => clearTimeout(timer);
  }, [
    open,
    user?.company_id,
    selectedTypes,
    activitySearch,
    userId,
    startDate,
    endDate,
    filterStartDate,
    filterEndDate,
  ]);

  const fetchHistories = async (
    currentPage: number,
    typeFilters = selectedTypes,
    searchValue = activitySearch,
  ) => {
    setLoading(true);

    try {
      const res = await api.get("time-clock/bookkeeper-history", {
        params: {
          company_id: user.company_id,
          page: currentPage,
          limit,
          ...(typeFilters.length > 0 ? { types: typeFilters.join(",") } : {}),
          ...(searchValue.trim() ? { search: searchValue.trim() } : {}),
          ...(userId ? { user_id: userId } : {}),
          ...(rangeStart && rangeEnd
            ? {
                start_date: format(rangeStart, "dd/MM/yyyy"),
                end_date: format(rangeEnd, "dd/MM/yyyy"),
              }
            : {}),
        },
      });

      if (res.data?.IsSuccess) {
        const newData = res.data.info || [];

        setHistory((prev) =>
          currentPage === 1 ? newData : [...prev, ...newData],
        );

        setTotalItems(res.data.data?.totalItems || 0);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeeMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistories(nextPage);
  };

  const visibleFilterOptions = useMemo(
    () =>
      ACTIVITY_FILTER_OPTIONS.filter((option) =>
        option.label.toLowerCase().includes(filterSearch.trim().toLowerCase()),
      ),
    [filterSearch],
  );

  const handleDraftTypeToggle = (value: string) => {
    setDraftSelectedTypes((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const handleFilterOpen = () => {
    setDraftSelectedTypes(selectedTypes);
    setFilterOpen(true);
  };

  const handleFilterClose = () => {
    setDraftSelectedTypes(selectedTypes);
    setFilterOpen(false);
  };

  const handleFilterApply = () => {
    setSelectedTypes(draftSelectedTypes);
    setFilterOpen(false);
  };

  const handleAppliedTypeDelete = (value: string) => {
    setSelectedTypes((prev) => prev.filter((item) => item !== value));
  };

  const hasMore = history.length < totalItems;

  return (
    <Box>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            borderRadius: 0,
            height: "95vh",
            boxShadow: "none",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            p: 3,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            bgcolor: "#f9fafb",
          }}
        >
          {/* Header */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Box display={"flex"} gap={3} alignItems="end">
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton onClick={onClose}>
                  <IconArrowLeft />
                </IconButton>
                <Typography variant="h6" fontWeight={600}>
                  Bookkeeper Activities
                </Typography>
              </Box>
              {/* Filters Row */}
              <Stack
                direction={{ xs: "column", md: "row" }}
                alignItems="center"
                spacing={2}
              >
                <TextField
                  placeholder="Search..."
                  size="small"
                  sx={{ width: { xs: "100%", md: 300 } }}
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconSearch size={16} />
                      </InputAdornment>
                    ),
                  }}
                />

                <DateRangePickerBox
                  from={filterStartDate}
                  to={filterEndDate}
                  onChange={({ from, to }) => {
                    setFilterStartDate(from);
                    setFilterEndDate(to);
                  }}
                />

                <Tooltip title="Filter activities" arrow>
                  <Button
                    variant={
                      selectedTypes.length > 0 ? "contained" : "outlined"
                    }
                    color={selectedTypes.length > 0 ? "primary" : "primary"}
                    onClick={handleFilterOpen}
                    startIcon={<IconFilter size={18} />}
                    sx={{ minWidth: 120, height: 40 }}
                  >
                    Filters{" "}
                    {selectedTypes.length > 0 && `(${selectedTypes.length})`}
                  </Button>
                </Tooltip>
              </Stack>
            </Box>
            <IconButton onClick={onClose}>
              <IconX size={20} />
            </IconButton>
          </Box>

          {selectedTypes.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
              {selectedTypes.map((type) => {
                const option = ACTIVITY_FILTER_OPTIONS.find(
                  (item) => item.value === type,
                );
                if (!option) return null;

                return (
                  <Chip
                    key={type}
                    label={option.label}
                    size="small"
                    onDelete={() => handleAppliedTypeDelete(type)}
                  />
                );
              })}
            </Stack>
          )}

          {/* Content Area */}
          <Box sx={{ flex: 1, overflowY: "auto", px: 1, pb: 2 }}>
            {loading && history.length === 0 ? (
              <Box display="flex" justifyContent="center" mt={4}>
                <CircularProgress />
              </Box>
            ) : history.length > 0 ? (
              <>
                <Grid container spacing={3} marginTop={2}>
                  {history.map((addr, index) => {
                    let color = "";
                    switch (addr.request_type) {
                      case 126:
                        color = "#0066ff";
                        break;
                      case 111:
                        color = "#A600FF";
                        break;
                      case 102:
                        color = "#FF7F00";
                        break;
                      case 121:
                        color = "#32A852";
                        break;
                      case 110:
                        color = "#949090";
                        break;
                      case 103:
                        color = "#4CBC6D";
                        break;
                      case 105:
                        color = "#f5c21bf8";
                        break;
                      case 104:
                        color = "#0066ff";
                        break;
                      default:
                        color = "#ff3737";
                    }

                    return (
                      <Grid size={{ xs: 12, sm: 6 }} key={addr.id ?? index}>
                        <Box
                          position="relative"
                          display="flex"
                          flexDirection="column"
                          p={2.5}
                          pt={3.5}
                          sx={{
                            width: "100%",
                            height: "fit-content",
                            borderRadius: "16px",
                            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
                            border: "1px solid #eaeaea",
                            background: "#fff",
                            transition: "transform 0.2s ease-in-out",
                          }}
                        >
                          <Box
                            position="absolute"
                            top="-12px"
                            left="20px"
                            bgcolor={color}
                            px={1.5}
                            py={0.5}
                            borderRadius="8px"
                            boxShadow={`0px 4px 10px ${color}40`}
                          >
                            <Typography
                              color="#fff"
                              fontSize={11}
                              fontWeight={700}
                              textTransform="uppercase"
                              letterSpacing={0.5}
                            >
                              {addr.type_name}
                            </Typography>
                          </Box>

                          <Box display="flex" flexDirection="column" flex={1}>
                            <Typography
                              fontSize="14px"
                              fontWeight={600}
                              sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {addr.user_name}:{" "}
                              <Tooltip
                                title={
                                  addr.request_type === 103 &&
                                  addr.message?.includes(
                                    "changed from [object Object]",
                                  )
                                    ? "Requested to update billing information"
                                    : addr.message
                                }
                                arrow
                              >
                                <Typography
                                  component="span"
                                  fontSize="14px"
                                  fontWeight={400}
                                  color="text.secondary"
                                >
                                  {addr.request_type === 103 &&
                                  addr.message?.includes(
                                    "changed from [object Object]",
                                  )
                                    ? "Requested to update billing information"
                                    : addr.message}
                                </Typography>
                              </Tooltip>
                            </Typography>

                            {addr.diff_data && addr.diff_data.length > 0 && (
                              <Box flex={1}>
                                <DiffView diffs={addr.diff_data} />
                              </Box>
                            )}

                            <Box
                              mt="auto"
                              display="flex"
                              justifyContent="flex-end"
                            >
                              <Typography
                                fontSize="12px"
                                color="text.secondary"
                                fontWeight={500}
                              >
                                {addr.date}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
                {hasMore && (
                  <Box display="flex" justifyContent="center" my={4}>
                    <Button
                      variant="outlined"
                      disabled={loading}
                      onClick={handleSeeMore}
                      startIcon={loading && <CircularProgress size={16} />}
                      sx={{ borderRadius: 2, px: 4 }}
                    >
                      Load More
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  opacity: 0.5,
                }}
              >
                <Typography variant="h6" color="text.secondary">
                  {selectedTypes.length > 0
                    ? "No activities found for selected filter."
                    : "No activities are found for bookkeeper!!"}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>

      <Dialog
        open={filterOpen}
        onClose={handleFilterClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: 1,
          }}
        >
          <Typography variant="h6" fontWeight={700} component="span">
            Filter Activities
          </Typography>
          <IconButton onClick={handleFilterClose} size="small">
            <IconX size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <FormGroup>
            {visibleFilterOptions.map((option) => (
              <FormControlLabel
                key={option.value}
                control={
                  <CustomCheckbox
                    checked={draftSelectedTypes.includes(option.value)}
                    onChange={() => handleDraftTypeToggle(option.value)}
                  />
                }
                label={option.label}
                sx={{
                  m: 0,
                  px: 1,
                  borderRadius: 1.5,
                  "&:hover": { backgroundColor: "#f8fafc" },
                }}
              />
            ))}
          </FormGroup>

          <Stack direction="row" justifyContent="space-between" mt={2}>
            <Button
              size="small"
              disabled={draftSelectedTypes.length === 0}
              onClick={() => {
                setSelectedTypes([]);
                setDraftSelectedTypes([]);
                setFilterOpen(false);
              }}
            >
              Clear
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleFilterApply}
            >
              Apply
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default BookkeeperHistory;
