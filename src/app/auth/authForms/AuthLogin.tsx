import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Button,
  Stack,
  Divider,
  MenuItem,
} from "@mui/material";
import Link from "next/link";
import { loginType } from "@/app/(DashboardLayout)/types/auth/auth";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import AuthSocialButtons from "./AuthSocialButtons";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import api from "@/utils/axios";

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [extension, setExtension] = useState("+44");
  const [phone, setPhone] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(30);

  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showVerification && countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [showVerification, countdown]);

  const payload = {
    phone: String(phone).trim(),
    extension: extension.trim(),
  };

  const resendOtp = async () => {
    try {
      setShowVerification(true);
      let response = await api.post("send-otp-login", payload);
      setCountdown(30);
      toast.success(response.data.message);
      setLoading(false);
      return;
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "Unknown error";
      toast.error(message);
    }
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!showVerification) {
      if (phone.trim() && extension.trim()) {
        setLoading(true);
        let response = await api.post("send-otp-login", payload);
        setShowVerification(true);
        setCountdown(30);
        toast.success(response.data.message);
        setLoading(false);
        return;
      } else {
        toast.error("Please enter both country code and phone number.");
        return;
      }
    }

    // if (!otp.trim()) {
    //   toast.error("Please enter the verification code.");
    //   return;
    // }

    const result = await signIn("credentials", {
      redirect: false,
      extension,
      phone,
      otp,
    });

    setLoading(true);
    if (result?.ok) {
      setLoading(false);
      toast.success("Logged in succesfull !!");
      setTimeout(() => {
        // router.push("/");
      }, 300);
    } else {
      toast.error(result?.error ?? "Something went wrong");
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

      <AuthSocialButtons title="Sign in with" />

      <Box mt={3}>
        <Divider>
          <Typography
            component="span"
            color="textSecondary"
            variant="h6"
            fontWeight="400"
            position="relative"
            px={2}
          >
            or sign in with
          </Typography>
        </Divider>
      </Box>

      <form onSubmit={handleLogin}>
          <Box>
          <CustomFormLabel htmlFor="phone">
            What&apos;s your mobile number?
          </CustomFormLabel>
          <Stack direction="row" spacing={2} mt={2}>
            <CustomTextField
              select
              label="Country Code"
              value={extension}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtension(e.target.value)}
              sx={{ width: 150 }}
            >
              <MenuItem value="+44">🇬🇧 United Kingdom (+44)</MenuItem>
              <MenuItem value="+91">🇮🇳 India (+91)</MenuItem>
              <MenuItem value="+1">🇺🇸 United States of America (+1)</MenuItem>
            </CustomTextField>

            <CustomTextField
              id="phone"
              type="number"
              label="Phone"
              fullWidth
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPhone(e.target.value)
              }
            />
          </Stack>

            {/* <CustomFormLabel htmlFor="username">Username</CustomFormLabel>
            <CustomTextField
              id="username"
              type="email"
              variant="outlined"
              fullWidth
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              required
            /> */}
          </Box>

          {showVerification && (
          <Box mt={2}>
            <CustomFormLabel htmlFor="code">
              Enter Verification Code
            </CustomFormLabel>
            <CustomTextField
              id="code"
              type=" number"
              fullWidth
              value={otp}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtp(e.target.value)}
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