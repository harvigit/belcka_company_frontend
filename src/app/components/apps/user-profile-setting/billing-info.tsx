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
  Alert,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import PhoneInput from "react-phone-input-2";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { IconCheck, IconX } from "@tabler/icons-react";

interface ProjectListingProps {
  companyId: number | null;
  active: boolean;
  onUpdate: () => void;
  userId: any;
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
  cis: string;
  account_id: string;
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
  cis: "",
  account_id:"",
  is_pending_request: false,
  old_data: {},
  new_data: {},
  diff_data: {},
};

const BillingInfo: React.FC<ProjectListingProps> = ({
  companyId,
  active,
  onUpdate,
  userId,
}) => {
  const [billingInfo, setBillingInfo] = useState<BillingFormData | null>(null);
  const [hasBillingInfo, setHasBillingInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [postcodeQuery, setPostcodeQuery] = useState("");
  const [addressOptions, setAddressOptions] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const session = useSession();
  const user = session.data?.user as User & { user_role_id?: number | null } & {
    id: number;
  };

  const isIEPostcode = (value: string) =>
    /^(D6W|[AC-FHKNPRTV-Y]\d{2})\s?[A-Z0-9]{4}$/i.test(value.trim());

  const isAUPostcode = (value: string) => /^\d{4}$/.test(value.trim());

  const isNZPostcode = (value: string) => /^\d{4}$/.test(value.trim());

  const fetchAddresses = async (query: string) => {
    try {
      setLoadingAddresses(true);
      let country = "UK";

      if (isIEPostcode(query)) country = "IE";
      else if (isAUPostcode(query)) country = "AU";
      else if (isNZPostcode(query)) country = "NZ";

      const res = await fetch(
        `https://ws.postcoder.com/pcw/${
          process.env.NEXT_PUBLIC_POSTCODER_KEY
        }/address/${country}/${encodeURIComponent(query)}?format=json`,
      );

      const data = await res.json();
      setAddressOptions(data || []);
    } catch (error) {
      console.error("Postcode lookup failed", error);
      setAddressOptions([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (postcodeQuery.length >= 3) fetchAddresses(postcodeQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [postcodeQuery]);

  /*  Fetch billing info */
  const fetchBillingInfo = async () => {
    if (!userId || !companyId) return;
    try {
      setLoading(true);
      const res = await api.get(
        `user-billing/get-user-billing-info?user_id=${userId}&company_id=${companyId}`,
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
    if (!userId || !active) return;
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
        onUpdate?.();
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
        onUpdate?.();
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
      {user.user_role_id == 1 && billingInfo.is_pending_request === true && (
        <>
          <Box display={"flex"} justifyContent={"space-between"} mb={1}>
            <Typography
              color="#487bb3ff"
              fontSize="16px !important"
              sx={{ mb: 1 }}
            >
              General Information
            </Typography>
          </Box>

          <Box display={"flex"} mb={4}>
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
                  Billing info request is pending, please take an action.
                </Typography>

                <Box>
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<IconCheck size={16} />}
                    onClick={() => handleApprove(billingInfo?.request_log_id)}
                    sx={{ mr: 1 }}
                  >
                    Approve
                  </Button>

                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<IconX size={16} />}
                    onClick={() => handleReject(billingInfo?.request_log_id)}
                  >
                    Reject
                  </Button>
                </Box>
              </Box>
            </Alert>
          </Box>
        </>
      )}

      {user.user_role_id !== 1 && billingInfo.is_pending_request && (
        <Box mb={4} display={"flex"}>
          <Alert severity="error" variant="filled">
            Your billing info request has been pending.
          </Alert>
        </Box>
      )}
      <Grid container spacing={2} mb={2}>
        {[
          "first_name",
          "middle_name",
          "last_name",
          "email",
        ].map((key) => (
          <Grid size={{ xs: 12, sm: 6 }} key={key}>
            <TextField
              fullWidth
              className="custom_color"
              disabled={isDisabledField(key)}
              inputProps={{
                maxLength: key === "address" ? 250 : 50,
                inputMode: "text",
              }}
              label={key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
              value={(formData as any)[key] ?? ""}
              onChange={(e) => {
                let value = e.target.value;

                if (["first_name", "middle_name", "last_name"].includes(key)) {
                  value = value.replace(/[^a-zA-Z\s]/g, "");
                }

                handleFieldChange(key as keyof BillingFormData, value);
              }}
            />
          </Grid>
        ))}

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            className="custom_color"
            disabled={isDisabledField("post_code")}
            label="Post Code"
            value={(formData as any)["post_code"] ?? ""}
            onChange={(e) => {
              let value = e.target.value;
              value = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
              handleFieldChange("post_code", value);
              if (value.length >= 3) {
                setPostcodeQuery(value);
              }
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Autocomplete
            fullWidth
            freeSolo
            disabled={isDisabledField("address")}
            options={addressOptions || []}
            loading={loadingAddresses}
            value={(formData as any)["address"] ?? ""}
            getOptionLabel={(o: any) =>
              typeof o === "string"
                ? o
                : o.summaryline ||
                  `${o.addressline1}, ${o.posttown}`
            }
            isOptionEqualToValue={(o: any, v: any) =>
              typeof o !== "string" &&
              typeof v !== "string" &&
              o.addressline1 === v.addressline1 &&
              o.postcode === v.postcode
            }
            onInputChange={(event, value, reason) => {
              if (reason === "input") setPostcodeQuery(value);
            }}
            onChange={(_, value) => {
              if (!value) return;
              if (typeof value === "string") {
                handleFieldChange("address", value);
              } else {
                handleFieldChange(
                  "address",
                  [
                    value.addressline1,
                    value.addressline2,
                    value.addressline3,
                    value.posttown,
                    value.postcode,
                  ]
                    .filter(Boolean)
                    .join(", ")
                );
                handleFieldChange("post_code", value.postcode || "");
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Address"
                className="custom_color"
                placeholder="Select or type address"
                onChange={(e) => {
                  handleFieldChange("address", e.target.value);
                }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingAddresses && (
                        <CircularProgress size={20} />
                      )}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Grid>

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
              inputProps={{
                maxLength:
                  key === "utr_number" ? 11 : key === "nin_number" ? 9 : 50,
              }}
              label={key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
              value={(formData as any)[key] ?? ""}
              onChange={(e) => {
                let value = e.target.value;
                if (["name_on_utr"].includes(key)) {
                  value = value.replace(/[^a-zA-Z\s]/g, "");
                }

                if (key === "utr_number") {
                  value = value.replace(/\D/g, "").slice(0, 11);
                }

                if (key === "nin_number") {
                  value = value
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .toUpperCase()
                    .slice(0, 9);
                }

                handleFieldChange(key as keyof BillingFormData, value);
              }}
            />
          </Grid>
        ))}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="CIS"
            fullWidth
            disabled={isDisabledField("cis")}
            value={(formData as any)["cis"] ?? ""}
            onChange={(e) =>
              handleFieldChange("cis" as keyof BillingFormData, e.target.value)
            }
            SelectProps={{
              sx: {
                color: "#7297be",
              },
            }}
          >
            <MenuItem value="20" className="custom_color">
              20%
            </MenuItem>
            <MenuItem value="30" className="custom_color">
              30%
            </MenuItem>
          </TextField>
        </Grid>
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
                inputProps={{
                  maxLength:
                    key === "short_code" ? 8 : key === "account_no" ? 15 : 50,
                  inputMode: "text",
                }}
                label={key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
                value={(formData as any)[key] ?? ""}
                onChange={(e) => {
                  let value = e.target.value;
                  if (key === "account_no") {
                    value = value.replace(/[^0-9]/g, "");
                  }
                  if (["name_on_account", "bank_name"].includes(key)) {
                    value = value.replace(/[^a-zA-Z\s]/g, "");
                  }
                  if (key === "short_code") {
                    value = value.replace(/[^a-zA-Z0-9]/g, "");
                    value = value.toUpperCase();
                    value = value.slice(0, 6);
                    if (value.length > 4) {
                      value = `${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4)}`;
                    } else if (value.length > 2) {
                      value = `${value.slice(0, 2)}-${value.slice(2)}`;
                    }
                  }

                  handleFieldChange(key as keyof BillingFormData, value);
                }}
              />
            </Grid>
          ),
        )}
      </Grid>
      <Divider />

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={billingInfo.is_pending_request}
        >
          {hasBillingInfo ? "Update" : "Save"}
        </Button>
      </Box>
    </Box>
  );
};

export default BillingInfo;
