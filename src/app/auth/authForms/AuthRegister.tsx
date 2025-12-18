"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Avatar,
  Dialog,
  DialogContent,
  Tabs,
  Tab,
  TextField,
  Autocomplete,
  IconButton,
  Paper,
  Tooltip,
} from "@mui/material";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import { signIn } from "next-auth/react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { loginType } from "@/app/(DashboardLayout)/types/auth/auth";
import { IconX } from "@tabler/icons-react";
import { Grid } from "@mui/system";

const AuthRegister = ({ title, subtitle, subtext }: loginType) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [openCompanyModal, setOpenCompanyModal] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [companyCode, setCompanyCode] = useState(["", "", "", "", "", ""]);
  const [trade, setTrade] = useState<any[]>([]);
  const [user, setUser] = useState<any>({});
  const [id, setId] = useState(0);
  const [companyId, setCompanyId] = useState(0);
  const [token, setToken] = useState("");
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [businessFields, setBusinessFields] = useState([]);
  const [teamSizes, setTeamSizes] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [step, setStep] = useState(1);
  const [canCloseModal, setCanCloseModal] = useState(false);

  const [registerData, setRegisterData] = useState({
    first_name: "",
    last_name: "",
    extension: "+44",
    phone: "",
    nationalPhone: "",
    otp: "",
    user_image: null as File | null,
  });

  const [joinData, setJoinData] = useState({
    company_code: ["", "", "", "", "", ""],
    trade_id: 0,
  });

  const [createData, setCreateData] = useState({
    name: "",
    email: "",
    phone: "",
    extension: "+44",
    nationalPhone: "",
    business_field_id: "",
    team_size_id: "",
    company_image: null as File | null,
  });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    registerData.user_image = file;
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  const handleCompanyImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    createData.company_image = file;
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^[0-9a-zA-Z]?$/.test(value)) return;
    const newCode = [...companyCode];
    newCode[index] = value.toUpperCase();
    setCompanyCode(newCode);
    joinData.company_code = newCode;
    if (value && index < 5) {
      const next = document.getElementById(`code-${index + 1}`);
      next?.focus();
    }
    const fullCode = newCode.join("");
    if (fullCode.length === 6) {
      validateCompanyCode(fullCode);
    }
  };

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setLoadingDropdowns(true);
        const [businessRes, teamRes] = await Promise.all([
          api.get("get-company-resources?flag=industryList"),
          api.get("get-company-resources?flag=numberOfEmployeeList"),
        ]);
        setBusinessFields(businessRes.data.info || []);
        setTeamSizes(teamRes.data.info || []);
      } catch (error) {
        console.error("Dropdown fetch error:", error);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdownData();
  }, []);

  // resend otp
  const resendOtp = async () => {
    try {
      setLoading(true);
      const payload = {
        extension: registerData.extension,
        phone: registerData.nationalPhone,
      };
      const res = await api.post("send-otp-register", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        setShowVerification(true);
        setCountdown(30);
      }
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
  };

  // register new user
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { first_name, last_name, extension, nationalPhone, otp, user_image } =
      registerData;

    if (!first_name.trim() || !last_name.trim())
      return toast.error("Please enter your full name.");
    if (!nationalPhone) return toast.error("Please enter your phone number.");

    const payload = {
      extension,
      phone: nationalPhone,
      first_name,
      last_name,
      otp,
      is_web: true,
    };

    try {
      setLoading(true);
      if (!showVerification) {
        const res = await api.post("send-otp-register", payload);
        if (res.data.IsSuccess) {
          toast.success(res.data.message);
          setShowVerification(true);
          setCountdown(30);
          return;
        }
      }

      if (!otp.trim())
        return toast.error("Please enter the verification code.");

      await api.post("verify-register-otp", payload);

      const formData = new FormData();
      formData.append("extension", extension);
      formData.append("phone", nationalPhone);
      formData.append("otp", otp);
      formData.append("first_name", first_name);
      formData.append("last_name", last_name);
      formData.append("is_web", "true");
      if (user_image) formData.append("user_image", user_image);

      const res = await api.post("app-registration", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.IsSuccess) {
        setUser(res.data.info);
        setId(res.data.info.id);
        setToken(res.data.info.authToken);
        setOpenCompanyModal(true);
        toast.success(res.data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // check team otp
  const validateCompanyCode = async (code: string) => {
    try {
      setLoading(true);
      const res = await api.get(`company/validate-team-otp?otp=${code}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        setCompanyId(res.data.info.company_id);
        setIsCodeVerified(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // join company
  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinData.company_code.join("");
    if (code.length !== 6) return toast.error("Enter full company code");

    try {
      setLoading(true);
      const payload = {
        otp: code,
        trade_id: joinData.trade_id,
        auth_id: user.id,
      };

      const res = await api.post("company/join-company", payload, {
        headers: { Authorization: `Bearer ${token}`, is_web: "true" },
      });
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        setCanCloseModal(true);
        login();
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  // create new company
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      name,
      email,
      nationalPhone,
      extension,
      company_image,
      business_field_id,
      team_size_id,
    } = createData;

    if (!name.trim()) return toast.error("Enter company name");
    if (!email.trim()) return toast.error("Enter bussiness email");
    if (!business_field_id) return toast.error("Select a business field");
    if (!team_size_id) return toast.error("Select a team size");

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("phone", nationalPhone);
      formData.append("extension", extension);
      formData.append("created_by", user.id);
      formData.append("business_id", business_field_id);
      formData.append("team_size_id", team_size_id);
      if (company_image) formData.append("company_image", company_image);

      const res = await api.post("company/company-app-registration", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
          is_web: "true",
        },
      });
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        setCanCloseModal(true);
        login();
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  // trades
  const fetchTrades = async () => {
    try {
      const res = await api.get(
        `get-company-resources?flag=tradeList&company_id=${companyId}`
      );
      if (res.data?.info) setTrade(res.data.info);
    } catch (err) {}
  };

  const sendLoginOtp = async () => {
    const payload = {
      extension: registerData.extension,
      phone: registerData.nationalPhone,
    };
    const res = await api.post("send-otp-login", payload);

    if (res.data.IsSuccess) {
      return res.data.otp;
    }
    setToken("");
    return false;
  };

  const login = async () => {
    setLoading(true);
    const newOtp = await sendLoginOtp();

    if (!newOtp) {
      toast.error("Failed to send login OTP");
      return;
    }
    setLoading(false);

    const response = await signIn("credentials", {
      redirect: false,
      extension: registerData.extension,
      phone: registerData.nationalPhone,
      otp: String(newOtp),
      is_web: true,
      callbackUrl: "/apps/users/list",
    });

    if (response?.ok) {
      setToken("");
      window.location.href = "/apps/users/list";
    } else {
      toast.error(response?.error || "Login failed after registration");
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchTrades();
    }
  }, [isCodeVerified]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createData.name || !createData.email) {
      toast.error("Please fill all required fields");
      return;
    }
    setStep(2);
  };

  return (
    <>
      <form onSubmit={handleRegister} style={{ width: "100%" }}>
        <Box>
          <Box textAlign="center" mb={3}>
            <label htmlFor="upload-image">
              <Avatar
                src={imagePreview || "/images/users/user.jpg"}
                alt="User"
                sx={{
                  width: 80,
                  height: 80,
                  mx: "auto",
                  mb: 1,
                  border: "2px solid #ddd",
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              />
            </label>
            <input
              accept="image/*"
              id="upload-image"
              type="file"
              style={{ display: "none" }}
              onChange={handleImageChange}
            />
            <Typography variant="caption" color="textSecondary">
              Upload your profile picture
            </Typography>
          </Box>

          <Box className="form_inputs" mb={2} display={"flex"} gap={2}>
            <TextField
              value={registerData.first_name}
              onChange={(e: any) =>
                setRegisterData({ ...registerData, first_name: e.target.value })
              }
              label="First name"
              autoFocus
            />

            <TextField
              value={registerData.last_name}
              onChange={(e: any) =>
                setRegisterData({ ...registerData, last_name: e.target.value })
              }
              label="Last name"
              autoFocus
            />
          </Box>

          <PhoneInput
            country={"gb"}
            value={registerData.phone}
            onChange={(phone, country: any) =>
              setRegisterData({
                ...registerData,
                nationalPhone: phone.slice(country.dialCode.length),
                extension: `+${country.dialCode}`,
              })
            }
            inputStyle={{
              height: "47px",
              width: "48%",
              borderColor: "#c0d1dc9c",
            }}
            enableSearch
            inputProps={{ required: true }}
          />
        </Box>

        {showVerification && (
          <Box mt={3}>
            <CustomFormLabel htmlFor="code">
              Enter Verification Code
            </CustomFormLabel>
            <CustomTextField
              id="code"
              type="text"
              fullWidth
              value={registerData.otp}
              onChange={(e: any) => {
                if (/^\d{0,6}$/.test(e.target.value)) {
                  setRegisterData({ ...registerData, otp: e.target.value });
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

        <Box my={3}>
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
              ? "Verify & Register"
              : "Continue"}
          </Button>
        </Box>
      </form>

      {subtitle}

      {/* Company Modal */}
      <Dialog
        open={openCompanyModal}
        onClose={() => {
          if (canCloseModal) setOpenCompanyModal(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent>
          <Box display="flex" justifyContent="space-between">
            <Tabs
              value={tabValue}
              onChange={(e, newVal) => setTabValue(newVal)}
              centered
              sx={{ mb: 3 }}
            >
              <Tab label="Join Company" />
              <Tab label="Create Company" />
            </Tabs>
            <Tooltip
              placement="top"
              title={
                canCloseModal ? "Close" : "Complete company setup to close"
              }
            >
              <span>
                <IconButton
                  onClick={() => {
                    if (canCloseModal) setOpenCompanyModal(false);
                  }}
                  disabled={!canCloseModal}
                >
                  <IconX />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {tabValue === 0 && (
            <form onSubmit={handleJoinCompany}>
              <Typography textAlign={"center"}>
                Enter 6-digit Company Code
              </Typography>
              <Stack
                display={"block"}
                direction="row"
                justifyContent="center"
                textAlign={"center"}
                spacing={1}
                mt={1}
              >
                {companyCode.map((val, i) => (
                  <TextField
                    sx={{ mt: 1 }}
                    type="text"
                    key={i}
                    id={`code-${i}`}
                    value={val}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d{0,6}$/.test(value)) {
                        handleCodeChange(i, value);
                      }
                    }}
                    inputProps={{
                      maxLength: 1,
                      inputMode: "numeric",
                      pattern: "[0-9]*",
                      style: {
                        textAlign: "center",
                        fontSize: "1.5rem",
                        width: "20px",
                      },
                    }}
                  />
                ))}
              </Stack>
              <Typography color="textSecondary" mt={2}>
                Use your company&apos;s unique 6-digit code.if you&apos;ve been
                join the company.
              </Typography>
              {isCodeVerified && (
                <>
                  <Box mt={2}>
                    <Typography mb={1}>Select trade</Typography>
                    <Autocomplete
                      className="trade-selection"
                      size="small"
                      options={trade}
                      value={
                        trade.find((t: any) => t.id === joinData.trade_id) ??
                        null
                      }
                      onChange={(e, val) =>
                        setJoinData({
                          ...joinData,
                          trade_id: val ? Number(val.id) : 0,
                        })
                      }
                      getOptionLabel={(option) => option.name}
                      isOptionEqualToValue={(option, value) =>
                        option.id === value.id
                      }
                      renderInput={(params) => (
                        <CustomTextField
                          {...params}
                          placeholder="Select Trade"
                        />
                      )}
                    />
                  </Box>

                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ mt: 3 }}
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Joining..." : "Join Company"}
                  </Button>
                </>
              )}
            </form>
          )}

          {/* Register new company */}
          {tabValue === 1 && (
            <>
              {/* basic info */}
              {step === 1 && (
                <form onSubmit={handleNext}>
                  <Typography fontWeight={500} mb={2}>
                    What&apos;s your comapany details?
                  </Typography>

                  <Box textAlign="center" mb={3}>
                    <label htmlFor="upload-company-image">
                      <Avatar
                        src={preview || "/images/users/company.png"}
                        alt="Company Image"
                        sx={{
                          width: 80,
                          height: 80,
                          mx: "auto",
                          mb: 1,
                          border: "2px solid #ddd",
                          borderRadius: 3,
                          cursor: "pointer",
                        }}
                      />
                    </label>
                    <input
                      accept="image/*"
                      id="upload-company-image"
                      type="file"
                      style={{ display: "none" }}
                      onChange={handleCompanyImageChange}
                    />
                    <Typography variant="caption" color="textSecondary">
                      Upload your company logo
                    </Typography>
                  </Box>

                  <Typography mb={1}>Company Name</Typography>
                  <CustomTextField
                    fullWidth
                    value={createData.name}
                    onChange={(e: any) =>
                      setCreateData({ ...createData, name: e.target.value })
                    }
                  />

                  <Typography mb={1} mt={2}>
                    Business Email
                  </Typography>
                  <CustomTextField
                    fullWidth
                    value={createData.email}
                    onChange={(e: any) =>
                      setCreateData({ ...createData, email: e.target.value })
                    }
                  />

                  <Typography mb={1} mt={2}>
                    Mobile Number
                  </Typography>
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
                    inputStyle={{ width: "100%", height: "47px" }}
                    enableSearch
                    inputProps={{ required: true }}
                  />

                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ mt: 3 }}
                    type="submit"
                  >
                    Continue
                  </Button>
                </form>
              )}

              {/* select team size */}
              {step === 2 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStep(3);
                  }}
                >
                  <Typography mb={1} fontSize={"16px !important"}>
                    How many users are on your team?
                  </Typography>

                  <Grid container spacing={2}>
                    {teamSizes.map((field: any) => (
                      <Grid size={{ xs: 6 }} key={field.id}>
                        <Paper
                          onClick={() =>
                            setCreateData({
                              ...createData,
                              team_size_id: field.id,
                            })
                          }
                          sx={{
                            textAlign: "center",
                            p: 1.5,
                            borderRadius: 2,
                            cursor: "pointer",
                            border:
                              createData.team_size_id === field.id
                                ? "2px solid #1976d2"
                                : "1px solid #ddd",
                            backgroundColor:
                              createData.team_size_id === field.id
                                ? "#E3F2FD"
                                : "#fff",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": { borderColor: "#1976d2" },
                          }}
                        >
                          <Typography fontWeight={500}>{field.name}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>

                  <Box display="flex" justifyContent="space-between" mt={3}>
                    <Button variant="outlined" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      type="submit"
                      disabled={!createData.team_size_id}
                    >
                      Continue
                    </Button>
                  </Box>
                </form>
              )}

              {/* select bussiness field */}
              {step === 3 && (
                <form onSubmit={handleCreateCompany}>
                  <Typography mb={1} fontSize={"16px !important"}>
                    Which field best describes your business?
                  </Typography>

                  {businessFields.map((field: any) => (
                    <Paper
                      key={field.id}
                      onClick={() =>
                        setCreateData({
                          ...createData,
                          business_field_id: field.id,
                        })
                      }
                      sx={{
                        textAlign: "center",
                        p: 1.5,
                        borderRadius: 2,
                        cursor: "pointer",
                        border:
                          createData.business_field_id === field.id
                            ? "2px solid #1976d2"
                            : "1px solid #ddd",
                        backgroundColor:
                          createData.business_field_id === field.id
                            ? "#E3F2FD"
                            : "#fff",
                        transition: "all 0.2s ease-in-out",
                        "&:hover": { borderColor: "#1976d2" },
                        mb: 1,
                      }}
                    >
                      <Typography fontWeight={500}>{field.name}</Typography>
                    </Paper>
                  ))}

                  <Box display="flex" justifyContent="space-between" mt={3}>
                    <Button
                      variant="outlined"
                      onClick={() => setStep(2)}
                      disabled={loading}
                    >
                      Back
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      type="submit"
                      disabled={!createData.business_field_id || loading}
                    >
                      {loading ? "Creating..." : "Finish"}
                    </Button>
                  </Box>
                </form>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AuthRegister;
