"use client";

import React, { useEffect, useState } from "react";
import api from "@/utils/axios";
import {
  Box,
  Stack,
  Drawer,
  IconButton,
  Typography,
  TextField,
  Button,
} from "@mui/material";
import { IconArrowLeft, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function LeavesSetting({ open, onClose }: Props) {
  const [leaveLimit, setLeaveLimit] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [timeZone, setTimeZone] = useState<any>(39);

  const fetchGeneralSetting = async () => {
    try {
      const res = await api.get("setting/general-settings");
      if (res.data?.IsSuccess && res.data?.data?.leave_limit !== undefined) {
        setLeaveLimit(Number(res.data.data.leave_limit));
        setTimeZone(res.data.data.timezone_id);
      }
    } catch (error) {
      console.error("Error fetching general setting:", error);
    }
  };

  useEffect(() => {
    if (open) fetchGeneralSetting();
  }, [open]);

  const handleSave = async () => {
    if (leaveLimit === "" || leaveLimit < 0 || leaveLimit > 365) {
      toast.error("Leave limit must be between 0 and 365");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("setting/save-general-setting", {
        leave_limit: Number(leaveLimit),
        timeZone,
      });

      if (res.data?.IsSuccess) {
        toast.success("Leave limit updated successfully");
        onClose();
      } else {
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 500,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 500,
          padding: 2,
          backgroundColor: "#f9f9f9",
        },
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={onClose}>
            <IconArrowLeft />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            Leave Limit
          </Typography>
        </Stack>
        <IconButton onClick={onClose}>
          <IconX />
        </IconButton>
      </Box>

      <Box flex={1}>
        <Typography variant="body2" mb={1}>
          Maximum leaves allowed per year
        </Typography>

        <TextField
          fullWidth
          type="text"
          value={leaveLimit}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (value <= 365) {
              setLeaveLimit(value);
            }
          }}
          inputProps={{
            min: 0,
            max: 365,
            step: 1,
            inputMode: "numeric",
          }}
          placeholder="Enter leave limit (max 365)"
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "start",
          gap: 2,
          mt: "auto",
        }}
      >
        <Button
          color="primary"
          variant="contained"
          size="large"
          onClick={handleSave}
          disabled={loading}
          sx={{ borderRadius: 3 }}
          className="drawer_buttons"
        >
          {loading ? "Saving..." : "Save"}
        </Button>
        <Button
          color="inherit"
          onClick={onClose}
          variant="contained"
          size="large"
          sx={{
            backgroundColor: "transparent",
            borderRadius: 3,
            color: "GrayText",
          }}
        >
          Close
        </Button>
      </Box>
    </Drawer>
  );
}
