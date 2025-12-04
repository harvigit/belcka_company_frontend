import React, { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import { getSession, signIn, useSession } from "next-auth/react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { loginType } from "@/app/(DashboardLayout)/types/auth/auth";
import { IconX } from "@tabler/icons-react";
import { Grid } from "@mui/system";
import { useRouter } from "next/navigation";

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
  const [showCompanyPopup, setShowCompanyPopup] = useState(false);
  const openCompanyPopup = () => setShowCompanyPopup(true);
  const [canCloseModal, setCanCloseModal] = useState(false);
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);
  const [businessFields, setBusinessFields] = useState([]);
  const [teamSizes, setTeamSizes] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [id, setId] = useState(0);
  const [token, setToken] = useState("");
  const { data: session, update } = useSession();
  const router = useRouter();
  const [createData, setCreateData] = useState({
    name: "",
    email: "",
    phone: "",
    extension: "+44",
    nationalPhone: "",
    business_id: "",
    team_size_id: "",
    company_image: null as File | null,
  });

  const handleCompanyImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    setCreateData((prev) => ({
      ...prev,
      company_image: file,
    }));

    if (file) setPreview(URL.createObjectURL(file));
  };

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
        if (!response.data.info || response.data.info.length === 0) {
          openCompanyPopup();
        }

        setCompany(response.data.info || []);
        setId(response.data.id);
        setToken(response.data.token);
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
          if (!response.data.info || response.data.info.length === 0) {
            openCompanyPopup();
          }

          setCompany(response.data.info || []);
          setId(response.data.id);
          setToken(response.data.token);
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

      if (result?.error === "NO_COMPANY") {
        openCompanyPopup();
        return;
      }

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

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createData.name || !createData.email) {
      toast.error("Please fill all required fields");
      return;
    }
    setStep(2);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    const {
      name,
      email,
      nationalPhone,
      extension,
      company_image,
      business_id,
      team_size_id,
    } = createData;

    if (!name.trim()) return toast.error("Enter company name");
    if (!email.trim()) return toast.error("Enter business email");
    if (!business_id) return toast.error("Select a business field");
    if (!team_size_id) return toast.error("Select a team size");

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("phone", createData.nationalPhone);
      formData.append("extension", createData.extension);
      formData.append("created_by", String(id));
      formData.append("business_id", business_id);
      formData.append("team_size_id", team_size_id);

      if (company_image) {
        formData.append("company_image", company_image);
      }

      const res = await api.post("company/company-app-registration", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          is_web: "true",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.IsSuccess) {
        const updated = res.data.info;

        await update({
          user: {
            ...updated,
            token: updated.authToken,
          },
          accessToken: updated.authToken,
        });

        toast.success(res.data.message);
        setCanCloseModal(false);
        login();
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // login registered user
  const login = async () => {
    const response = await signIn("credentials", {
      redirect: false,
      extension: extension,
      phone: nationalPhone,
      otp: otp,
      login: true,
      is_web: true,
      callbackUrl: "/apps/users/list",
    });
    if (response?.ok) {
      window.location.href = "/apps/users/list";
    } else {
      toast.error(response?.error || "Login failed after registration");
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

      {/* Company Modal */}
      <Dialog
        open={showCompanyPopup}
        onClose={() => {
          if (canCloseModal) setShowCompanyPopup(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems={"center"}
            mb={1}
          >
            <Typography sx={{ fontSize: "16px !important" }} variant="h1">
              Create new company
            </Typography>
            <Tooltip
              placement="top"
              title={
                canCloseModal ? "Close" : "Complete company setup to close"
              }
            >
              <span>
                <IconButton
                  onClick={() => {
                    if (canCloseModal) setShowCompanyPopup(false);
                  }}
                  disabled={!canCloseModal}
                >
                  <IconX />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
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
                        business_id: field.id,
                      })
                    }
                    sx={{
                      textAlign: "center",
                      p: 1.5,
                      borderRadius: 2,
                      cursor: "pointer",
                      border:
                        createData.business_id === field.id
                          ? "2px solid #1976d2"
                          : "1px solid #ddd",
                      backgroundColor:
                        createData.business_id === field.id
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
                    disabled={!createData.business_id || loading}
                  >
                    {loading ? "Creating..." : "Finish"}
                  </Button>
                </Box>
              </form>
            )}
          </>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AuthLogin;
