"use client";
import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Grid,
  Button,
  IconButton,
  Drawer,
  CircularProgress,
  Tooltip,
  Stack,
  Divider,
  Chip,
  Paper,
  Avatar,
} from "@mui/material";
import {
  IconX,
  IconArrowLeft,
  IconClock,
  IconCurrencyDollar,
  IconUser,
  IconMessage,
  IconTimeline,
  IconNotes,
  IconCalendarEvent,
  IconCheck,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import { format, parse } from "date-fns";
import { useRouter } from "next/navigation";

interface PenaltyProps {
  open: boolean;
  onClose: () => void;
}

const PenaltyHistory: React.FC<PenaltyProps> = ({ open, onClose }) => {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedPenalty, setSelectedPenalty] = useState<any | null>(null);
  const [penaltyDetail, setPenaltyDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - today.getDay() + 1);
  const defaultEnd = new Date(today);
  defaultEnd.setDate(today.getDate() - today.getDay() + 7);

  const [startDate, setStartDate] = useState<Date | null>(defaultStart);
  const [endDate, setEndDate] = useState<Date | null>(defaultEnd);

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
      fetchHistories(1, startDate, endDate);
    }, 350);

    return () => clearTimeout(timer);
  }, [open, user?.company_id, startDate, endDate]);

  useEffect(() => {
    if (selectedPenalty?.id) {
      fetchPenaltyDetail(selectedPenalty.record_id);
    } else {
      setPenaltyDetail(null);
    }
  }, [selectedPenalty]);

  const fetchPenaltyDetail = async (penaltyId: string | number) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(
        `time-clock/penalty-details?penalty_id=${penaltyId}`,
      );
      if (res.data) {
        setPenaltyDetail(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch penalty detail", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetchHistories = async (
    currentPage: number,
    start = startDate,
    end = endDate,
  ) => {
    setLoading(true);

    try {
      const payload = {
        company_id: user.company_id,
        filters: { types: "118" },
        page: currentPage,
        limit,
        ...(start ? { start_date: format(start, "dd/MM/yyyy") } : {}),
        ...(end ? { end_date: format(end, "dd/MM/yyyy") } : {}),
      };
      const res = await api.post("requests/get-all-request", payload);

      if (res.data?.IsSuccess) {
        const newData = res.data.requests || [];

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

  const handlePenaltyClick = (addr: any) => {
    setSelectedPenalty(addr);
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
          <Grid container spacing={2} display="block">
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box display="flex" alignItems="center">
                <IconButton onClick={onClose}>
                  <IconArrowLeft />
                </IconButton>

                <Typography variant="h6" fontWeight={700}>
                  Penalty Activities
                </Typography>
              </Box>
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
            </Box>

            <Stack direction="row" alignItems="center" spacing={1} mt={1}>
              <DateRangePickerBox
                from={startDate}
                to={endDate}
                onChange={(range) => {
                  setStartDate(range.from);
                  setEndDate(range.to);
                }}
              />
            </Stack>

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
                      onClick={() => handlePenaltyClick(addr)}
                      sx={{
                        width: "100%",
                        height: "100px",
                        borderRadius: "25px",
                        boxShadow: "rgb(33 33 33 / 12%) 0px 4px 4px 0px",
                        border: "1px solid rgb(240 240 240)",
                        background: "#fff",
                        cursor: "pointer",
                        transition: "0.2s",
                        "&:hover": {
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          transform: "translateY(-1px)",
                        },
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
                  No activities are found for penalty!!
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

      {/* Penalty Detail Drawer */}
      <Drawer
        anchor="right"
        open={!!selectedPenalty}
        onClose={() => setSelectedPenalty(null)}
        PaperProps={{
          sx: {
            width: 500,
            maxWidth: "100%",
            p: 3,
            backgroundColor: "#fff",
          },
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Box display="flex" alignItems="center">
            <IconButton onClick={() => setSelectedPenalty(null)}>
              <IconArrowLeft />
            </IconButton>
            <Typography variant="h6" fontWeight={700}>
              Penalty Detail
            </Typography>
          </Box>
          <IconButton onClick={() => setSelectedPenalty(null)}>
            <IconX size={18} />
          </IconButton>
        </Box>

        {selectedPenalty && (
          <Box>
            {/* Header section */}
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Avatar
                src={selectedPenalty.user_image}
                sx={{ width: 56, height: 56 }}
              ></Avatar>
              <Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6" fontWeight={600} lineHeight={1.2}>
                    {selectedPenalty.user_name}
                  </Typography>
                  <Chip
                    label={
                      penaltyDetail?.penalty_type ||
                      selectedPenalty.type_name ||
                      "Penalty"
                    }
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ height: 20, fontSize: "0.75rem", fontWeight: 600 }}
                  />
                </Box>
                <Typography variant="body2" color="textSecondary" mt={0.5}>
                  {selectedPenalty.date}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Basic Info from History */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                bgcolor: "grey.50",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "grey.200",
              }}
            >
              <Typography
                variant="subtitle2"
                color="primary"
                fontWeight={600}
                mb={2}
                display="flex"
                alignItems="center"
                gap={1}
              >
                <IconMessage size={18} /> General Request Info
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    display="block"
                  >
                    Message
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {selectedPenalty.message}
                  </Typography>
                </Grid>

                {selectedPenalty.status_text && (
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      display="block"
                    >
                      Status
                    </Typography>
                    <Chip
                      label={selectedPenalty.status_text}
                      size="small"
                      color={
                        selectedPenalty.status_text
                          .toLowerCase()
                          .includes("approve")
                          ? "success"
                          : selectedPenalty.status_text
                                .toLowerCase()
                                .includes("reject")
                            ? "error"
                            : "warning"
                      }
                      sx={{ mt: 0.5, fontWeight: 500 }}
                    />
                  </Grid>
                )}

                {selectedPenalty.action_by && (
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      display="block"
                    >
                      Action By
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedPenalty.action_by}
                    </Typography>
                  </Grid>
                )}

                {selectedPenalty.note && (
                  <Grid size={{ xs: 12 }}>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      display="block"
                    >
                      Note
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                      &quot;{selectedPenalty.note}&quot;
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {loadingDetail ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height={200}
              >
                <CircularProgress size={32} />
              </Box>
            ) : penaltyDetail ? (
              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  mb={2}
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <IconTimeline size={20} /> Time & Penalty Details
                </Typography>

                <Grid container spacing={2} mb={3}>
                  <Grid size={{ xs: 4 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        bgcolor: "#f0f4f8",
                        borderRadius: 2,
                        height: "100%",
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        display="flex"
                        alignItems="center"
                        gap={0.5}
                      >
                        <IconCalendarEvent size={14} /> Start Time
                      </Typography>
                      <Typography variant="body2" fontWeight={600} mt={0.5}>
                        {penaltyDetail.start_time || "--"}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        bgcolor: "#f0f4f8",
                        borderRadius: 2,
                        height: "100%",
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        display="flex"
                        alignItems="center"
                        gap={0.5}
                      >
                        <IconCalendarEvent size={14} /> End Time
                      </Typography>
                      <Typography variant="body2" fontWeight={600} mt={0.5}>
                        {penaltyDetail.end_time || "--"}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        bgcolor: "#ffebee",
                        borderRadius: 2,
                        height: "100%",
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="error.dark"
                        display="flex"
                        alignItems="center"
                        gap={0.5}
                      >
                        <IconCurrencyDollar size={14} /> Penalty Amount
                      </Typography>
                      <Typography variant="body2" fontWeight={600} mt={0.5}>
                        {penaltyDetail.penalty_amount ?? "--"}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {(penaltyDetail.admin_note ||
                  penaltyDetail.appeal_note ||
                  penaltyDetail.approved_by_name ||
                  penaltyDetail.rejected_by_name) && (
                  <>
                    <Divider sx={{ mb: 3 }} />
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      mb={2}
                      display="flex"
                      alignItems="center"
                      gap={1}
                    >
                      <IconNotes size={20} /> Additional Notes & Approvals
                    </Typography>

                    <Stack spacing={2}>
                      {penaltyDetail.admin_note && (
                        <Box
                          pl={2}
                          borderLeft="3px solid"
                          borderColor="primary.main"
                        >
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            fontWeight={600}
                          >
                            Admin Note
                          </Typography>
                          <Tooltip title={penaltyDetail.admin_note}>
                            <Typography
                              variant="body2"
                              sx={{
                                display: "-webkit-box",
                                WebkitBoxOrient: "vertical",
                                WebkitLineClamp: 3,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                wordBreak: "break-word",
                                width: "100%",
                                borderRadius: 1,
                                border: "1px solid transparent",
                                transition: "all 0.2s ease",
                                px: 0.5,
                              }}
                            >
                              {penaltyDetail.admin_note}
                            </Typography>
                          </Tooltip>
                        </Box>
                      )}

                      {penaltyDetail.appeal_note && (
                        <Box
                          pl={2}
                          borderLeft="3px solid"
                          borderColor="secondary.main"
                        >
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            fontWeight={600}
                          >
                            Appeal Note
                          </Typography>
                          <Tooltip title={penaltyDetail.appeal_note ?? ""}>
                            <Typography
                              variant="body2"
                              sx={{
                                display: "-webkit-box",
                                WebkitBoxOrient: "vertical",
                                WebkitLineClamp: 3,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                wordBreak: "break-word",
                                width: "100%",
                                borderRadius: 1,
                                border: "1px solid transparent",
                                transition: "all 0.2s ease",
                                px: 0.5,
                              }}
                            >
                              {penaltyDetail.appeal_note}
                            </Typography>
                          </Tooltip>
                        </Box>
                      )}

                      {penaltyDetail.approved_by_name &&
                        selectedPenalty?.status == 5 && (
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                            color="success.main"
                          >
                            <IconCheck size={18} />
                            <Typography variant="body2">
                              Approved by{" "}
                              <b>{penaltyDetail.approved_by_name}</b>{" "}
                              {penaltyDetail.approved_at
                                ? `on ${penaltyDetail.approved_at}`
                                : ""}
                            </Typography>
                          </Box>
                        )}

                      {penaltyDetail.rejected_by_name &&
                        selectedPenalty?.status == 12 && (
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                            color="error.main"
                          >
                            <IconX size={18} />
                            <Typography variant="body2">
                              Rejected by{" "}
                              <b>{penaltyDetail.rejected_by_name}</b>{" "}
                              {penaltyDetail.rejected_at
                                ? `on ${penaltyDetail.rejected_at}`
                                : ""}
                            </Typography>
                          </Box>
                        )}
                    </Stack>
                  </>
                )}
              </Box>
            ) : null}
          </Box>
        )}
      </Drawer>
    </Box>
  );
};

export default PenaltyHistory;
