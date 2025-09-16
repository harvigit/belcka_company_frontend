"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  Button,
  Autocomplete,
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
  };

  const [comapny, setCompany] = useState<any>();
  const [trade, setTrade] = useState<TradeList[]>([]);

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
        setCompany(res.data.info);
        setFormData({
          trade_id: res.data.info.trade_id ?? null,
          rate: res.data.info.net_rate_perDay ?? "",
        });
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const fetchTrades = async () => {
    try {
      const res = await api.get(`trade/get-trades?company_id=${comapny?.id}`);
      if (res.data) setTrade(res.data.info);
    } catch (err) {
      console.error("Failed to fetch trades", err);
    }
  };

  useEffect(() => {
    if (!userId || !active) return;
    getCompanyData();
  }, [userId, active]);

  useEffect(() => {
    if (comapny?.id) {
      fetchTrades();
    }
  }, [comapny]);

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
      mt={2}
      ml={5}
      className="company_rate_wrapper"
      height="370px !important"
    >
      <Box display={"flex"} justifyContent={"space-between"} mb={1}>
        <Typography
          variant="h1"
          color="#487bb3ff"
          fontSize="18px !important"
          sx={{ mb: 1 }}
        >
          Edit rate
        </Typography>
        {user.user_role_id == 1 && comapny.is_pending_request == true && (
          <Box display={"flex"} justifyContent={"end"} mb={1}>
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
          <TextField
            fullWidth
            className="custom_color"
            label="Rate"
            value={
              Object.keys(comapny?.diff_data || {}).includes("net_rate_perday")
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
            sx={{ height: "47px !important" }}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <CustomTextField
                {...params}
                placeholder="Search Trade"
                className="trade-selection"
              />
            )}
            disabled={Object.keys(comapny?.diff_data || {}).includes(
              "trade_id"
            )}
          />
        </Grid>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }} mt={2}>
        <TextField
          fullWidth
          className="custom_color"
          label="Joining on"
          value={comapny?.joining_date}
          disabled
        />
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
    </Box>
  );
};

export default ComapnyRate;
