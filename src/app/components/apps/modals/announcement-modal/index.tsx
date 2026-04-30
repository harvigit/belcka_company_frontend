"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  Autocomplete,
  RadioGroup,
  Radio,
  TextField,
  Typography,
  IconButton,
  useTheme,
} from "@mui/material";
import { Grid } from "@mui/system";
import { IconArrowLeft, IconCamera, IconTrash } from "@tabler/icons-react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { useDropzone } from "react-dropzone";
import { AxiosResponse } from "axios";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

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
        "Invalid file type. Please upload an image, video, audio, or PDF.",
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
          <Typography
            variant="body1"
            fontWeight={500}
            sx={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.25,
              wordBreak: "break-word",
            }}
          >
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
        const res: AxiosResponse<any> = await api.get(
          `get-company-resources?flag=teamList&company_id=${user?.company_id}`,
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
        const res: AxiosResponse<any> = await api.get("user/get-user-lists");
        if (res.data?.info) setUsers(res.data.info);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    if (user?.company_id) fetchUsers();
  }, [user?.company_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const res: AxiosResponse<any> = await api.post(
        "announcements/create",
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        onCreated?.();
        onClose();
        setLoading(false);
      } else {
      }
      setLoading(false);
    } catch (err) {
      console.error("Error uploading files:", err);
    }
    setLoading(false);
  };

  return (
    <Box display="flex" flexDirection="column" height="100%">
      {/* Header */}
      <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
        <IconButton onClick={onClose}>
          <IconArrowLeft />
        </IconButton>
        <Typography variant="h6" color="inherit" fontWeight={700}>
          Announcement
        </Typography>
      </Box>

      <Box height={"100%"}>
        <form onSubmit={handleSubmit} className="address-form">
          <Grid container>
            <Grid size={{ lg: 12, xs: 12 }}>
              {/* Top Card */}
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: "22px",
                  bgcolor: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  border: "1px solid #ececec",
                }}
              >
                {/* Header */}
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    fontSize: "24px",
                  }}
                >
                  New Announcement
                </Typography>

                <Grid container spacing={2} alignItems="center">
                  {/* Left Section */}
                  <Grid size={{ xs: 12, md: 8 }}>
                    {/* Company Users */}
                    <FormControlLabel
                      control={
                        <CustomCheckbox
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
                      label="All company users"
                      sx={{ mb: 1 }}
                    />

                    {/* Teams */}
                    {!companyUsers && (
                      <>
                        <Autocomplete
                          multiple
                          options={teams}
                          getOptionLabel={(o) => o.name}
                          value={teams.filter((t) =>
                            selectedTeams.includes(t.id!),
                          )}
                          onChange={(_, v) =>
                            setSelectedTeams(
                              v.map((x) => x.id!).filter(Boolean),
                            )
                          }
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Select Team" />
                          )}
                          sx={{ mb: 1.5 }}
                        />

                        {/* Users */}
                        <Autocomplete
                          multiple
                          options={users}
                          getOptionLabel={(o) => o.name}
                          value={users.filter((u) =>
                            selectedUsers.includes(u.id!),
                          )}
                          onChange={(_, v) =>
                            setSelectedUsers(
                              v.map((x) => x.id!).filter(Boolean),
                            )
                          }
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Select Users" />
                          )}
                        />
                      </>
                    )}

                    {/* Send As */}
                    <Box mt={2}>
                      <Typography fontSize="14px" fontWeight={500} mb={1}>
                        Send notification as:
                      </Typography>

                      <RadioGroup
                        row
                        value={sendAs}
                        onChange={(e) => setSendAs(e.target.value as any)}
                        sx={{
                          bgcolor: "#d9d9d9",
                          borderRadius: "30px",
                          width: "fit-content",
                          px: 0.5,
                          py: 0.3,
                          gap: 0.5,
                        }}
                      >
                        <FormControlLabel
                          value="company"
                          control={<Radio sx={{ display: "none" }} />}
                          label="Company"
                          sx={{
                            m: 0,
                            px: 2,
                            py: 0.4,
                            borderRadius: "25px",
                            bgcolor:
                              sendAs === "company" ? "#fff" : "transparent",
                            boxShadow:
                              sendAs === "company"
                                ? "0 1px 5px rgba(0,0,0,0.12)"
                                : "none",
                          }}
                        />

                        <FormControlLabel
                          value="admin"
                          control={<Radio sx={{ display: "none" }} />}
                          label="Admin"
                          sx={{
                            m: 0,
                            px: 2,
                            py: 0.4,
                            borderRadius: "25px",
                            bgcolor:
                              sendAs === "admin" ? "#fff" : "transparent",
                            boxShadow:
                              sendAs === "admin"
                                ? "0 1px 5px rgba(0,0,0,0.12)"
                                : "none",
                          }}
                        />
                      </RadioGroup>
                    </Box>
                  </Grid>

                  {/* Upload Right */}
                  <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: "center" }}>
                    <Box
                      {...getRootProps()}
                      sx={{
                        width: 110,
                        height: 110,
                        mx: "auto",
                        borderRadius: "50%",
                        bgcolor: "#f3f3f3",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        border: "1px dashed #bbb",
                        flexDirection: "column",
                      }}
                    >
                      <input {...getInputProps()} multiple />

                      <IconCamera />
                      <Typography fontWeight={700} fontSize="13px">
                        UPLOAD
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Announcement Box */}
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: "22px",
                  bgcolor: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  border: "1px solid #ececec",
                }}
              >
                <Typography fontSize="16px" fontWeight={600} mb={1}>
                  Write Announcement
                </Typography>

                <CustomTextField
                  multiline
                  rows={8}
                  placeholder={
                    companyUsers
                      ? "What's the latest news?"
                      : "Write announcement"
                  }
                  fullWidth
                  value={title}
                  inputProps={{ maxLength: 500 }}
                  onChange={(e: any) => setTitle(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "16px",
                      alignItems: "start",
                    },
                  }}
                />
              </Box>

              {/* File Preview */}
              {uploadedFiles.length > 0 && (
                <Box mt={2}>
                  <Typography variant="h6" fontSize="15px" mb={1}>
                    Files Preview
                  </Typography>
                  {fileList}
                </Box>
              )}

              {/* Buttons */}
            </Grid>
          </Grid>
          <Box
            sx={{
              display: "flex",
              justifyContent: "start",
              gap: 2,
              mt: 3,
            }}
          >
            <Button
              color="primary"
              variant="contained"
              size="large"
              type="submit"
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
        </form>
      </Box>
    </Box>
  );
}
