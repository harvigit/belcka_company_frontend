"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Grid,
  TextField,
  Typography,
  Button,
  CircularProgress,
  Divider,
} from "@mui/material";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import PhoneInput from "react-phone-input-2";
import theme from "@/utils/theme";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useParams } from "next/navigation";

interface ProjectListingProps {
  companyId: number | null;
  active: boolean;
}

interface BillingFormData {
  id?: number;
  user_id?: number;
  company_id?: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  post_code: string;
  address: string;
  extension: string;
  phone: string;
  name_on_utr: string;
  utr_number: string;
  nin_number: string;
  name_on_account: string;
  bank_name: string;
  account_no: string;
  short_code: string;
  status: number | null;
  is_pending_request: boolean;
  old_data: Record<string, any>;
  new_data: Record<string, any>;
  diff_data: Record<string, { old: any; new: any }>;
  request_log_id?: number;
}

const emptyBillingInfo: BillingFormData = {
  id: 0,
  first_name: "",
  middle_name: "",
  last_name: "",
  email: "",
  post_code: "",
  address: "",
  extension: "",
  phone: "",
  name_on_utr: "",
  utr_number: "",
  nin_number: "",
  name_on_account: "",
  bank_name: "",
  account_no: "",
  short_code: "",
  status: 0,
  is_pending_request: false,
  old_data: {},
  new_data: {},
  diff_data: {},
};

