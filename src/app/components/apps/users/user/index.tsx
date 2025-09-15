"use client";
import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Grid,
  CircularProgress,
  CardContent,
  Button,
  Tab,
  Tabs,
  Badge,
  IconButton,
} from "@mui/material";
import { IconArrowLeft, IconMedal } from "@tabler/icons-react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Avatar } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
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
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TablePagination = () => {
  const [data, setData] = useState<TeamList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [phone, setPhone] = useState("");

  const [openIdCard, setOpenIdCard] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const searchParams = useSearchParams();
  const userId = searchParams ? searchParams.get("user_id") : "";
  const [value, setValue] = useState<number>(0);

  const handleTabChange = (event: any, newValue: any) => {
    setValue(newValue);
  };

  function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`vertical-tabpanel-${index}`}
        aria-labelledby={`vertical-tab-${index}`}
        {...other}
      >
        {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
      </div>
    );
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get(`user/get-user-lists?user_id=${userId}`);
        if (res.data?.info) {
          setData(res.data.info);
          const ext = res.data.info[0].extension || "";
          const number = res.data.info[0].phone || "";
          if (ext && number) {
            const combined = ext.replace("+", "") + number;
            setPhone(combined);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch users", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handlePhoneInputChange = (value: string, country: any) => {
    setPhone(value);
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
                    backgroundColor: data[0].is_working ? "#22bf22" : "#df2626",
                    color: data[0].is_working ? "#22bf22" : "#df2626",
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    boxShadow: "0 0 0 2px white",
                  },
                }}
              >
                <Avatar
                  src={
                    data[0].user_image
                      ? data[0].user_image
                      : "/images/users/user.png"
                  }
                  alt={data[0].first_name}
                  sx={{ width: 50, height: 50 }}
                />
              </Badge>

              <Typography
                color="textSecondary"
                fontWeight={600}
                mb={1}
                ml={1}
                fontSize={"20px !important"}
              >
                {data[0].name ?? null}
              </Typography>
              <Typography
                fontSize={"16px !important"}
                color="textSecondary"
                mb={1}
                ml={4}
              >
                {data[0].trade_name}
              </Typography>
            </Box>
            <Box>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  setSelectedUser(data[0]);
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
          size={{
            xs: 3,
            lg: 3,
          }}
        >
          <BlankCard>
            <Box sx={{ m: 3 }} className="person_info_wrapper">
              <Typography
                fontSize="18px !important"
                color="#487bb3ff"
                variant="h4"
              >
                Personal Details
              </Typography>
              <form>
                <Typography color="textSecondary" variant="h5" mt={2}>
                  First Name
                </Typography>
                <CustomTextField
                  id="first_name"
                  className="custom_color"
                  name="first_name"
                  placeholder="Enter first name.."
                  value={data[0].first_name}
                  variant="outlined"
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
                  value={data[0].last_name}
                  variant="outlined"
                  fullWidth
                />
                <Typography color="textSecondary" variant="h5" mt={2} mb={1}>
                  Mobile phone
                </Typography>

                <PhoneInput
                  inputClass="phone-input"
                  country={"gb"}
                  value={phone}
                  onChange={handlePhoneInputChange}
                  inputStyle={{
                    width: "100%",
                    borderColor: theme.palette.grey[200],
                  }}
                  enableSearch
                  inputProps={{ required: true }}
                />

                <Typography color="textSecondary" variant="h5" mt={2}>
                  Email
                </Typography>
                <CustomTextField
                  id="email"
                  name="email"
                  className="custom_color"
                  placeholder="Enter email.."
                  value={data[0].email}
                  disabled
                  variant="outlined"
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
                {["Health Info", "Billing Info", "Notification Settings"].map(
                  (label, index) => (
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
                  )
                )}
              </Tabs>
            </Box>
            <Box>
              <TabPanel value={value} index={0}>
                <HealthInfo userId={Number(userId)} />
              </TabPanel>
              <TabPanel value={value} index={1}>
                <BillingInfo
                  userId={Number(userId)}
                  companyId={Number(user.company_id)}
                />
              </TabPanel>
              <TabPanel value={value} index={2}>
                <Notifications
                  userId={Number(userId)}
                  companyId={Number(user.company_id)}
                />
              </TabPanel>
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
