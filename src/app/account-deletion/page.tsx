"use client";

import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  FormControlLabel,
  Paper,
  Divider,
} from "@mui/material";

import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import CustomCheckbox from "../components/forms/theme-elements/CustomCheckbox";
import { IconAlertTriangle } from "@tabler/icons-react";
import Link from "next/link";

const DeleteAccount = () => {
  const [step, setStep] = useState(1);

  const [createData, setCreateData] = useState({
    phone: "",
    nationalPhone: "",
    extension: "",
  });

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [agree, setAgree] = useState(false);

  const [userData, setUserData] = useState<any>(null);

  const inputs = useRef<any[]>([]);

  //  send otp

  const sendOtp = async () => {
    try {
      const payload = {
        is_web: "false",
        extension: createData.extension,
        phone: createData.nationalPhone,
      };

      const res = await api.post("send-otp-login", payload);

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        setStep(2);
      }
    } catch {}
  };

  //  verify otp
  const verifyOtp = async () => {
    try {
      const enteredOtp = otp.join("");

      const payload = {
        extension: createData.extension,
        phone: createData.nationalPhone,
        otp: enteredOtp,
      };

      const res = await api.post("app-login", payload);

      if (res.data.IsSuccess) {
        setUserData(res.data.info);
        setFirstName(res.data.info.first_name);
        setLastName(res.data.info.last_name);
        setStep(3);
      }
    } catch {}
  };

  // delete account

  const deleteAccount = async () => {
    if (!userData) return;

    if (
      (firstName ?? "").toLowerCase().trim() !==
        (userData.first_name ?? "").toLowerCase().trim() ||
      (lastName ?? "").toLowerCase().trim() !==
        (userData.last_name ?? "").toLowerCase().trim()
    ) {
      toast.error("Name does not match registered account");
      return;
    }

    if (!agree) {
      toast.error("Please confirm deletion");
      return;
    }

    try {
      const payload = {
        user_id: userData.id,
        company_id: userData.company_id,
      };

      const res = await api.post("user/delete-account", payload);

      if (res.data.IsSuccess) {
        setStep(4);
      }
    } catch {}
  };

  //otp verification

  const handleOtpChange = (value: string, index: number) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;

    setOtp(newOtp);

    if (value && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e: any, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      p={2}
    >
      <Box width="100%" maxWidth={420}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            boxShadow: 4,
          }}
        >
          {/* STEP 1 */}
          {step === 1 && (
            <>
              <Typography
                variant="h4"
                fontWeight={600}
                mb={2}
                textAlign={"center"}
              >
                Delete Your Account
              </Typography>
              <Typography mb={2}>We are sorry to see you go</Typography>
              <Typography mb={2}>
                To verify your identity please enter your phone number
              </Typography>
              <Typography mb={2}>
                Once deleted, your account and associated data cannot be
                recovered.
              </Typography>

              <Typography mb={1}>Phone Number</Typography>

              <PhoneInput
                country={"gb"}
                value={createData.phone}
                onChange={(phone, country: any) =>
                  setCreateData({
                    ...createData,
                    phone,
                    nationalPhone: phone.slice(country.dialCode.length),
                    extension: `+${country.dialCode}`,
                  })
                }
                inputStyle={{
                  width: "100%",
                  height: "50px",
                  fontSize: "16px",
                  backgroundColor:"transparent"
                }}
                enableSearch
              />
              <Typography
                color="text.secondary"
                className="f-14"
                mb={1}
                mt={1}
                sx={{ listStyle: "circle" }}
              >
                Your data will be permanent deleted from our system.
              </Typography>

              <Typography
                color="text.secondary"
                className="f-14"
                mb={1}
                sx={{ listStyle: "circle" }}
              >
                This action cannot be undone.
              </Typography>
              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 3 }}
                onClick={sendOtp}
              >
                Verify Account
              </Button>
            </>
          )}

          {/* STEP 2 OTP */}
          {step === 2 && (
            <>
              <Typography variant="h5" fontWeight={600} mb={2}>
                Verify OTP
              </Typography>

              <Typography color="text.secondary" mb={3}>
                Enter the 6 digit code sent to your phone.
              </Typography>

              <Grid container spacing={1} justifyContent={"center"}>
                {otp.map((digit, index) => (
                  <Grid key={index}>
                    <TextField
                      inputRef={(el) => (inputs.current[index] = el)}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      type="tel"
                      inputMode="numeric"
                      inputProps={{
                        maxLength: 1,
                        style: {
                          textAlign: "center",
                          fontSize: "16px",
                          width: "17px",
                          height: "3%",
                          padding: "8px",
                        },
                      }}
                    />
                  </Grid>
                ))}
              </Grid>

              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 3 }}
                onClick={verifyOtp}
              >
                Verify OTP
              </Button>
            </>
          )}

          {/* STEP 3 CONFIRM DELETE */}
          {step === 3 && (
            <>
              <Typography
                variant="h4"
                fontWeight={600}
                mb={2}
                textAlign={"center"}
              >
                Confirm Account Deletion
              </Typography>

              <Typography mb={3}>
                Please confirm your identity by entering your name exactly as
                registered on your account.
              </Typography>

              <TextField
                fullWidth
                label="First Name"
                sx={{ mb: 2 }}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />

              <TextField
                fullWidth
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />

              <FormControlLabel
                sx={{ mt: 2 }}
                color="text.secondary"
                control={
                  <CustomCheckbox
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                  />
                }
                label="I understand deleting my account will remove all data."
              />

              <Box
                mt={2}
                display={"flex"}
                alignItems={"flex-start"}
                gap={2}
                justifyContent={"center"}
              >
                <Typography color="error">
                  {" "}
                  <IconAlertTriangle size={20} />
                </Typography>
                <Typography color="error" className="f-14">
                  This action is permanent and cannot be reversed.
                </Typography>
              </Box>
              <Box mt={3}>
                <Button
                  fullWidth
                  color="error"
                  variant="contained"
                  disabled={!agree}
                  onClick={deleteAccount}
                >
                  Delete My Account
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setStep(1)}
                  sx={{ mt: 2 }}
                >
                  Cancel
                </Button>
              </Box>
            </>
          )}

          {/* STEP 4 SUCCESS */}
          {step === 4 && (
            <>
              <Box>
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    bgcolor: "success.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 35,
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  ✓
                </Box>
                <Typography fontWeight={500} mb={1} textAlign="center">
                  Your account has been successfully deleted.
                </Typography>
                <Typography color="text.secondary" mb={3}>
                  All personal data associated with your account has been
                  removed.
                </Typography>
                <Divider sx={{ mb: 2, mt: 2 }} />

                <Typography mb={2}>
                  If you change your mind, you can create a new account anytime.
                </Typography>
                <Typography>Thank you for using Belcka.</Typography>
                <Divider sx={{ mb: 2, mt: 2 }} />

                <Button
                  fullWidth
                  variant="contained"
                  component={Link}
                  href="/auth"
                >
                  Return to Home Page
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default DeleteAccount;
