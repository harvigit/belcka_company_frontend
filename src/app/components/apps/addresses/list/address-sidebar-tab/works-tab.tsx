"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Badge,
  Drawer,
  Skeleton,
} from "@mui/material";
import { Stack } from "@mui/system";
import {
  IconChevronRight,
  IconFilter,
  IconPaperclip,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import WorkDetailPage from "@/app/components/works";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { format } from "date-fns";
import ChecklogDetailPage from "../../../time-clock/time-clock-details/checklogs/checklog-details";
import AddPricework from "../../../time-clock/time-clock-details/pricework/add-pricework";
import PriceworkDetails from "../../../time-clock/time-clock-details/pricework/pricework-details";

interface WorksTabProps {
  addressId: number;
  companyId: number;
  currency?: string | null;
  checkinStartDate?: Date | null;
  checkinEndDate?: Date | null;
}

type FilterState = {
  type: string;
};

export const WorksTab = ({
  addressId,
  companyId,
  currency,
  checkinStartDate = null,
  checkinEndDate = null,
}: WorksTabProps) => {
  const [tabData, setTabData] = useState<any[]>([]);
  const [searchWork, setSearchWork] = useState<string>("");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number>(0);
  const [open, setOpen] = useState<boolean>(false);
  const [filterOptions, setFilterOptions] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterState>({ type: "" });
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);
  const [openSidebar, setOpenSidebar] = useState(false);
  const [openChecklogSidebar, setOpenChecklogSidebar] = useState(false);
  const [openPriceworkDetailsSidebar, setOpenPriceworkDetailsSidebar] =
    useState(false);
  const [openAddPriceworkSidebar, setOpenAddPriceworkSidebar] = useState(false);
  const [selectedChecklogId, setSelectedChecklogId] = useState<number | null>(
    null,
  );
  const [selectedPricework, setSelectedPricework] = useState<any>(null);
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [fetchWork, setFetchWork] = useState(false);
  const [trade, setTrade] = useState<any[]>([]);
  const requestSequenceRef = useRef(0);
  const session = useSession();

  const user = session.data?.user as User & {
    company_id?: string | number | null;
  };

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=tradeList&company_id=${user.company_id}`,
        );
        if (res.data) setTrade(res.data.info);
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTrades();
  }, [user?.company_id]);

  const fetchWorkTabData = useCallback(async () => {
    const requestId = ++requestSequenceRef.current;
    const trimmedSearch = searchWork.trim();
    const hasCheckinRange = !!(checkinStartDate && checkinEndDate);
    const checkinDateParams = hasCheckinRange
      ? {
          checkin_start_date: format(checkinStartDate as Date, "dd/MM/yyyy"),
          checkin_end_date: format(checkinEndDate as Date, "dd/MM/yyyy"),
        }
      : {};
    const workParams = {
      address_id: addressId,
      company_id: companyId,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
      ...(filters.type ? { trade_id: filters.type } : {}),
      ...checkinDateParams,
    };
    const priceworkParams = {
      address_id: addressId,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
      ...(filters.type ? { trade_id: filters.type } : {}),
      ...checkinDateParams,
    };

    setFetchWork(true);
    try {
      const [worksResult, priceworksResult] = await Promise.allSettled([
        api.get("/project/get-works", {
          params: workParams,
        }),
        api.get("/pricework/list", { params: priceworkParams }),
      ]);

      const worksResponse =
        worksResult.status === "fulfilled" ? worksResult.value : null;
      const priceworksResponse =
        priceworksResult.status === "fulfilled" ? priceworksResult.value : null;

      let rawWorks = worksResponse?.data?.IsSuccess ? worksResponse.data.info : [];
      if (!Array.isArray(rawWorks)) {
        rawWorks = rawWorks?.data && Array.isArray(rawWorks.data) ? rawWorks.data : [];
      }

      let rawPriceworks = priceworksResponse?.data?.IsSuccess ? priceworksResponse.data.info : [];
      if (!Array.isArray(rawPriceworks)) {
        rawPriceworks = rawPriceworks?.data && Array.isArray(rawPriceworks.data) ? rawPriceworks.data : [];
      }

      const works = rawWorks;
      const priceworks = rawPriceworks.map((record: any) => ({
        ...record,
        id: record.pricework_id ?? record.user_checklog_id ?? record.id,
        name: record.work_type,
        is_pricework_record: true,
      }));

      if (requestId === requestSequenceRef.current) {
        setTabData([...priceworks, ...works]);
      }
    } catch {
      if (requestId === requestSequenceRef.current) {
        setTabData([]);
      }
    } finally {
      if (requestId === requestSequenceRef.current) {
        setFetchWork(false);
      }
    }
  }, [
    addressId,
    companyId,
    filters.type,
    searchWork,
    checkinStartDate,
    checkinEndDate,
  ]);

  useEffect(() => {
    if (!trade || trade.length === 0) {
      setFilterOptions([]);
      return;
    }

    const uniqueTradesMap = new Map<number, any>();

    trade.forEach((item: any) => {
      if (item.id && !uniqueTradesMap.has(item.id)) {
        uniqueTradesMap.set(item.id, {
          id: item.id,
          name: item.name,
        });
      }
    });

    setFilterOptions(Array.from(uniqueTradesMap.values()));
  }, [trade]);

  const formatHour = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "-";
    const num = parseFloat(val.toString());
    if (isNaN(num)) return "-";

    const h = Math.floor(num);
    const m = Math.round((num - h) * 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const truncateText = (text: string, maxLength: number = 12) => {
    if (!text) return "";
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  useEffect(() => {
    if (addressId) {
      const debounce = window.setTimeout(
        () => {
          fetchWorkTabData();
        },
        searchWork.trim() ? 400 : 0,
      );

      return () => window.clearTimeout(debounce);
    }
  }, [addressId, companyId, filters.type, searchWork, fetchWorkTabData]);

  const handleTaskDelete = async () => {
    try {
      const payload = {
        task_ids: String(selectedIds),
      };
      const response = await api.post("company-tasks/delete", payload);

      if (response.data.IsSuccess === true) {
        toast.success(response.data.message);
        await fetchWorkTabData();
      }
    } catch (error) {
    } finally {
      setOpenDialog(false);
    }
  };

  const handleWorkClick = (workId: any) => {
    setSelectedWorkId(workId);
    setOpenSidebar(true);
  };

  const getCurrencySymbol = (record?: any) =>
    currency ||
    record?.currency ||
    record?.company_currency ||
    record?.currency_symbol ||
    "";

  const formatCurrencyAmount = (
    record: any,
    value: string | number | null | undefined,
  ) => {
    const amount = Number(value ?? 0);
    return `${getCurrencySymbol(record)}${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
  };

  const handlePriceworkClick = async (pricework: any) => {
    const isChecklogRow =
      pricework?.record_type === "timesheet_light"
      || pricework?.source_type === "user_checklog"
      || Boolean(pricework?.user_checklog_id);
    const priceworkId = Number(
      isChecklogRow
        ? pricework?.user_checklog_id || pricework?.source_id || pricework?.id
        : pricework?.pricework_id || pricework?.id,
    );
    if (!Number.isInteger(priceworkId) || priceworkId <= 0) {
      toast.error("Pricework record not found.");
      return;
    }

    try {
      const response = await api.get("/timesheet/pricework-details", {
        params: { pricework_id: priceworkId },
      });
      const details = response.data?.info;
      if (!details) {
        toast.error(response.data?.message || "Pricework record not found.");
        return;
      }

      setSelectedPricework({
        ...pricework,
        ...details,
        pricework_id: details.pricework_id ?? details.id,
      });
      setOpenPriceworkDetailsSidebar(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Pricework record not found.");
    }
  };

  const handleEditPricework = (pricework: any) => {
    setSelectedPricework(pricework);
    setOpenPriceworkDetailsSidebar(false);
    setOpenAddPriceworkSidebar(true);
  };

  const closePriceworkDetailsSidebar = () => {
    setOpenPriceworkDetailsSidebar(false);
    setSelectedPricework(null);
  };

  const closeAddPriceworkSidebar = async () => {
    setOpenAddPriceworkSidebar(false);
    setSelectedPricework(null);
    await fetchWorkTabData();
  };

  interface Work {
    name: string;
    duration_minute: number;
    total_payable_seconds: number;
  }

  function ProgressBar({ work }: { work: Work }) {
    const totalPayableMinutes = Number(work.total_payable_seconds || 0) / 60;
    const durationMinutes = Number(work.duration_minute) || 1;

    // Fill percent of bar
    const fillPercent = Math.min(
      (totalPayableMinutes / durationMinutes) * 100,
      100,
    );

    const bgColor =
      totalPayableMinutes > durationMinutes ? "#FFB4A2" : "#B9FBC0";
    const barColor =
      totalPayableMinutes > durationMinutes ? "#FF6B6B" : "#4CAF50";

    if (work.total_payable_seconds > 0) {
      return (
        <Tooltip
          title={
            <>
              <div>
                Time Spend: {Math.round(work.total_payable_seconds / 60)} min
              </div>
            </>
          }
          arrow
          placement="bottom"
        >
          <Box
            sx={{
              height: 8,
              width: "100%",
              backgroundColor: bgColor,
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                width: `${fillPercent}%`,
                height: "100%",
                backgroundColor: barColor,
                borderRadius: 2,
              }}
            />
          </Box>
        </Tooltip>
      );
    }
  }

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
        sx={{ flexWrap: "wrap" }}
      >
        <TextField
          placeholder="Search..."
          size="small"
          value={searchWork}
          onChange={(e) => setSearchWork(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconSearch size={16} />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: "100%", sm: "80%" }, mb: { xs: 2, sm: 0 } }}
        />
        <Button
          variant="contained"
          onClick={() => {
            setTempFilters(filters);
            setOpen(true);
          }}
          sx={{ mt: { xs: 1, sm: 0 }, minWidth: "40px", px: 1 }}
        >
          <IconFilter width={18} />
        </Button>
      </Stack>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ m: 0, position: "relative", overflow: "visible" }}>
          Filters
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

        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Autocomplete
              options={filterOptions}
              getOptionLabel={(opt: any) => opt.name || ""}
              value={
                filterOptions.find(
                  (opt) => opt.id?.toString() === tempFilters.type,
                ) || null
              }
              onChange={(_, newValue) => {
                setTempFilters({
                  ...tempFilters,
                  type: newValue ? newValue.id.toString() : "",
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Trade Type"
                  placeholder="Search trade type..."
                  fullWidth
                />
              )}
              clearOnEscape
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setFilters({ type: "" });
              setTempFilters({ type: "" });
              setOpen(false);
            }}
            color="inherit"
          >
            Clear
          </Button>

          <Button
            variant="contained"
            onClick={() => {
              setFilters(tempFilters);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
      <WorkDetailPage
        open={openSidebar}
        onClose={() => setOpenSidebar(false)}
        workId={selectedWorkId}
        companyId={companyId}
        addressId={addressId}
        onSubmit={fetchWorkTabData}
      />

      {/* List of works */}
      {fetchWork ? (
        <Box mb={2} sx={{ border: "1px solid #ccc", borderRadius: 2, p: 2 }}>
          <Skeleton variant="text" width="40%" height={28} />
          <Skeleton variant="text" width="70%" height={20} sx={{ mt: 1 }} />
          <Skeleton variant="text" width="55%" height={18} sx={{ mt: 0.5 }} />
        </Box>
      ) : tabData.length > 0 ? (
        tabData.map((work, idx) =>
          work.is_pricework_record ? (
            <Box
              key={`pricework-${work.id}`}
              mb={2}
              onClick={() => handlePriceworkClick(work)}
              sx={{
                border: "1px solid #ccc",
                borderRadius: 2,
                p: 2,
                cursor: "pointer",
                "&:hover": { boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" },
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                spacing={2}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      display: "inline-block",
                      bgcolor: "#1e4db7",
                      color: "#fff",
                      borderRadius: "999px",
                      px: 1,
                      py: 0.2,
                      mb: 1,
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    Pricework
                  </Box>
                  <Typography fontWeight="bold">{work.work_type}</Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {work.user_name} · {work.team_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {work.work_complete || "0"} {work.unit_name} ×{" "}
                    {formatCurrencyAmount(work, work.amount_per_unit)}
                    {work.date ? ` · ${work.date}` : ""}
                  </Typography>
                </Box>
                <Typography
                  fontWeight="bold"
                  fontSize="1.1rem"
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {formatCurrencyAmount(work, work.pricework_amount)}
                </Typography>
              </Stack>
            </Box>
          ) : (
            <Box
              key={idx}
              mb={2}
              sx={{
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
              }}
              onClick={() => {
                if (work.check_log_id) {
                  setSelectedChecklogId(work.check_log_id);
                  setOpenChecklogSidebar(true);
                } else if (work.id) {
                  handleWorkClick(work.id);
                }
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  border: "1px solid #ccc",
                  borderRadius: 2,
                  p: 2,
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  "&:hover": {
                    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
                  },
                }}
              >
                {/* Labels */}
                <Box
                  sx={{
                    position: "absolute",
                    top: -10,
                    left: 16,
                    right: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 1,
                    flexWrap: "wrap",
                    zIndex: 1,
                  }}
                >
                  <Box display={"flex"} gap={1}>
                    <Tooltip title={work.trade_name || ""} arrow>
                      <Box
                        sx={{
                          backgroundColor: "#FF7A00",
                          border: "1px solid #FF7A00",
                          color: "#fff",
                          fontSize: "11px",
                          fontWeight: 500,
                          px: 1,
                          py: 0.2,
                          borderRadius: "999px",
                          maxWidth: "80px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                      >
                        {truncateText(work.trade_name)}
                      </Box>
                    </Tooltip>

                    {/* <Box
                    sx={{
                      backgroundColor: "#7523D3",
                      border: "1px solid #7523D3",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 500,
                      px: 1,
                      py: 0.2,
                      borderRadius: "999px",
                    }}
                  >
                    {work.duration}
                  </Box> */}
                    {work.rate && (
                      <Box
                        sx={{
                          backgroundColor:
                            work.repeatable_job === "Task"
                              ? "#32A852"
                              : "#FF008C",
                          border:
                            work.repeatable_job === "Task"
                              ? "1px solid #32A852"
                              : "1px solid #FF008C",
                          color: "#fff",
                          fontSize: "11px",
                          fontWeight: 500,
                          px: 1,
                          py: 0.2,
                          borderRadius: "999px",
                        }}
                      >
                        {work.repeatable_job === "Task" ? work.rate : "Job"}
                      </Box>
                    )}

                    {/* <Box
                      sx={{
                        backgroundColor: work.status_color,
                        border: `1px solid ${work.status_color}`,
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: 500,
                        px: 1,
                        py: 0.2,
                        borderRadius: "999px",
                      }}
                    >
                      {work.status_text}
                    </Box> */}
                  </Box>
                  <Box display={"flex"} gap={1} alignItems={"center"}>
                    <Badge
                      badgeContent={work.count}
                      color="error"
                      overlap="circular"
                    >
                      {work.count > 0 && (
                        <IconButton
                          sx={{
                            minHeight: "20px !important",
                            height: "10px",
                            top: "3px",
                            backgroundColor: "white",
                            "&:hover": {
                              backgroundColor: "white !important",
                            },
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <IconPaperclip color="#1e4db7" />
                        </IconButton>
                      )}
                    </Badge>
                  </Box>
                </Box>

                {/* Work row */}
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ width: "100%", mt: 1 }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      fontWeight="bold"
                      sx={{ fontSize: { xs: "1rem", sm: "1.125rem" } }}
                    >
                      {work.name}
                    </Typography>
                    <Typography fontWeight="bold" color="textSecondary">
                      {work.user_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {work.work_complete} {work.unit_name}
                      {work.amount_per_unit
                        ? ` × ${formatCurrencyAmount(work, work.amount_per_unit)}`
                        : ""}
                      {work.date ? ` · ${work.date}` : ""}
                    </Typography>
                    {/* Progress Bar */}
                    {/* <ProgressBar work={work} /> */}
                  </Box>

                  {work.is_checklog === false && work.status_int == 1 && (
                    <IconButton
                      color="error"
                      onClick={(e) => {
                        setOpenDialog(true);
                        setSelectedIds(work.id);
                        e.stopPropagation();
                      }}
                    >
                      <IconTrash width={18} />
                    </IconButton>
                  )}

                  <Stack>
                    <Typography fontWeight="bold" fontSize="1.25rem">
                      {work.pricework_amount
                        ? formatCurrencyAmount(work, work.pricework_amount)
                        : null}
                    </Typography>
                    {parseFloat(work.total_work_hours) > 0 && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight="bold" fontSize="1.25rem">
                          {formatHour(work.total_work_hours)} H
                        </Typography>
                        <IconButton>
                          <IconChevronRight
                            fontSize="small"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </IconButton>
                      </Stack>
                    )}
                  </Stack>
                </Stack>
              </Box>
            </Box>
          ),
        )
      ) : (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "calc(50vh - 100px)",
          }}
        >
          <Image
            src="/images/svgs/no-data.webp"
            alt="No data"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
            }}
            width={250}
            height={250}
          />
        </Box>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to delete this task?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>
          <Button onClick={handleTaskDelete} variant="outlined" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <ChecklogDetailPage
        checklogId={selectedChecklogId}
        open={openChecklogSidebar}
        onClose={() => {
          setOpenChecklogSidebar(false);
          setSelectedChecklogId(null);
        }}
      />
      <Drawer
        anchor="right"
        open={openPriceworkDetailsSidebar}
        onClose={closePriceworkDetailsSidebar}
        PaperProps={{
          sx: {
            borderRadius: 0,
            boxShadow: "none",
            overflow: "hidden",
            width: "504px",
            borderTopLeftRadius: 18,
            borderBottomLeftRadius: 18,
          },
        }}
      >
        <PriceworkDetails
          pricework={selectedPricework}
          currency={getCurrencySymbol(selectedPricework)}
          onClose={closePriceworkDetailsSidebar}
          onEdit={handleEditPricework}
        />
      </Drawer>
      <Drawer
        anchor="right"
        open={openAddPriceworkSidebar}
        onClose={closeAddPriceworkSidebar}
        PaperProps={{
          sx: {
            borderRadius: 0,
            boxShadow: "none",
            overflow: "hidden",
            width: "504px",
            borderTopLeftRadius: 18,
            borderBottomLeftRadius: 18,
          },
        }}
      >
        <AddPricework
          onClose={closeAddPriceworkSidebar}
          userId={
            selectedPricework?.user_id
              ? Number(selectedPricework.user_id)
              : undefined
          }
          companyId={companyId}
          pricework={selectedPricework}
          onDataRefresh={fetchWorkTabData}
        />
      </Drawer>
    </Box>
  );
};
