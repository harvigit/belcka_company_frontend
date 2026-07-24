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
    Chip, InputAdornment,
} from '@mui/material';
import {IconX, IconArrowLeft, IconFilter, IconSearch} from '@tabler/icons-react';
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";

interface BookkeeperProps {
  open: boolean;
  onClose: () => void;
}

const ACTIVITY_FILTER_OPTIONS = [
  { value: "worklog", label: "Worklog", requestTypes: [102] },
  { value: "penalty", label: "Penalty", requestTypes: [118, 123] },
  { value: "expense", label: "Expense", requestTypes: [111] },
  { value: "leave", label: "Leave", requestTypes: [110] },
  { value: "pricework", label: "Pricework", requestTypes: [121] },
] as const;

const BookkeeperHistory: React.FC<BookkeeperProps> = ({ open, onClose }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [draftSelectedTypes, setDraftSelectedTypes] = useState<string[]>([]);

  const limit = 20;
  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: number | null;
  };

  const [loading, setLoading] = useState(false);

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
  }, [open, user?.company_id, selectedTypes, activitySearch]);

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
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: 500,
            maxWidth: "100%",
            "& .MuiDrawer-paper": {
              width: 500,
              padding: 2,
              backgroundColor: "#f9f9f9",
            },
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            p: 2,
          }}
        >
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 0,
              top: 8,
            }}
          >
            <IconX size={18} />
          </IconButton>

          <Grid container spacing={2} display="block">
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center">
                <IconButton onClick={onClose}>
                  <IconArrowLeft />
                </IconButton>

                <Typography variant="h6" fontWeight={700}>
                  Bookkeeper Activities
                </Typography>
              </Box>
            </Box>

            <Stack direction="row" alignItems="center" spacing={1} mt={2}>
                <TextField
                    placeholder="Search..."
                    size="small"
                    fullWidth
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconSearch size={16}/>
                            </InputAdornment>
                        ),
                    }}
                />

              <Tooltip title="Filter activities" arrow>
                <IconButton
                  color={selectedTypes.length > 0 ? "primary" : "default"}
                  onClick={handleFilterOpen}
                >
                  <IconFilter size={20} />
                </IconButton>
              </Tooltip>
            </Stack>

            {selectedTypes.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={1} mt={1}>
                {selectedTypes.map((type) => {
                  const option = ACTIVITY_FILTER_OPTIONS.find((item) => item.value === type);
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

            {loading && history.length === 0 ? (
              <Box display="flex" justifyContent="center" mt={4}>
                <CircularProgress />
              </Box>
            ) : history.length > 0 ? (
              <Box mt={1}>
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

                    default:
                      color = "#ff3737";
                  }

                  return (
                    <Box
                      key={addr.id ?? index}
                      mt={2}
                      p={2}
                      position="relative"
                      display="flex"
                      alignItems="center"
                      sx={{
                        width: "100%",
                        height: "100px",
                        borderRadius: "25px",
                        boxShadow: "rgb(33 33 33 / 12%) 0px 4px 4px 0px",
                        border: "1px solid rgb(240 240 240)",
                        background: "#fff",
                      }}
                    >
                      <Box
                        position="absolute"
                        top="-10px"
                        left="15px"
                        bgcolor={color}
                        px={1.5}
                        borderRadius="10px"
                      >
                        <Typography color="#fff" fontSize={12} fontWeight={700}>
                          {addr.type_name}
                        </Typography>
                      </Box>

                      <Box width="100%" textAlign="start">
                        <Typography fontSize="14px" className="multi-ellipsis">
                          <b>{addr.user_name}:</b>{" "}
                          <Tooltip title={addr.message} arrow>
                            <span>{addr.message}</span>
                          </Tooltip>
                        </Typography>

                        <Typography
                          fontSize="12px"
                          textAlign="end"
                          color="gray"
                        >
                          {addr.date}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}

                {hasMore && (
                  <Box display="flex" justifyContent="center" my={2}>
                    <Button
                      variant="outlined"
                      disabled={loading}
                      onClick={handleSeeMore}
                      startIcon={loading && <CircularProgress size={16} />}
                    >
                      See More
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <Box mt={3} ml={2}>
                <Typography variant="h5">
                  {selectedTypes.length > 0
                    ? "No activities found for selected filter."
                    : "No activities are found for bookkeeper!!"}
                </Typography>

                {hasMore && (
                  <Box display="flex" justifyContent="center" my={2}>
                    <Button
                      variant="outlined"
                      disabled={loading}
                      onClick={handleSeeMore}
                      startIcon={loading && <CircularProgress size={16} />}
                    >
                      See More
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </Grid>
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
          <Typography variant="h6" fontWeight={700}>
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
                  <Checkbox
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
              onClick={() => setDraftSelectedTypes([])}
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
