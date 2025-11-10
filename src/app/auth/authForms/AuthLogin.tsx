import React, { useEffect, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { loginType } from "@/app/(DashboardLayout)/types/auth/auth";
import Link from "next/link";

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [extension, setExtension] = useState("+44");
  const [nationalPhone, setNationalPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

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
      setCountdown(30);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "Unknown error";
      toast.error(message);
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

    const payload = {
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
        setShowVerification(true);
        setCountdown(30);
        return;
      }

      if (!otp.trim()) {
        toast.error("Please enter the verification code.");
        return;
      }

      const result = await signIn("credentials", {
        redirect: false,
        ...payload,
        callbackUrl: "/apps/users/list",
      });

      if (result?.ok) {
        window.location.href = "/apps/users/list";
        toast.success("Logged in successfully!!");
      } else {
        toast.error(result?.error || "Login failed");
      }
    } catch (error: any) {
      // const message =
      //   error?.response?.data?.message || error?.message || "Login failed";
      // toast.error(message);
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
              inputStyle={{ width: "100%"}}
              // containerStyle={{ width: 300 }}
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                if (/^\d{0,6}$/.test(value)) {
                  setOtp(value);
                }
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
