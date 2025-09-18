"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  Button,
  Autocomplete,
  Tooltip,
} from "@mui/material";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { useParams } from "next/navigation";
import { Grid } from "@mui/system";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomTextField from "../../forms/theme-elements/CustomTextField";

interface ProjectListingProps {
  active: boolean;
}

export interface TradeList {
  id: number;
  name: string;
}

const ComapnyRate: React.FC<ProjectListingProps> = ({ active }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const params = useParams();
  const userId = Number(params?.id);
  const session = useSession();
  const user = session.data?.user as User & { user_role_id?: number | null } & {
    id: number;
  } & { company_id: number };

  const [comapny, setCompany] = useState<any>();
  const [trade, setTrade] = useState<TradeList[]>([]);
  const [gross, setGross] = useState<any>();
  const [cis, setCis] = useState<any>();
  const [payRate, setPayRate] = useState<boolean>(false);

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
      if (res.data) setPayRate(res.data.info.show_pay_rate);
    } catch (err) {
      console.error("Failed to fetch trades", err);
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
  console.log(payRate, "payRate");

  const handleUpdate = async () => {
    if (!formData.trade_id || !formData.rate) {
      toast.error("Please select trade and enter rate");
      return;
    }
    try {
      const payload = {
        company_id: comapny.id,
        trade_id: formData.trade_id,
        new_rate_perDay: Number(formData.rate),
        user_id: userId,
      };
      const res = await api.post("user-billing/change-company-rate", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
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
      height="370px !important"
    >
      <Box display={"flex"} justifyContent={"space-between"} mb={1}>
        <Typography color="#487bb3ff" fontSize="16px !important" sx={{ mb: 1 }}>
          Edit rate
        </Typography>
        {user.user_role_id == 1 && comapny.is_pending_request && (
          <Box display="flex" justifyContent="end" mb={1}>
            <Button
              variant="outlined"
              color="success"
              startIcon={<IconCheck size={16} />}
              onClick={() => handleApprove(comapny?.request_log_id)}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<IconX size={16} />}
              onClick={() => handleReject(comapny?.request_log_id)}
              sx={{ ml: 2 }}
            >
              Reject
            </Button>
          </Box>
        )}
      </Box>

      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Autocomplete
            fullWidth
            className="custom_color"
            size="small"
            options={trade}
            value={
              Object.keys(comapny?.diff_data || {}).includes("trade_id")
                ? trade.find((t) => t.id === comapny.diff_data.trade_id.old) ??
                  null
                : trade.find((t) => t.id === formData.trade_id) ?? null
            }
            onChange={(e, val) =>
              setFormData((prev) => ({
                ...prev,
                trade_id: val ? val.id : null,
              }))
            }
            sx={{ height: "47px !important", width: "100% !important" }}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <CustomTextField
                label="Trade"
                {...params}
                placeholder="Search Trade"
                className="company-trade-selection"
              />
            )}
            disabled={Object.keys(comapny?.diff_data || {}).includes(
              "trade_id"
            )}
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

      {payRate ? (
        <>
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                className="custom_color"
                label={"(" + comapny?.currency + ")" + " Net Per Day"}
                value={
                  Object.keys(comapny?.diff_data || {}).includes(
                    "net_rate_perday"
                  )
                    ? comapny?.diff_data.net_rate_perday?.old ?? ""
                    : formData.rate
                }
                disabled={Object.keys(comapny?.diff_data || {}).includes(
                  "net_rate_perday"
                )}
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
        </>
      ) : (
        ""
      )}
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
    </Box>
  );
};

export default ComapnyRate;
