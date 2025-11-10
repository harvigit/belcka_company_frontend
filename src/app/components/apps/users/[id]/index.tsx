"use client";
import React, { useEffect, useState } from "react";
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
    CircularProgress, Card,
} from '@mui/material';
import {
  IconArrowLeft,
  IconEdit,
  IconMedal,
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
  const searchParams = useSearchParams();
   
  const { data: session, update } = useSession();
    const user = session?.user as User & {
        company_id?: number | null;
        company_name?: string | null;
        user_image?: string | null;
        id: number;
        user_thumb_image?: string | null;
        user_role_id?: number | null;
    };

    const userRole = user?.user_role_id;  
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
    expired_at: "",
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
          expired_at: userInfo.expired_at
            ? userInfo.expired_at.split("T")[0]
            : "",
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
        if (Number(userId) === Number(user?.id)) {
          await update({
            ...session,
            user: {
              ...session?.user,
              first_name: formData.first_name,
              last_name: formData.last_name,
              email: formData.email,
              phone: formData.phone,
            },
          });
        }
      }
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

    const handleRemoveAccount = async (userId: number) => {
        if (!userId) {
            toast.error("User ID is required");
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to remove this account? This action cannot be undone."
        );

        if (!confirmed) return;

        try {
            const res = await api.post("user/remove-company-account", { user_id: userId });

            if (res.data.IsSuccess) {
                toast.success(res.data.message || "Account removed successfully");

                router.push("/apps/users/list");
            } else {
                toast.error(res.data.message || "Failed to remove account");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to remove account");
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

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchData();

        if (Number(userId) === Number(user?.id)) {
          const updatedUser = {
            ...user,
            user_image: res.data.info.user_image
              ? res.data.info.user_image
              : user?.user_image,
            user_thumb_image: res.data.info.user_image
              ? res.data.info.user_image
              : user?.user_thumb_image,
          };

          await update({
            ...session,
            user: updatedUser,
          });
        }
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

   useEffect(() => {
    const tabParam = searchParams ? searchParams.get("tab"): "";
    if (tabParam) {
      switch (tabParam) {
        case "billing":
          setValue(1);
          break;
        case "rate":
          setValue(2);
          break;
        default:
          setValue(0);
      }
      router.replace(`/apps/users/${userId}`)
    }
  }, [searchParams]);
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
                    cursor: "pointer",
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
                    sx={{ width: 60, height: 60, cursor: "pointer" }}
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
              <Box display={"block"}>
                <label htmlFor="upload-avatar">
                  <IconEdit
                    size={17}
                    color={"#1e4db7"}
                    style={{ cursor: "pointer" }}
                  ></IconEdit>
                </label>
                <Typography
                  color="textSecondary"
                  fontWeight={600}
                  ml={2}
                  fontSize={"20px !important"}
                >
                  {data?.name ?? null}
                </Typography>
                <Typography
                  fontSize={"16px !important"}
                  color="textSecondary"
                  ml={2}
                >
                  {data?.trade_name ?? null}
                </Typography>
              </Box>
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
              </Box>
              <form>
                <Typography color="textSecondary" variant="h5" mt={1}>
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
                <Typography color="textSecondary" variant="h5" mt={2}>
                  Expired At
                </Typography>
                <CustomTextField
                  type="date"
                  className="custom_color"
                  id="expired_at"
                  placeholder="Choose Expiry date"
                  fullWidth
                  value={formData.expired_at}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newDate = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      expired_at: newDate,
                    }));
                  }}
                />
              </form>
              <Box mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUpdatePersonalDetails}
                >
                  Update
                </Button>
              </Box>
            </Box>
          </BlankCard>

            {userRole === 1 && (
                <Card sx={{ mt: 3 }}>
                    <Box sx={{ m: 3 }}>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={() => handleRemoveAccount(Number(data?.id))}
                            fullWidth
                        >
                            Remove Account
                        </Button>
                    </Box>
                </Card>
            )}
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
                <ComapnyRate active={value === 2} name={formData.first_name} />
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
