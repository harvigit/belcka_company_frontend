"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Grid,
  Button,
  CircularProgress,
  Divider,
  Tooltip,
} from "@mui/material";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

interface ProjectListingProps {
  userId: number;
  active: boolean;
  //  someFunc?: () => void;
}

interface EmergencyContact {
  emergency_id?: number;
  first_name: string;
  last_name: string;
  email: string;
  post_code: string;
  address: string;
  extension: string;
  phone: string;
}

interface HealthIssue {
  heath_id: number;
  health_issue_id: number;
  is_check: boolean;
  comment?: string | null;
  name?: string;
}

interface CommonHealthIssue {
  id: number;
  name: string;
}

interface HealthInfoData {
  user_id: number;
  emergency_contact: EmergencyContact;
  user_other_info_id?: number;
  height: string;
  weight: string;
  health_issues: HealthIssue[];
}

const HealthInfoComponent: React.FC<ProjectListingProps> = ({
  userId,
  active,
}) => {
  const [loading, setLoading] = useState(true);
  const [healthInfo, setHealthInfo] = useState<HealthInfoData | null>(null);
  const [allHealthIssueOptions, setAllHealthIssueOptions] = useState<
    CommonHealthIssue[]
  >([]);
  const [hasExistingInfo, setHasExistingInfo] = useState(false);
  const [phone, setPhone] = useState("");
  const session = useSession();
  const user = session.data?.user as User & { user_role_id?: number | null } & {
    id: number;
  };
  useEffect(() => {
    const fetchHealthInfo = async () => {
      if (!userId || !active) return;
      setLoading(true);
      try {
        const resInfo = await api.get(
          `user-health-info/get-health-info?user_id=${Number(userId)}`
        );
        const infoData = resInfo.data.info;
        const resOptions = await api.get(`user-health-info/get-health-issues`);
        const optionsData: CommonHealthIssue[] = resOptions.data.info;
        setAllHealthIssueOptions(optionsData);

        if (infoData) {
          const existingIssues = infoData?.health_info ?? [];
          setHasExistingInfo(existingIssues.length > 0);
          const mappedIssues: HealthIssue[] = optionsData.map((option) => {
            const existing = existingIssues.find(
              (h: any) => h.health_issue_id === option.id
            );

            if (existing) {
              return {
                heath_id: existing.heath_id,
                health_issue_id: existing.health_issue_id,
                is_check: existing.is_check,
                comment: existing.comment,
                name: option.name,
              };
            } else {
              return {
                heath_id: 0,
                health_issue_id: option.id,
                is_check: false,
                comment: "",
                name: option.name,
              };
            }
          });

          const formatted: HealthInfoData = {
            user_id: infoData.user_id,
            emergency_contact: {
              emergency_id: infoData.emergency_id,
              first_name: infoData.first_name || "",
              last_name: infoData.last_name || "",
              email: infoData.email || "",
              post_code: infoData.post_code || "",
              address: infoData.address || "",
              extension: infoData.extention || "",
              phone: infoData.phone || "",
            },
            user_other_info_id: infoData.user_other_info_id,
            height: infoData.height || "",
            weight: infoData.weight || "",
            health_issues: mappedIssues,
          };
          setHealthInfo(formatted);
        } else {
          const blankIssues: HealthIssue[] = optionsData.map((option) => ({
            heath_id: 0,
            health_issue_id: option.id,
            is_check: false,
            comment: "",
            name: option.name,
          }));

          const blank: HealthInfoData = {
            user_id: Number(userId),
            emergency_contact: {
              first_name: "",
              last_name: "",
              email: "",
              post_code: "",
              address: "",
              extension: "",
              phone: "",
            },
            height: "",
            weight: "",
            health_issues: blankIssues,
          };
          setHealthInfo(blank);
        }
      } catch (error) {
        console.error("Failed to fetch health info or options", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHealthInfo();
  }, [userId, active]);

  const handleFieldChange = (field: keyof EmergencyContact, value: string) => {
    if (!healthInfo) return;
    setHealthInfo((prev) =>
      prev
        ? {
            ...prev,
            emergency_contact: {
              ...prev.emergency_contact,
              [field]: value,
            },
          }
        : null
    );
  };

  const handleOtherInfoChange = (field: "height" | "weight", value: string) => {
    if (!healthInfo) return;
    setHealthInfo((prev) =>
      prev
        ? {
            ...prev,
            [field]: value,
          }
        : null
    );
  };

  const handleHealthIssueChange = (
    index: number,
    key: "is_check" | "comment",
    value: any
  ) => {
    if (!healthInfo) return;

    const updatedIssues = [...healthInfo.health_issues];
    if (key === "is_check") {
      updatedIssues[index].is_check = value;
      if (!value) {
        updatedIssues[index].comment = "";
      }
    } else {
      updatedIssues[index].comment = value;
    }

    setHealthInfo((prev) =>
      prev
        ? {
            ...prev,
            health_issues: updatedIssues,
          }
        : null
    );
  };

  const handleSaveOrUpdate = async () => {
    if (!healthInfo) return;

    const payload = {
      user_id: Number(userId),
      emergency_contact: {
        ...healthInfo.emergency_contact,
        emergency_id: healthInfo.emergency_contact.emergency_id,
      },
      health_info: {
        user_other_info_id: healthInfo.user_other_info_id,
        height: healthInfo.height,
        weight: healthInfo.weight,
        health_issues: healthInfo.health_issues.map((issue) => ({
          heath_id: issue.heath_id,
          health_issue_id: issue.health_issue_id,
          is_check: issue.is_check ? 1 : 0,
          ...(issue.comment ? { comment: issue.comment } : {}),
        })),
      },
    };

    try {
      if (hasExistingInfo) {
        const res = await api.put(
          "user-health-info/update-health-info",
          payload
        );
        if (res.data.IsSuccess == true) {
          toast.success(res.data.message);
        }
      } else {
        const res = await api.post(
          "user-health-info/store-health-info",
          payload
        );
        if (res.data.IsSuccess == true) {
          toast.success(res.data.message);
        }
      }
    } catch (error) {
      console.error("Error saving or updating:", error);
    }
  };
  useEffect(() => {
    if (healthInfo) {
      const ext = healthInfo.emergency_contact.extension || "";
      const number = healthInfo.emergency_contact.phone || "";
      if (ext && number) {
        const combined = ext.replace("+", "") + number;
        setPhone(combined);
      }
    }
  }, [healthInfo]);

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
        minHeight="370px"
      >
        <CircularProgress />
      </Box>
    );
  }
  if (!healthInfo) return <Typography>Health Info not found!</Typography>;

  return (
    <Box ml={5} p={2} className="health_info_wrapper">
      <Typography color="#487bb3ff" fontSize="16px !important" sx={{ mb: 2 }}>
        Emergency Contact
      </Typography>
      <Grid container spacing={2} mb={2}>
        {["first_name", "last_name", "email", "address", "post_code"].map(
          (key) => (
            <Grid size={{ xs: 12, sm: 6 }} key={key}>
              <Tooltip title={(healthInfo.emergency_contact as any)[key] || ""}>
                <TextField
                  fullWidth
                  className="custom_color"
                  disabled={
                    Number(userId) !== Number(user.id) && user.user_role_id == 2
                  }
                  label={key
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                  value={(healthInfo.emergency_contact as any)[key] || ""}
                  onChange={(e) =>
                    handleFieldChange(
                      key as keyof EmergencyContact,
                      e.target.value
                    )
                  }
                />
              </Tooltip>
            </Grid>
          )
        )}

        <Grid size={{ xs: 12, sm: 6 }}>
          <PhoneInput
            inputClass="phone-input"
            country={"gb"}
            value={phone}
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

      <Typography
        color="#487bb3ff"
        fontSize="16px !important"
        sx={{ mt: 4, mb: 2 }}
      >
        Health Info
      </Typography>
      <Grid container spacing={2} mb={4}>
        <Grid sx={{ xs: 12, sm: 6 }}>
          <TextField
            className="custom_color"
            fullWidth
            disabled={
              Number(userId) !== Number(user.id) && user.user_role_id == 2
            }
            label="Height (cm)"
            value={healthInfo.height}
            inputProps={{
              inputMode: "numeric",
              pattern: "[0-9]*",
            }}
            onChange={(e) => handleOtherInfoChange("height", e.target.value)}
          />
        </Grid>
        <Grid sx={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            disabled={
              Number(userId) !== Number(user.id) && user.user_role_id == 2
            }
            className="custom_color"
            label="Weight (kg)"
            value={healthInfo.weight}
            inputProps={{
              inputMode: "numeric",
              pattern: "[0-9]*",
            }}
            onChange={(e) => handleOtherInfoChange("weight", e.target.value)}
          />
        </Grid>
      </Grid>

      <Divider />

      <Typography
        color="#487bb3ff"
        fontSize="16px !important"
        sx={{ mt: 4, mb: 2 }}
      >
        Questions
      </Typography>
      <Box mb={2}>
        {healthInfo.health_issues.map((issue, index) => (
          <Grid sx={{ xs: 12 }} key={issue.health_issue_id}>
            <Box>
              <Typography sx={{ mb: 1 }} color="textSecondary">
                {issue.name}
              </Typography>
              <Box display="flex" alignItems="center" gap={3} mb={2}>
                <label className="custom_color">
                  <input
                    type="radio"
                    name={`health-issue-${index}`}
                    value="yes"
                    disabled={
                      Number(userId) !== Number(user.id) &&
                      user.user_role_id == 2
                    }
                    checked={issue.is_check === true}
                    onChange={() =>
                      handleHealthIssueChange(index, "is_check", true)
                    }
                  />{" "}
                  Yes
                </label>

                <label className="custom_color">
                  <input
                    type="radio"
                    disabled={
                      Number(userId) !== Number(user.id) &&
                      user.user_role_id == 2
                    }
                    name={`health-issue-${index}`}
                    value="no"
                    checked={issue.is_check === false}
                    onChange={() =>
                      handleHealthIssueChange(index, "is_check", false)
                    }
                  />{" "}
                  No
                </label>
              </Box>

              {issue.is_check && (
                <TextField
                  fullWidth
                  className="custom_color"
                  rows={2}
                  label="Detail"
                  value={issue.comment || ""}
                  required
                  disabled={
                    Number(userId) !== Number(user.id) && user.user_role_id == 2
                  }
                  onChange={(e) =>
                    handleHealthIssueChange(index, "comment", e.target.value)
                  }
                  sx={{ mt: 1, mb: 1 }}
                />
              )}
            </Box>
          </Grid>
        ))}
        <Divider />
      </Box>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveOrUpdate}
        >
          {hasExistingInfo ? "Update" : "Save"}
        </Button>
      </Box>
    </Box>
  );
};

const HealthInfo = React.memo(HealthInfoComponent);

export default HealthInfo;
