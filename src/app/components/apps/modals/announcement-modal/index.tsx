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
  Input,
  FormHelperText,
} from "@mui/material";
import { Grid } from "@mui/system";
import { IconArrowLeft } from "@tabler/icons-react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

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
  const [loading, setLoading] = useState<boolean>(true);
  const [files, setFiles] = useState<FileList | null>(null);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  useEffect(() => {
    if (!open) {
      setTitle("");
      setBody("");
      setCompanyUsers(true);
      setSelectedTeams([]);
      setSelectedUsers([]);
      setFiles(null);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files);
    }
  };

  useEffect(() => {
    const getTeams = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=teamList&company_id=${user.company_id}`
        );
        if (res.data?.info) setTeams(res.data.info);
      } catch (err) {
        console.error("Failed to fetch team data", err);
      }
    };
    if (user?.company_id) getTeams();
  }, [user?.company_id]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await api.get("user/get-user-lists");
        if (res.data) setUsers(res.data.info);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
      setLoading(false);
    };
    if (user?.company_id) fetchUsers();
  }, [user?.company_id]);

  async function handleSubmit() {
    const fd = new FormData();
    fd.append("title", title);
    fd.append("body", body);
    fd.append("company_users", String(companyUsers));
    fd.append("company_id", String(user.company_id));
    fd.append("user_id", String(user.id));
    fd.append("send_as", sendAs);

    if (!companyUsers) {
      selectedTeams.forEach((t) => fd.append("team_ids[]", String(Number(t))));
      selectedUsers.forEach((u) => fd.append("user_ids[]", String(Number(u))));
    }

    if (files) {
      Array.from(files).forEach((f) => fd.append("files", f));
    }

    const res = await api.post("announcements/create", fd);
    if (res.data.IsSuccess) {
      toast.success(res.data.message);
      onCreated?.();
      onClose();
    } else {
      toast.error(res.data.message || "Failed to create announcement");
    }
  }

  return (
    <Box sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
      <Grid size={{ xs: 12, lg: 12 }}>
        <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
          <IconButton onClick={onClose}>
            <IconArrowLeft />
          </IconButton>
          <Typography variant="h6" color="inherit" fontWeight={600}>
            Announcement
          </Typography>
        </Box>

        {/* Title */}
        <Typography variant="h6" mt={2}>
          Write Announcement
        </Typography>
        <CustomTextField
          id="title"
          multiline
          name="title"
          placeholder="Enter title..."
          fullWidth
          value={title}
          onChange={(e: any) => setTitle(e.target.value)}
        />

        {/* Company Users Toggle */}
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

        {/* Teams Dropdown */}
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
            setSelectedTeams(v.map((x) => x.id!).filter((id) => id !== null))
          }
          renderInput={(params) => (
            <TextField {...params} label="Teams" placeholder="Select teams" />
          )}
        />

        {/* Users Dropdown */}
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
            setSelectedUsers(v.map((x) => x.id!).filter((id) => id !== null))
          }
          renderInput={(params) => (
            <TextField {...params} label="Users" placeholder="Select users" />
          )}
        />

        {/* Send As */}
        <Box mt={2}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Send notification as</FormLabel>
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

        {/* Upload Files */}
        <InputLabel htmlFor="file-upload">Choose files</InputLabel>
        <FormControl fullWidth sx={{ marginBottom: 2 }}>
          <Input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            inputProps={{ multiple: true }}
            sx={{
              padding: "6px 14px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              "& .MuiInput-input": {
                cursor: "pointer",
                color: files && files.length > 0 ? "black" : "#888",
              },
            }}
          />
          {files && files.length > 0 && (
            <FormHelperText
              sx={{ marginTop: 1 }}
              variant="filled"
              color="success"
            >
              {`${files.length} file${files.length > 1 ? "s" : ""} selected`}
            </FormHelperText>
          )}
        </FormControl>

        {/* Actions */}
        <Box display="flex" justifyContent="space-between" mt={2}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            Save
          </Button>
        </Box>
      </Grid>
    </Box>
  );
}
