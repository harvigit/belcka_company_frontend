"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Divider,
} from "@mui/material";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

interface SettingsState {
  phone: string;
  extension: string;
  billing_days: number;
  isSaving: boolean;
  loading: boolean;
  timeZone: string;
}

interface BookkeeperSettingProps {
  onSaveSuccess: () => void;
}

const BookkeeperSetting: React.FC<BookkeeperSettingProps> = ({
  onSaveSuccess,
}) => {
  const [settings, setSettings] = useState<SettingsState>({
    phone: "",
    extension: "",
    billing_days: 0,
    isSaving: false,
    timeZone: "",
    loading: true,
  });

  const updateSettings = (updates: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get("/setting/get-company-settings");

        if (response.data?.IsSuccess) {
          const data = response.data.data || {};

          updateSettings({
            phone: data.hr_contact_number || "",
            extension: data.hr_contact_extension || "",
            billing_days: Number(data.allow_day_billing_info) || 0,
            timeZone: data.timezone_id || 39,
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        updateSettings({ loading: false });
      }
    };

    fetchSettings();
  }, []);

  // ✅ Handle Save
  const handleSave = async () => {
    try {
      updateSettings({ isSaving: true });

      const payload = {
        phone: settings.phone,
        extension: settings.extension,
        billing_days: String(settings.billing_days),
        timeZone: settings.timeZone,
      };

      const response = await api.post("/setting/save-general-setting", payload);

      if (response.data?.IsSuccess) {
        toast.success(response.data.message);
        onSaveSuccess();
      } else {
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      updateSettings({ isSaving: false });
    }
  };

  if (settings.loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Scrollable Content */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 3, bgcolor: "white" }}>
          <Box sx={{ maxWidth: 900, mx: "auto" }}>
            <Box>
              {/* Billing Days */}
              <Box>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box display="flex" alignItems="center">
                    <Box>
                      <Typography variant="body2">
                        Allow bookkeeper to start work without fill billing info
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TextField
                      variant="outlined"
                      size="small"
                      type="text"
                      value={settings.billing_days}
                      onChange={(e) => {
                        const value = Number(e.target.value);

                        updateSettings({
                          billing_days: Math.max(0, Math.min(365, value || 0)),
                        });
                      }}
                      inputProps={{
                        style: { width: "20px", backgroundColor: "#fff" },
                        min: 1,
                        max: 365,
                      }}
                    />
                    Days
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* HR Contact */}
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box display="flex" alignItems="center">
                  <Typography variant="body2">
                    HR Contact Information
                  </Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                  <PhoneInput
                    country="gb"
                    value={`${settings.extension}${settings.phone}`}
                    onChange={(value, country: any) => {
                      const dialCode = country.dialCode;

                      updateSettings({
                        extension: `+${dialCode}`,
                        phone: value.slice(dialCode.length),
                      });
                    }}
                    inputStyle={{
                      height: "47px",
                      borderColor: "#c0d1dc9c",
                    }}
                    enableSearch
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Fixed Footer with Save Button */}
        <Box
          sx={{
            borderTop: "1px solid #e0e0e0",
            p: 2,
            bgcolor: "#fff",
            position: "sticky",
            bottom: 0,
            zIndex: 1000,
            textAlign: "right",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={settings.isSaving}
            sx={{
              bgcolor: "#1976d2",
              color: "#fff",
              "&:hover": {
                bgcolor: "#1565c0",
              },
              "&:disabled": {
                bgcolor: "#ccc",
              },
            }}
          >
            {settings.isSaving ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1, color: "inherit" }} />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default BookkeeperSetting;
