"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, Drawer, IconButton, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { IconX } from "@tabler/icons-react";
import api from "@/utils/axios";

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: number | null;
}
import toast from "react-hot-toast";
import { AxiosResponse } from "axios";
import TiptapEditor from "@/app/(DashboardLayout)/forms/form-tiptap/TiptapEditor";

const TermsAndConditions: React.FC<Props> = ({ open, onClose, companyId }) => {
  const [data, setData] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [description, setDescription] = useState("");
  const fetchConditions = async () => {
    try {
      const res = await api.get(
        `company/terms-conditions?company_id=${companyId}`,
      );

      if (res.data.IsSuccess) {
        if (res.data.IsSuccess) {
          setData(res.data.info.description || "");
          setDescription(res.data.info.description || "");
        }
      }
    } catch (error) {}
  };

  useEffect(() => {
    fetchConditions();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res: AxiosResponse<any> = await api.post(
        "company/terms-conditions",
        {
          company_id: Number(companyId),
          description: description,
        },
      );

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        onClose?.();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
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
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box
        display={"flex"}
        alignItems={"center"}
        justifyContent={"space-between"}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            Terms and conditions
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <IconX />
        </IconButton>
      </Box>
      <Box
        sx={{
          flex: 1,
          p: 1,
          overflowY: "auto",
          mt: 3,
        }}
      >
        <form
          className="task-form"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
        >
          <Box>
            <Box display={"flex"} alignItems={"center"}>
              <Box className="form_inputs">
                <TiptapEditor content={data} onChange={setDescription} />
              </Box>
            </Box>
          </Box>
        </form>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "start",
          gap: 2,
          p: 2,
          pb: 0,
          mt: "auto",
        }}
      >
        <Button
          color="primary"
          variant="contained"
          size="large"
          type="submit"
          onClick={handleSubmit}
          disabled={isSaving}
          sx={{ borderRadius: 3 }}
        >
          {isSaving ? "Saving..." : "Save"}
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
};

export default TermsAndConditions;
