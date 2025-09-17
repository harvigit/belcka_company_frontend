"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Typography,
  Box,
  Grid,
  CardContent,
  Button,
  Tab,
  Tabs,
  Badge,
  IconButton,
  CircularProgress,
} from "@mui/material";
import {
  IconArrowLeft,
  IconCheck,
  IconMedal,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Avatar } from "@mui/material";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BlankCard from "@/app/components/shared/BlankCard";

import DigitalIDCard from "@/app/components/common/users-card/UserDigitalCard";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import HealthInfo from "../../user-profile-setting/health-info";
import BillingInfo from "../../user-profile-setting/billing-info";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import Notifications from "../../user-profile-setting/notifications";
import toast from "react-hot-toast";
import ComapnyRate from "../../user-profile-setting/company-rate";
import theme from "@/utils/theme";

dayjs.extend(customParseFormat);

export interface TeamList {
  id: number;
  user_image: string | null;
  email: string | null;
  phone: string | null;
  team_name: string;
  name: string;
  image: string | null;
  status: boolean;
  trade_name: string | null;
  trade_id: number | null;
  first_name: string;
  last_name: string;
  company_name: string;
  extension: string | null;
  is_working: boolean;
}

export interface TradeList {
  trade_id: number;
  name: string;
}

const TablePagination = () => {
  const [data, setData] = useState<TeamList>();
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null } & {
    company_name?: string | null;
  };
  const [phone, setPhone] = useState("");

  const [openIdCard, setOpenIdCard] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const param = useParams();
  const userId = param?.id;
  const [value, setValue] = useState<number>(0);

  const handleTabChange = (event: any, newValue: any) => {
    setValue(newValue);
  };

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    extension: "+44",
    phone: "",
  });

  const handleFieldChange = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get(`user/get-user-lists?user_id=${userId}`);
      if (res.data?.info) {
        const data = res.data.info[0];
        setData(res.data.info[0]);
        const ext = data.extension || "";
        const number = data.phone || "";
        const userInfo = data;
        setFormData({
          first_name: userInfo.first_name || "",
          last_name: userInfo.last_name || "",
          email: userInfo.email || "",
          extension: ext,
          phone: number,
        });
        if (ext && number) {
          const combined = ext.replace("+", "") + number;
          setPhone(combined);
        }
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleUpdatePersonalDetails = async () => {
    if (!userId) return;
    const payload = { user_id: userId, ...formData };
    try {
      const res = await api.post("user/update-profile", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchData();
      }
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !userId) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("user_image", file);
    formData.append("user_id", String(userId));

    try {
      const res = await api.post("user/update-profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.IsSuccess == true) {
        toast.success(res.data.message);
        fetchData();
      }
    } catch (err) {
      console.error("Image upload failed:", err);
    }
  };

  const handlePhoneInputChange = (value: string, country: any) => {
    setPhone(value);

    const ext = "+" + country.dialCode;
    const numberOnly = value.replace(country.dialCode, "");

    handleFieldChange("extension", ext);
    handleFieldChange("phone", numberOnly);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <BlankCard>
        <CardContent>
          <Box
            display="flex"
            alignItems={"center"}
            justifyContent={"space-between"}
          >
            <Box display={"flex"} alignItems={"center"}>
              <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
                <IconArrowLeft />
              </IconButton>

              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                variant="dot"
                sx={{
                  "& .MuiBadge-badge": {
                    backgroundColor: data?.is_working ? "#22bf22" : "#df2626",
                    color: data?.is_working ? "#22bf22" : "#df2626",
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    boxShadow: "0 0 0 2px white",
                  },
                }}
              >
                <label htmlFor="upload-avatar">
                  <Avatar
                    src={
                      data?.user_image
                        ? data?.user_image
                        : "/images/users/user.png"
                    }
                    alt={data?.first_name}
                    sx={{ width: 50, height: 50, cursor: "pointer" }}
                  />
                </label>
                <input
                  type="file"
                  accept="image/*"
                  id="upload-avatar"
                  style={{ display: "none" }}
                  onChange={handleImageUpload}
                />
              </Badge>

              <Typography
                color="textSecondary"
                fontWeight={600}
                mb={1}
                ml={1}
                fontSize={"20px !important"}
              >
                {data?.name ?? null}
              </Typography>
              <Typography
                fontSize={"16px !important"}
                color="textSecondary"
                mb={1}
                ml={4}
              >
                {data?.trade_name}
              </Typography>
            </Box>
            <Box>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  setSelectedUser(data);
                  setOpenIdCard(true);
                }}
              >
                <IconMedal size={30} style={{ cursor: "pointer" }} />
              </Button>
            </Box>
          </Box>
        </CardContent>
      </BlankCard>

      <Grid container spacing={2} mt={3}>
        <Grid
          display={"block"}
          justifyContent={"center"}
          overflow={"visible"}
          size={{
            xs: 3,
            lg: 3,
          }}
        >
          <BlankCard>
            <Box sx={{ m: 3 }} className="person_info_wrapper">
              <Box
                display={"flex"}
                justifyContent={"space-between"}
                alignItems={"baseline"}
              >
                <Typography fontSize="16px !important" color="#487bb3ff">
                  Personal Details
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUpdatePersonalDetails}
                >
                  Update
                </Button>
              </Box>
              <form>
                <Typography color="textSecondary" variant="h5" mt={2}>
                  First Name
                </Typography>
                <CustomTextField
                  id="first_name"
                  className="custom_color"
                  name="first_name"
                  placeholder="Enter first name.."
                  value={formData.first_name}
                  onChange={(e: any) =>
                    handleFieldChange("first_name", e.target.value)
                  }
                  fullWidth
                />

                <Typography color="textSecondary" variant="h5" mt={2}>
                  Last Name
                </Typography>
                <CustomTextField
                  id="last_name"
                  name="last_name"
                  className="custom_color"
                  placeholder="Enter last name.."
                  value={formData.last_name}
                  onChange={(e: any) =>
                    handleFieldChange("last_name", e.target.value)
                  }
                  fullWidth
                />

                <Typography color="textSecondary" variant="h5" mt={2} mb={1}>
                  Mobile phone
                </Typography>
                <PhoneInput
                  country={"gb"}
                  value={phone}
                  onChange={handlePhoneInputChange}
                  inputStyle={{
                    width: "100%",
                    borderColor: "#c0d1dc9c",
                  }}
                  inputClass="phone-input"
                  enableSearch
                />

                <Typography color="textSecondary" variant="h5" mt={2}>
                  Email
                </Typography>
                <CustomTextField
                  id="email"
                  name="email"
                  className="custom_color"
                  placeholder="Enter email.."
                  value={formData.email}
                  onChange={(e: any) =>
                    handleFieldChange("email", e.target.value)
                  }
                  fullWidth
                />
              </form>
            </Box>
          </BlankCard>
        </Grid>

        <Grid
          size={{
            xs: 9,
            lg: 9,
          }}
          sx={{ boxShadow: (theme) => theme.shadows[8] }}
        >
          <BlankCard>
            <Box>
              <Tabs
                className="user-tabs"
                value={value}
                onChange={handleTabChange}
                aria-label="Sidebar Tabs"
                sx={{
                  borderRadius: "12px",
                  minHeight: "40px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                {[
                  "Health Info",
                  "Billing Info",
                  "Rate",
                  "Notification Settings",
                ].map((label, index) => (
                  <Tab
                    key={label}
                    label={label}
                    sx={{
                      textTransform: "none",
                      borderRadius: "10px",
                      px: 3,
                      py: 0.5,
                      fontSize: "14px",
                      fontWeight: value === index ? "600" : "400",
                      transition: "all 0.3s ease",
                    }}
                  />
                ))}
              </Tabs>
            </Box>
            <Box>
              <Box hidden={value !== 0}>
                <HealthInfo userId={Number(userId)} active={value === 0} />
              </Box>
              <Box hidden={value !== 1}>
                <BillingInfo
                  companyId={Number(user.company_id)}
                  active={value === 1}
                />
              </Box>
              <Box hidden={value !== 2}>
                <ComapnyRate active={value === 2} />
              </Box>
              <Box hidden={value !== 3}>
                <Notifications
                  companyId={Number(user.company_id)}
                  active={value === 3}
                />
              </Box>
            </Box>
          </BlankCard>
        </Grid>
      </Grid>
      {openIdCard && (
        <DigitalIDCard
          open={openIdCard}
          onClose={() => setOpenIdCard(false)}
          user={selectedUser}
        />
      )}
    </Box>
  );
};

export default TablePagination;
