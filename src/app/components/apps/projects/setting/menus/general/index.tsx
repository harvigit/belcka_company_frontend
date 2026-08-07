import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import toast from "react-hot-toast";
import api from "@/utils/axios";

interface GeneralSettingsProps {
  onSaveSuccess: () => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ onSaveSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationRadius, setLocationRadius] = useState<number | string>(1200);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("setting/general-settings");
      if (res.data?.IsSuccess) {
        setLocationRadius(res.data.data?.location_radius ?? 200);
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const radiusNum = Number(locationRadius);
    if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 200) {
      toast.error("Location radius must be between 1 and 150 meters.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("setting/save-general-setting", {
        locationRadius: radiusNum,
      });
      if (res.data?.IsSuccess) {
        onSaveSuccess();
        toast.success("Location radius added successfully");
      } else {
      }
    } catch (err) {
      console.error("Failed to save settings", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 400, height: "100%", display: "flex", flexDirection: "column" }}>
      <Typography variant="h6" mb={3}>
        General Settings
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Location Radius (Meters)"
            type="number"
            value={locationRadius}
            onChange={(e) => setLocationRadius(e.target.value)}
            fullWidth
            inputProps={{ min: 1, max: 200 }}
            helperText="Maximum 200 meters"
          />
        </Box>
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
          disabled={saving}
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
