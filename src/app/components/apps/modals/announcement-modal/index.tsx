"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  TextField,
  Typography,
  IconButton,
  InputLabel,
  useTheme,
} from "@mui/material";
import { Grid } from "@mui/system";
import { IconArrowLeft, IconTrash } from "@tabler/icons-react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { useDropzone } from "react-dropzone";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

interface Team {
  id: number | null;
  name: string;
}

interface Users {
  id: number | null;
  name: string;
}

export default function AnnouncementModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [companyUsers, setCompanyUsers] = useState(true);
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [sendAs, setSendAs] = useState<"company" | "admin">("company");
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<Users[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const theme = useTheme();
  const { data: session } = useSession();
  const user = session?.user as User & { company_id?: number | null };

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/heic": [".heic"],
      "image/gif": [".gif"],
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
      "video/x-msvideo": [".avi"],
      "audio/mpeg": [".mp3"],
      "audio/wav": [".wav"],
      "audio/aac": [".aac"],
      "application/pdf": [".pdf"],
    },
    onDrop: (acceptedFiles) => {
      setUploadedFiles(acceptedFiles);
    },

    onDropRejected: () => {
      toast.error(
        "Invalid file type. Please upload an image, video, audio, or PDF."
      );
    },
  });

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // File previews
  const fileList = uploadedFiles.map((file, i) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    return (
      <Box
        key={i}
        display="flex"
        alignItems="center"
        py={1.5}
        mt={1.5}
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box display="block" alignItems="center" gap={2}>
          {isImage && (
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              style={{
                width: 80,
                height: 80,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
          )}
          {isVideo && (
            <video
              src={URL.createObjectURL(file)}
              controls
              style={{
                width: 120,
                height: 80,
                borderRadius: 8,
                objectFit: "cover",
              }}
            />
          )}
          <Typography variant="body1" fontWeight={500} noWrap>
            {file.name}
          </Typography>
        </Box>
        <IconButton color="error" onClick={() => handleRemoveFile(i)}>
          <IconTrash />
        </IconButton>
      </Box>
    );
  });

  useEffect(() => {
    if (!open) {
      setTitle("");
      setBody("");
      setCompanyUsers(true);
      setSelectedTeams([]);
      setSelectedUsers([]);
      setUploadedFiles([]);
    }
  }, [open]);

  // Fetch Teams
  useEffect(() => {
    const getTeams = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=teamList&company_id=${user?.company_id}`
        );
        if (res.data?.info) setTeams(res.data.info);
      } catch (err) {
        console.error("Failed to fetch team data", err);
      }
    };
    if (user?.company_id) getTeams();
  }, [user?.company_id]);

  // Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("user/get-user-lists");
        if (res.data?.info) setUsers(res.data.info);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    if (user?.company_id) fetchUsers();
  }, [user?.company_id]);

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const fd = new FormData();
    fd.append("title", title);
    fd.append("body", body);
    fd.append("company_users", String(companyUsers));
    fd.append("company_id", String(user.company_id));
    fd.append("user_id", String(user.id));
    fd.append("send_as", sendAs);

    if (!companyUsers) {
      selectedTeams.forEach((t) => fd.append("team_ids[]", String(t)));
      selectedUsers.forEach((u) => fd.append("user_ids[]", String(u)));
    }

    uploadedFiles.forEach((file) => fd.append("files", file));

    try {
      setLoading(true);
      const res = await api.post("announcements/create", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        onCreated?.();
        onClose();
        setLoading(false);
      } else {
        toast.error(res.data.message || "Failed to create announcement");
      }
      setLoading(false);
    } catch (err) {
      console.error("Error uploading files:", err);
      toast.error("Upload failed");
    }
  }

  return (
    <Box sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
      <Grid size={{ xs: 12, lg: 12 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
          <IconButton onClick={onClose}>
            <IconArrowLeft />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            Announcement
          </Typography>
        </Box>

        {/* Title */}
        <Typography variant="h6" mt={2}>
          Write Announcement
        </Typography>
        <CustomTextField
          multiline
          placeholder="Enter title..."
          fullWidth
          value={title}
          onChange={(e: any) => setTitle(e.target.value)}
        />

        {/* Company Users */}
        <FormControlLabel
          sx={{ mt: 2 }}
          control={
            <Checkbox
              checked={companyUsers}
              onChange={(e) => {
                setCompanyUsers(e.target.checked);
                if (e.target.checked) {
                  setSelectedTeams([]);
                  setSelectedUsers([]);
                }
              }}
            />
          }
          label="Company Users"
        />

        {/* Teams */}
        <Typography variant="h6" mt={2}>
          Select Teams
        </Typography>
        <Autocomplete
          multiple
          disabled={companyUsers}
          options={teams}
          getOptionLabel={(o) => o.name}
          value={teams.filter((t) => selectedTeams.includes(t.id!))}
          onChange={(_, v) =>
            setSelectedTeams(v.map((x) => x.id!).filter(Boolean))
          }
          renderInput={(params) => (
            <TextField {...params} label="Teams" placeholder="Select teams" />
          )}
        />

        {/* Users */}
        <Typography variant="h6" mt={2}>
          Select Users
        </Typography>
        <Autocomplete
          multiple
          disabled={companyUsers}
          options={users}
          getOptionLabel={(o) => o.name}
          value={users.filter((u) => selectedUsers.includes(u.id!))}
          onChange={(_, v) =>
            setSelectedUsers(v.map((x) => x.id!).filter(Boolean))
          }
          renderInput={(params) => (
            <TextField {...params} label="Users" placeholder="Select users" />
          )}
        />

        {/* Send As */}
        <Box mt={2}>
          <FormControl component="fieldset">
            <FormLabel>Send notification as</FormLabel>
            <RadioGroup
              row
              value={sendAs}
              onChange={(e) => setSendAs(e.target.value as any)}
            >
              <FormControlLabel
                value="company"
                control={<Radio />}
                label="Company"
              />
              <FormControlLabel
                value="admin"
                control={<Radio />}
                label="Admin"
              />
            </RadioGroup>
          </FormControl>
        </Box>

        {/* File Upload */}
        <InputLabel htmlFor="file-upload" sx={{ mt: 2 }}>
          Choose files
        </InputLabel>
        <Box
          mt={2}
          fontSize="12px"
          sx={{
            backgroundColor: "primary.light",
            color: "primary.main",
            padding: "25px",
            textAlign: "center",
            border: `1px dashed`,
            borderColor: "primary.main",
            borderRadius: 1,
            cursor: "pointer",
          }}
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          <Typography>Drag & drop files here, or click to select</Typography>
        </Box>

        {/* File Previews */}
        {uploadedFiles.length > 0 && (
          <Box mt={2}>
            <Typography variant="h6" fontSize="15px" mb={1}>
              Files Preview
            </Typography>
            {fileList}
          </Box>
        )}

        {/* Actions */}
        <Box display="flex" justifyContent="space-between" mt={3}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            Save
          </Button>
        </Box>
      </Grid>
    </Box>
  );
}
