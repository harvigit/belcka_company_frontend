"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  Button,
  Alert,
  DialogContent,
  IconButton,
  Divider,
  FormControlLabel,
  Drawer,
  Autocomplete,
} from "@mui/material";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { useParams } from "next/navigation";
import { Grid } from "@mui/system";
import { IconCheck, IconHistory, IconX } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomCheckbox from "../../forms/theme-elements/CustomCheckbox";
import dayjs from "dayjs";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
interface ProjectListingProps {
  active: boolean;
  name: string | null;
}
export interface TradeList {
  id: number;
  name: string;
}

const ComapnyRate: React.FC<ProjectListingProps> = ({ active, name }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const params = useParams();
  const userId = Number(params?.id);
  const [comapny, setCompany] = useState<any>();
  const [trade, setTrade] = useState<TradeList[]>([]);
  const [gross, setGross] = useState<any>();
  const [cis, setCis] = useState<any>();
  const [payRate, setPayRate] = useState<string | null>(null);
  const [ratePermisison, setRatePermission] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showAllDates, setShowAllDates] = useState(true);
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const { data: session, update } = useSession();
  const user = session?.user as User & { user_role_id?: number | null } & {
    id: number;
  } & { company_id: number };

  const handleOpen = () => {
    setOpen(true);
    fetchRateHistory();
  };

  const handleClose = () => {
    setOpen(false);
  };
  const [formData, setFormData] = useState<{
    trade_id: number | null;
    rate: string;
  }>({
    trade_id: null,
    rate: "",
  });

  const getCompanyData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get(`company/active-company?user_id=${userId}`);
      if (res.data.info) {
        const companyData = res.data.info;
        setCompany(companyData);
        const netRate = Object.keys(companyData?.diff_data || {}).includes(
          "net_rate_perday"
        )
          ? companyData?.diff_data?.net_rate_perday?.old ?? 0
          : companyData?.net_rate_perDay ?? 0;

        setFormData({
          trade_id: companyData.trade_id ?? null,
          rate: netRate,
        });

        const cisAmount = netRate * 0.2;
        const grossAmount = netRate + cisAmount;
        setCis(cisAmount);
        setGross(grossAmount);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrades = async () => {
    try {
      const res = await api.get(`trade/get-trades?company_id=${comapny?.id}`);
      if (res.data) setTrade(res.data.info);
    } catch (err) {
      console.error("Failed to fetch trades", err);
    }
  };

  const findPermission = async () => {
    try {
      const res = await api.get(
        `setting/user-payrate-permission?user_id=${user.id}&company_id=${user.company_id}`
      );

      if (res.data && res.data.info) {
        const info = res.data.info;

        const showRate = info?.show_pay_rate || null;
        setPayRate(showRate);

        const hasRatePermission = info.hasOwnProperty("rate_permission")
          ? info.rate_permission
          : true;

        setRatePermission(hasRatePermission);
      } else {
        setPayRate(null);
        setRatePermission(true);
      }
    } catch (err) {
      console.error("Failed to fetch payrate permission:", err);
      setPayRate(null);
      setRatePermission(true);
    }
  };

  const fetchRateHistory = async (start?: string, end?: string) => {
    try {
      let url = `requests/get-rate-history?company_id=${user.company_id}&user_id=${userId}`;
      if (start && end) {
        url += `&start_date=${start}&end_date=${end}`;
      }

      const res = await api.get(url);
      if (res.data?.IsSuccess) setHistory(res.data.info || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  useEffect(() => {
    fetchRateHistory();
  }, []);

  useEffect(() => {
    if (!showAllDates && startDate && endDate) {
      const formattedStart = dayjs(startDate).format("DD/MM/YYYY");
      const formattedEnd = dayjs(endDate).format("DD/MM/YYYY");
      fetchRateHistory(formattedStart, formattedEnd);
    }
  }, [startDate, endDate]);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setShowAllDates(checked);
    if (checked) {
      setStartDate(null);
      setEndDate(null);
      fetchRateHistory();
    }
  };

  useEffect(() => {
    if (!userId || !active) return;
    getCompanyData();
    findPermission();
  }, [userId, active]);

  useEffect(() => {
    if (comapny?.id) {
      fetchTrades();
    }
  }, [comapny]);

  const handleUpdate = async () => {
    if (comapny.user_role_id !== 1 && !formData.trade_id) {
      toast.error("Please select trade");
      return;
    }
    const currentTradeId = comapny?.trade_id ?? null;
    const currentNetRate = Object.keys(comapny?.diff_data || {}).includes(
      "net_rate_perday"
    )
      ? comapny?.diff_data?.net_rate_perday?.old ?? 0
      : comapny?.net_rate_perDay ?? 0;

    if (
      currentTradeId === formData.trade_id &&
      Number(currentNetRate) === Number(formData.rate)
    ) {
      return;
    }
    try {
      const payload = {
        company_id: comapny.id,
        trade_id: Number(formData.trade_id),
        new_rate_perDay: Number(formData.rate),
        user_id: userId,
      };
      const res = await api.post("user-billing/change-company-rate", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        if (Number(userId) === Number(user?.id)) {
          await update({
            ...session,
            user: {
              ...session?.user,
              trade_id: res.data.info.trade_id,
              trade_name: res.data.info.trade_name,
            },
          });
        }
        getCompanyData();
      } else {
        toast.error(res.data.message || "Update failed");
      }
    } catch (err) {
      console.error("Update failed:", err);
    }
  };
  const handleApprove = async (requestLogId?: number | null) => {
    const payload = {
      log_id: requestLogId,
      user_id: user.id,
    };
    if (!requestLogId) {
      return;
    }
    try {
      const res = await api.post("/requests/approve-request", payload);
      if (res.data.IsSuccess == true) {
        toast.success(res.data.message);
        getCompanyData();
      }
    } catch (err) {
      console.error("Approval failed:", err);
    }
  };

  /*  Reject request */
  const handleReject = async (requestLogId?: number | null) => {
    if (!requestLogId) {
      return;
    }
    const payload = {
      log_id: requestLogId,
      user_id: user.id,
    };
    try {
      const res = await api.post("/requests/reject-request", payload);
      if (res.data.IsSuccess == true) {
        toast.success(res.data.message);
        getCompanyData();
      }
    } catch (err) {
      console.error("Rejection failed:", err);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="370px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      m={2}
      p={2}
      pt={0}
      mt={2}
      ml={5}
      className="company_rate_wrapper"
      height="450px !important"
    >
      <Box display={"flex"} justifyContent={"space-between"} mb={2}>
        {user.user_role_id !== 1 &&
        comapny.is_pending_request &&
        ratePermisison ? (
          <Alert severity="error" variant="filled">
            Your rate request has been pending.
          </Alert>
        ) : (
          <Box></Box>
        )}
        <Button
          color="inherit"
          startIcon={<IconHistory />}
          variant="contained"
          size="large"
          sx={{
            backgroundColor: "transparent",
            borderRadius: 3,
            color: "#047bff",
            float: "inline-end",
          }}
          onClick={handleOpen}
        >
          Rate History
        </Button>
      </Box>
      {payRate && ratePermisison ? (
        <>
          {user.user_role_id == 1 && comapny.is_pending_request === true && (
            <>
              <Box display={"flex"} justifyContent={"space-between"} mb={1}>
                <Typography
                  color="#487bb3ff"
                  fontSize="16px !important"
                  sx={{ mb: 1 }}
                >
                  Edit rate
                </Typography>
              </Box>

              <Box mb={4} display={"flex"}>
                <Alert
                  severity="info"
                  variant="outlined"
                  className="pending-request"
                  sx={{
                    alignItems: "center",
                    borderColor: "red !important",
                    color: "black !important",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography sx={{ color: "black !important", mr: 2 }}>
                      Rate request is pending please take an action.
                    </Typography>

                    <Button
                      variant="outlined"
                      color="success"
                      startIcon={<IconCheck size={16} />}
                      onClick={() => handleApprove(comapny?.request_log_id)}
                      sx={{ mr: 1 }}
                    >
                      Approve
                    </Button>

                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<IconX size={16} />}
                      onClick={() => handleReject(comapny?.request_log_id)}
                    >
                      Reject
                    </Button>
                  </Box>
                </Alert>
              </Box>
            </>
          )}

          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                className="custom_color"
                options={trade}
                disabled={user.user_role_id !== 1}
                getOptionLabel={(opt: any) => opt?.name || ""}
                value={
                  Object.keys(comapny?.diff_data || {}).includes("trade_id")
                    ? trade.find(
                        (t) => t.id === comapny.diff_data.trade_id.old
                      ) || null
                    : trade.find((t) => t.id === formData.trade_id) || null
                }
                onChange={(_, newValue) => {
                  setFormData({
                    ...formData,
                    trade_id: newValue ? newValue.id : null,
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Trade"
                    placeholder="Search trade type..."
                    fullWidth
                  />
                )}
                clearOnEscape
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                className="custom_color"
                label="Join Company Date"
                value={comapny?.joining_date}
                disabled
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                className="custom_color"
                label={`(${comapny?.currency}) Net Per Day`}
                value={
                  Object.keys(comapny?.diff_data || {}).includes(
                    "net_rate_perday"
                  )
                    ? comapny?.diff_data.net_rate_perday?.old ?? ""
                    : formData.rate
                }
                disabled={
                  Object.keys(comapny?.diff_data || {}).includes(
                    "net_rate_perday"
                  ) ||
                  payRate === "view" ||
                  !payRate
                }
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rate: e.target.value }))
                }
              />
            </Grid>
          </Grid>
          <Grid size={{ xs: 6, sm: 6 }}>
            <Box display={"flex"} justifyContent={"space-between"} mb={2}>
              <Typography color="textSecondary">Gross Per Day</Typography>
              <Typography color="textSecondary">
                {comapny?.currency}
                {gross}
              </Typography>
            </Box>
            <Box display={"flex"} justifyContent={"space-between"}>
              <Typography color="textSecondary">CIS (20%)</Typography>
              <Typography color="textSecondary">
                {comapny?.currency}
                {cis}
              </Typography>
            </Box>
          </Grid>
          <Box mt={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpdate}
              disabled={comapny.is_pending_request}
            >
              Update
            </Button>
          </Box>
        </>
      ) : (
        <Box mt={4} display={"flex"}>
          <Typography color="textSecondary" className="f-18" sx={{ m: "auto" }}>
            You do not have permission to view this information.
          </Typography>
        </Box>
      )}
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        sx={{
          width: 600,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 600,
            padding: 2,
            backgroundColor: "#f9f9f9",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box textAlign={"center"} color="textSecondary" mb={2}>
          <Typography color="textSecondary">
            {name ? `${name}'s pay rates` : ""}
          </Typography>

          <IconButton
            aria-label="close"
            onClick={handleClose}
            size="large"
            sx={{
              position: "absolute",
              right: 12,
              top: 6,
              color: (theme) => theme.palette.grey[900],
              backgroundColor: "transparent",
              zIndex: 10,
              width: 45,
              height: 45,
            }}
          >
            <IconX size={40} style={{ width: 40, height: 40 }} />
          </IconButton>
        </Box>
        <DialogContent dividers>
          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              p={4}
            >
              <CircularProgress />
            </Box>
          ) : history.length > 0 ? (
            <>
              <Box
                display="flex"
                alignItems="center"
                justifyContent={"space-between"}
                className="rate_history_wrapper"
              >
                <Box>
                  <FormControlLabel
                    control={
                      <CustomCheckbox
                        checked={showAllDates}
                        onChange={handleCheckboxChange}
                      />
                    }
                    label="Show all dates"
                  />
                </Box>
                {!showAllDates && (
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Box display="flex" gap={2} alignItems={"center"}>
                      <DatePicker
                        label="Start date"
                        value={startDate}
                        onChange={(newValue) => setStartDate(newValue)}
                        format="DD/MM/YYYY"
                      />
                      <DatePicker
                        label="End date"
                        value={endDate}
                        onChange={(newValue) => setEndDate(newValue)}
                        format="DD/MM/YYYY"
                      />
                    </Box>
                  </LocalizationProvider>
                )}
              </Box>
              <Box
                sx={{
                  position: "relative",
                  mt: 2,
                  pl: 4,
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: "2px",
                    top: 0,
                    bottom: 0,
                    width: "2px",
                    backgroundColor: "#1976d2",
                  },
                }}
              >
                {history?.map((item: any, index: number) => (
                  <Box
                    key={index}
                    sx={{
                      position: "relative",
                      pl: 1,
                      mb: 3,
                    }}
                  >
                    {/* Blue dot */}
                    <Box
                      sx={{
                        position: "absolute",
                        left: "-35px",
                        top: "16px",
                        width: "12px",
                        height: "12px",
                        backgroundColor: "#1976d2",
                        borderRadius: "50%",
                      }}
                    />

                    {/* Card box */}
                    <Box
                      sx={{
                        border: 1,
                        p: 2,
                        borderColor: "#c5c3c3ff",
                        borderRadius: 2,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        backgroundColor: "#fff",
                      }}
                    >
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        mb={1}
                        sx={{
                          backgroundColor: "#888c8f1f",
                          p: 1,
                          borderRadius: 4,
                          width: "fit-content",
                          px: 2,
                        }}
                      >
                        Effective date: {item.effective_date}
                      </Typography>

                      <Box
                        display={"flex"}
                        justifyContent={"space-between"}
                        alignItems={"center"}
                      >
                        {/* New rate */}
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          alignContent={"center"}
                        >
                          <Typography variant="h6" fontWeight="bold">
                            New rate :
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {item.currency}
                            {item.new_net_rate_perday
                              ? item.new_net_rate_perday
                              : 0}
                            <Typography component="span" color="textSecondary">
                              /day
                            </Typography>
                          </Typography>
                        </Box>

                        {/* Old rate */}
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          mt={1}
                        >
                          <Typography variant="h6" fontWeight="bold">
                            Old rate :
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {item.currency}
                            {item.old_net_rate_perday
                              ? item.old_net_rate_perday
                              : 0}
                            <Typography component="span" color="textSecondary">
                              /day
                            </Typography>
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ mt: 2, mb: 1 }} />

                      {item.user_name && (
                        <Typography variant="caption" color="textSecondary">
                          {item.status_text == "approved"
                            ? "Approved"
                            : item.status_text == "rejected"
                            ? "Rejected"
                            : "Modified"}{" "}
                          {item.action_by
                            ? `by  ${item.action_by}  on ${item.date} at ${item.time}`
                            : ""}{" "}
                          on {item.date} at {item.time}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          ) : (
            <Box sx={{ height: "150px !important" }}>
              <Typography align="center" color="textSecondary">
                No rate history found.
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Drawer>
    </Box>
  );
};

export default ComapnyRate;
