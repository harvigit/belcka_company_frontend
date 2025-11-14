import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import { signIn } from "next-auth/react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { loginType } from "@/app/(DashboardLayout)/types/auth/auth";

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const [phone, setPhone] = useState("");
  const [extension, setExtension] = useState("+44");
  const [nationalPhone, setNationalPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [company, setCompany] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const resendOtp = async () => {
    try {
      setLoading(true);
      setShowVerification(true);

      const payload = {
        extension,
        phone: nationalPhone,
      };

      const response = await api.post("send-otp-login", payload);

      toast.success(response.data.message);

      if (response.data.IsSuccess === true) {
        setCompany(response.data.info || []);
      }

      setCountdown(30);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!extension || !nationalPhone) {
      toast.error("Please enter your phone number.");
      return;
    }

    const payload: any = {
      extension,
      phone: nationalPhone,
      otp,
      is_web: true,
    };

    try {
      setLoading(true);

      if (!showVerification) {
        const response = await api.post("send-otp-login", payload);

        toast.success(response.data.message);

        if (response.data.IsSuccess === true) {
          setCompany(response.data.info || []);
        }

        setShowVerification(true);
        setCountdown(30);
        return;
      }

      if (!otp.trim()) {
        toast.error("Please enter the verification code.");
        return;
      }

      if (company?.length >= 2) {
        if (!selectedCompany) {
          toast.error("Please select your company");
          return;
        }
        payload.company_id = selectedCompany;
      }

      const result = await signIn("credentials", {
        redirect: false,
        ...payload,
        callbackUrl: "/apps/users/list",
      });

      if (result?.ok) {
        toast.success("Logged in successfully!!");
        window.location.href = "/apps/users/list";
      } else {
        toast.error(result?.error || "Login failed");
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {title && (
        <Typography fontWeight="700" variant="h3" mb={1}>
          {title}
        </Typography>
      )}
      {subtext}

      <form onSubmit={handleLogin}>
        <Box>
          <CustomFormLabel htmlFor="phone">
            What&apos;s your mobile number?
          </CustomFormLabel>

          <Box mt={2}>
            <PhoneInput
              country={"gb"}
              value={phone}
              onChange={(value, country: any) => {
                setPhone(value);
                setExtension("+" + country.dialCode);

                const numberOnly = value.replace(country.dialCode, "");
                setNationalPhone(numberOnly);
              }}
              inputStyle={{ width: "100%" }}
              enableSearch
              inputProps={{ required: true }}
            />
          </Box>
        </Box>

        {showVerification && (
          <Box mt={2}>
            <CustomFormLabel htmlFor="code">
              Enter Verification Code
            </CustomFormLabel>

            <CustomTextField
              id="code"
              type="text"
              fullWidth
              value={otp}
              onChange={(e: any) => {
                const value = e.target.value;
                if (/^\d{0,6}$/.test(value)) setOtp(value);
              }}
              inputProps={{
                maxLength: 6,
                inputMode: "numeric",
                pattern: "[0-9]*",
              }}
            />

            <Stack direction="row" justifyContent="space-between" mt={1}>
              <Typography variant="body2" color="textSecondary">
                {countdown > 0
                  ? `Resend in 00:${countdown < 10 ? "0" : ""}${countdown}`
                  : "Didn’t get the code?"}
              </Typography>

              {countdown === 0 && (
                <Typography
                  variant="body2"
                  sx={{
                    cursor: "pointer",
                    color: "primary.main",
                    fontWeight: 500,
                  }}
                  onClick={resendOtp}
                >
                  Resend Now
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        {showVerification && company?.length >= 2 && (
          <Box mt={2}>
            <CustomFormLabel>Select Company</CustomFormLabel>
            <Select
              name="supervisor_id"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              fullWidth
              displayEmpty
            >
              <MenuItem value={0}>Select Supervisor</MenuItem>
              {company.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}

        <Box my={2}>
          <Button
            color="primary"
            variant="contained"
            size="large"
            fullWidth
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Loading..."
              : showVerification
              ? "Verify & Continue"
              : "Continue"}
          </Button>
        </Box>
      </form>
      {subtitle}
    </>
  );
};

export default AuthLogin;
