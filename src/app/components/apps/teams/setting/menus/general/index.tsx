"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import api from "@/utils/axios";

const LAST_WORKING_DATE_VISIBILITY_OPTIONS = [
  { value: "1_day", label: "1 day before" },
  { value: "2_days", label: "2 days before" },
  { value: "3_days", label: "3 days before" },
  { value: "4_days", label: "4 days before" },
  { value: "5_days", label: "5 days before" },
  { value: "6_days", label: "6 days before" },
  { value: "1_week", label: "1 week before" },
  { value: "15_days", label: "15 days before" },
  { value: "1_month", label: "1 month before" },
  { value: "1_year", label: "1 year before" },
] as const;

interface GeneralSettingsProps {
  onSaveSuccess: () => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ onSaveSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastWorkingDateVisibility, setLastWorkingDateVisibility] =
    useState("");

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("setting/general-settings");
      if (res.data?.IsSuccess) {
        setLastWorkingDateVisibility(
          res.data.data?.last_working_date_visibility || "",
        );
      }
    } catch (err) {
      console.error("Failed to fetch team settings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.post("/team/update-last-working-date-visibility", {
        last_working_date_visibility: lastWorkingDateVisibility || null,
      });
      if (res.data?.IsSuccess) {
        onSaveSuccess();
        toast.success(
          res.data.message || "Last working date visibility updated",
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update last working date visibility");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        maxWidth: 400,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" mb={3}>
        Last working date visibility
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <TextField
          select
          fullWidth
          size="small"
          label="Last working date visibility"
          value={lastWorkingDateVisibility}
          onChange={(event) =>
            setLastWorkingDateVisibility(event.target.value)
          }
        >
          <MenuItem value="">
            <em>Show all dates</em>
          </MenuItem>
          {LAST_WORKING_DATE_VISIBILITY_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      )}

      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          pt: 2,
          pb: 1,
          bgcolor: "background.paper",
          zIndex: 10,
          display: "flex",
          justifyContent: "flex-start",
          mt: "auto",
        }}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saving || loading}
          sx={{ borderRadius: 3 }}
          className="drawer_buttons"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </Box>
    </Box>
  );
};

export default GeneralSettings;