const BillingInfo: React.FC<ProjectListingProps> = ({ companyId, active }) => {
  const [billingInfo, setBillingInfo] = useState<BillingFormData | null>(null);
  const [hasBillingInfo, setHasBillingInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const session = useSession();
  const user = session.data?.user as User & { user_role_id?: number | null } & {
    id: number;
  };
  const params = useParams();
  const userId = Number(params?.id);
  /*  Fetch billing info */
  const fetchBillingInfo = async () => {
    if (!userId || !companyId) return;
    try {
      setLoading(true);
      const res = await api.get(
        `user-billing/get-user-billing-info?user_id=${userId}&company_id=${companyId}`
      );
      const data = res.data.info;

      if (
        data &&
        Object.values(data).some((val) => val !== null && val !== "")
      ) {
        setHasBillingInfo(true);
        setBillingInfo({ ...emptyBillingInfo, ...data });
      } else {
        setHasBillingInfo(false);
        setBillingInfo(emptyBillingInfo);
      }
    } catch (err) {
      console.error("Error fetching billing info:", err);
    } finally {
      setLoading(false);
    }
  };

  /*  Field change */
  const handleFieldChange = (key: keyof BillingFormData, value: string) => {
    setBillingInfo((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  /*  Submit billing info */
  const handleSubmit = useCallback(async () => {
    if (!billingInfo || !userId || !companyId) return;

    const payload = { ...billingInfo, user_id: userId, company_id: companyId };

    try {
      const res = hasBillingInfo
        ? await api.put("user-billing/update-billing-info", payload)
        : await api.post("user-billing/store-billing-info", payload);

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        setHasBillingInfo(true);
        fetchBillingInfo();
      }
    } catch (err) {
      console.error("Submit error:", err);
    }
  }, [billingInfo, userId, companyId, hasBillingInfo, fetchBillingInfo]);

  /* Helpers */
  const isDisabledNewData =
    billingInfo?.status === 3 &&
    (!billingInfo?.old_data ||
      Object.keys(billingInfo.old_data).length === 0) &&
    billingInfo?.new_data;

  const formData: Partial<BillingFormData> = isDisabledNewData
    ? billingInfo?.new_data || {}
    : billingInfo || {};

  const isDisabledField = (key: string) => {
    if (isDisabledNewData) return true;
    return (
      billingInfo?.is_pending_request &&
      billingInfo?.diff_data?.hasOwnProperty(key)
    );
  };

  useEffect(() => {
    if(!userId || !active) return
    fetchBillingInfo();
  }, [userId, active]);

  /*  Set combined phone */
  useEffect(() => {
    if (formData) {
      const ext = formData.extension || "";
      const number = formData.phone || "";
      if (ext && number) {
        setPhone(ext.replace("+", "") + number);
      }
    }
  }, [formData]);

  /*  Phone input change */
  const handlePhoneInputChange = (value: string, country: any) => {
    setPhone(value);

    const ext = "+" + country.dialCode;
    const numberOnly = value.replace(new RegExp(`^${country.dialCode}`), "");

    handleFieldChange("extension", ext);
    handleFieldChange("phone", numberOnly);
  };

  /*  Approve request */
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
        fetchBillingInfo();
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
        fetchBillingInfo();
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

  if (!billingInfo) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="370px"
      >
        <Typography>No Billing Info Available !!</Typography>
      </Box>
    );
  }

  return (
    <Box ml={5} p={2} className="billing_wraper">
      {/* General Info */}
      <Box display={"flex"} justifyContent={"space-between"} mb={1}>
        <Typography
          color="#487bb3ff"
          fontSize="16px !important"
          sx={{ mb: 1 }}
        >
          General Information
        </Typography>
        {user.user_role_id == 1 && billingInfo.is_pending_request == true && (
          <Box display={"flex"} justifyContent={"end"} mb={1}>
            <Button
              variant="outlined"
              color="success"
              startIcon={<IconCheck size={16} />}
              onClick={() => handleApprove(billingInfo?.request_log_id)}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<IconX size={16} />}
              onClick={() => handleReject(billingInfo?.request_log_id)}
              sx={{ ml: 2 }}
            >
              Reject
            </Button>
          </Box>
        )}
      </Box>
      <Grid container spacing={2} mb={2}>
        {["first_name", "middle_name", "last_name", "email", "post_code"].map(
          (key) => (
            <Grid size={{ xs: 12, sm: 6 }} key={key}>
              <TextField
                fullWidth
                className="custom_color"
                disabled={isDisabledField(key)}
                label={key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
                value={(formData as any)[key] ?? ""}
                onChange={(e) =>
                  handleFieldChange(
                    key as keyof BillingFormData,
                    e.target.value
                  )
                }
              />
            </Grid>
          )
        )}

        <Grid size={{ xs: 12, sm: 6 }}>
          <PhoneInput
            inputClass="phone-input"
            country={"gb"}
            value={phone}
            disabled={isDisabledField("phone")}
            onChange={handlePhoneInputChange}
            inputStyle={{
              width: "100%",
              borderColor: "#c0d1dc9c",
            }}
            enableSearch
            inputProps={{ required: true }}
          />
        </Grid>
      </Grid>
      <Divider />

      {/* Tax Info */}
      <Typography
        color="#487bb3ff"
        fontSize="16px !important"
        sx={{ mt: 3, mb: 1 }}
      >
        Tax Information
      </Typography>
      <Grid container spacing={2} mb={4}>
        {["utr_number", "name_on_utr", "nin_number"].map((key) => (
          <Grid size={{ xs: 12, sm: 6 }} key={key}>
            <TextField
              fullWidth
              className="custom_color"
              disabled={isDisabledField(key)}
              label={key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
              value={(formData as any)[key] ?? ""}
              onChange={(e) =>
                handleFieldChange(key as keyof BillingFormData, e.target.value)
              }
            />
          </Grid>
        ))}
      </Grid>
      <Divider />

      {/* Bank Info */}
      <Typography
        color="#487bb3ff"
        fontSize="16px !important"
        sx={{ mt: 3, mb: 1 }}
      >
        Bank Information
      </Typography>
      <Grid container spacing={2} mb={4}>
        {["bank_name", "name_on_account", "short_code", "account_no"].map(
          (key) => (
            <Grid size={{ xs: 12, sm: 6 }} key={key}>
              <TextField
                className="custom_color"
                fullWidth
                disabled={isDisabledField(key)}
                label={key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
                value={(formData as any)[key] ?? ""}
                onChange={(e) =>
                  handleFieldChange(
                    key as keyof BillingFormData,
                    e.target.value
                  )
                }
              />
            </Grid>
          )
        )}
      </Grid>
      <Divider />

      <Box mt={2}>
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          {hasBillingInfo ? "Update" : "Save"}
        </Button>
      </Box>
    </Box>
  );
};

export default BillingInfo;
