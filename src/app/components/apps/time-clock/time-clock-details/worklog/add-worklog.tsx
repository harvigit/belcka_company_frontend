"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  CircularProgress,
  IconButton,
  Typography,
  Select,
  MenuItem,
  TextField,
  Button,
  FormControl,
  Avatar,
  InputAdornment,
  SelectChangeEvent,
  Popover,
} from "@mui/material";
import { IconX } from "@tabler/icons-react";
import SearchIcon from "@mui/icons-material/Search";
import { debounce } from "lodash";
import "react-day-picker/dist/style.css";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import { styled } from "@mui/material/styles";

interface User {
  id: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  user_image?: string;
  image?: string;
}

interface AddWorklogProps {
  onClose: () => void;
  userId: number;
  companyId: number;
}

export type NewRecord = {
  userId: number;
  project_id: number;
  shift_id: number;
  date: string;
  start: string;
  end: string;
};

export interface Shift {
  id: number;
  name: string;
}

export interface Project {
  id: number;
  name: string;
}
const StyledDayPicker = styled(Box)(({ theme }) => ({
  "& .rdp": {
    "--rdp-cell-size": "36px",
    "--rdp-accent-color": "#50ABFF",
    "--rdp-background-color": "#e6f3ff",
    "--rdp-selected-color": "#fff",
    "--rdp-selected-background": "#50ABFF",
    "--rdp-today-background": "#f0f0f0",
    fontSize: "14px",
    padding: theme.spacing(1),
    backgroundColor: "#fff",
  },
  "& .rdp-day": {
    borderRadius: "4px",
  },
  "& .rdp-day_selected": {
    backgroundColor: "#50ABFF",
    color: "#fff",
  },
  "& .rdp-day:hover": {
    backgroundColor: "#e6f3ff",
  },
}));

const AddWorklog: React.FC<AddWorklogProps> = ({
  onClose,
  userId,
  companyId,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newRecord, setNewRecord] = useState<NewRecord>({
    userId: 0,
    project_id: 0,
    shift_id: 0,
    date: "",
    start: "",
    end: "",
  });
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [singleDate, setSingleDate] = useState<Date | undefined>(new Date());
  const open = Boolean(anchorEl);

  const fetchTimeClockResources = async (): Promise<void> => {
    try {
      const response = await api.get("/time-clock/resources", {
        params: { companyId },
      });
      if (response.data.IsSuccess) {
        setShifts(response.data.shifts || []);
        setProjects(response.data.projects || []);
      }
    } catch (error) {
      console.error("Error fetching timeClock resources:", error);
    }
  };

  const validateAndFormatTime = (value: string): string | null => {
    if (!value) return null;

    const trimmed = value.trim();

    const match = trimmed.match(/^(\d{1,2})(?::?(\d{1,2}))?$/);
    if (!match) return null;

    let hours = Number(match[1]);
    let minutes = Number(match[2] ?? 0);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  };
  const [blurredFields, setBlurredFields] = useState<{
    start: boolean;
    end: boolean;
  }>({ start: false, end: false });

  const handleBlur = (field: "start" | "end") => {
    const formattedTime = validateAndFormatTime(
      (newRecord[field] as string) || ""
    );
    setNewRecord((prev) => ({
      ...prev,
      [field]: formattedTime,
    }));
    setBlurredFields((prev) => ({ ...prev, [field]: true }));
  };
  const getUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`user/list`);
      setUsers(res.data.info || []);
    } catch (error) {
      console.error("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    getUsers();
    fetchTimeClockResources();
  }, [userId, companyId]);

  const handleSearchChange = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  const handleChange = useCallback(
    <K extends keyof NewRecord>(field: K) =>
      (
        event:
          | SelectChangeEvent<NewRecord[K]>
          | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => {
        const value = event.target.value as NewRecord[K];

        setNewRecord((prev) => ({
          ...prev,
          [field]: value,
        }));
      },
    []
  );

  const handleDateButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleDatePopoverClose = () => {
    setAnchorEl(null);
  };
  const handleSingleDateChange = (date: Date | undefined) => {
    setSingleDate(date);
  };
  const getDateButtonText = () => {
    return singleDate
      ? format(singleDate, "dd/MM/yyyy")
      : format(new Date(), "dd/MM/yyyy");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(singleDate);
    if (
      !newRecord.userId ||
      !newRecord.shift_id ||
      !newRecord.project_id ||
      !newRecord.start ||
      !newRecord.end
    ) {
      toast.error("Please fill out all fields");
      return;
    }

    if (!singleDate) {
      toast.error("Please select a valid date");
      return;
    }

    const params: any = {
      user_id: Number(newRecord.userId),
      device_type: 3,
      device_model_type: "web",
      date: singleDate.toISOString().slice(0, 10),
      shift_id: Number(newRecord.shift_id),
      project_id: Number(newRecord.project_id),
      start_time: newRecord.start,
      end_time: newRecord.end,
    };

    setLoading(true);

    try {
      const response = await api.post("/time-clock/add-worklog", params);

      if (response.data.IsSuccess) {
        onClose();
      }
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    (
      user.name ||
      `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
      "Unknown User"
    )
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredProject = projects.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredShifts = shifts.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserName = (user: User) =>
    user.name ||
    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
    "Unknown User";

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
    <Box
      sx={{
        bgcolor: "white",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "550px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        gap={1.5}
        px={3}
        py={2}
        borderBottom="1px solid #f0f0f0"
      >
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ p: 0.5, color: "#666" }}
        >
          <IconX size={20} />
        </IconButton>
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{ fontSize: "18px", color: "#1a1a1a" }}
          component="div"
        >
          {"Add Worklog"}
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box px={3} py={2.5}>
          <Box
            display="grid"
            gridTemplateColumns="140px 1fr"
            alignItems="center"
            gap={2}
            mb={2}
          >
            <Typography
              variant="body2"
              fontWeight={600}
              color="#1a1a1a"
              component="div"
            >
              Select user
            </Typography>
            <FormControl fullWidth>
              <Select
                name="userId"
                value={newRecord.userId}
                onChange={handleChange("userId")}
                displayEmpty
                size="small"
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e0e0e0",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#bdbdbd",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#50ABFF",
                  },
                }}
                MenuProps={{
                  PaperProps: { style: { maxHeight: 400 } },
                  autoFocus: false,
                }}
                renderValue={(selected) => {
                  if (!selected)
                    return (
                      <Typography color="#999" component="span">
                        Select user
                      </Typography>
                    );
                  const user = users.find((u) => u.id === Number(selected));
                  return (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar
                        src={user?.user_image || user?.image}
                        sx={{ width: 24, height: 24, fontSize: "12px" }}
                      >
                        {user?.first_name?.[0]?.toUpperCase()}
                      </Avatar>
                      <Typography sx={{ fontSize: "14px" }} component="span">
                        {getUserName(user || ({} as User))}
                      </Typography>
                    </Box>
                  );
                }}
              >
                <Box
                  px={2}
                  py={1.5}
                  position="sticky"
                  top={0}
                  bgcolor="white"
                  zIndex={1}
                >
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search user"
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <SearchIcon sx={{ color: "#999", fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "#e0e0e0" },
                        "&:hover fieldset": { borderColor: "#bdbdbd" },
                        "&.Mui-focused fieldset": { borderColor: "#50ABFF" },
                      },
                    }}
                  />
                </Box>
                {filteredUsers.length === 0 ? (
                  <MenuItem disabled>
                    <Typography color="text.secondary" component="span">
                      No users found
                    </Typography>
                  </MenuItem>
                ) : (
                  filteredUsers.map((user) => (
                    <MenuItem key={user.id} value={user.id.toString()}>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar
                          src={user.user_image || user.image}
                          sx={{ width: 32, height: 32, fontSize: "14px" }}
                        >
                          {user.first_name?.[0]?.toUpperCase()}
                        </Avatar>
                        <Typography component="span">
                          {getUserName(user)}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <Typography
              variant="body2"
              fontWeight={600}
              color="#1a1a1a"
              component="div"
            >
              Select Project
            </Typography>
            <FormControl fullWidth>
              <Select
                name="project_id"
                value={newRecord.project_id}
                onChange={handleChange("project_id")}
                displayEmpty
                size="small"
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e0e0e0",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#bdbdbd",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#50ABFF",
                  },
                }}
                MenuProps={{
                  PaperProps: { style: { maxHeight: 400 } },
                  autoFocus: false,
                }}
                renderValue={(selected) => {
                  if (!selected)
                    return (
                      <Typography color="#999" component="span">
                        Select project
                      </Typography>
                    );
                  const project = projects.find(
                    (u) => u.id === Number(selected)
                  );
                  return (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography sx={{ fontSize: "14px" }} component="span">
                        {project?.name}
                      </Typography>
                    </Box>
                  );
                }}
              >
                <Box
                  px={2}
                  py={1.5}
                  position="sticky"
                  top={0}
                  bgcolor="white"
                  zIndex={1}
                >
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search project"
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <SearchIcon sx={{ color: "#999", fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "#e0e0e0" },
                        "&:hover fieldset": { borderColor: "#bdbdbd" },
                        "&.Mui-focused fieldset": { borderColor: "#50ABFF" },
                      },
                    }}
                  />
                </Box>
                {filteredProject.length === 0 ? (
                  <MenuItem disabled>
                    <Typography color="text.secondary" component="span">
                      No project found
                    </Typography>
                  </MenuItem>
                ) : (
                  filteredProject.map((project) => (
                    <MenuItem key={project.id} value={project.id.toString()}>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Typography component="span">{project.name}</Typography>
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <Typography
              variant="body2"
              fontWeight={600}
              color="#1a1a1a"
              component="div"
            >
              Select shift
            </Typography>
            <FormControl fullWidth>
              <Select
                name="shift_id"
                value={newRecord.shift_id}
                onChange={handleChange("shift_id")}
                displayEmpty
                size="small"
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e0e0e0",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#bdbdbd",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#50ABFF",
                  },
                }}
                MenuProps={{
                  PaperProps: { style: { maxHeight: 400 } },
                  autoFocus: false,
                }}
                renderValue={(selected) => {
                  if (!selected)
                    return (
                      <Typography color="#999" component="span">
                        Select shift
                      </Typography>
                    );
                  const shift = shifts.find((u) => u.id === Number(selected));
                  return (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography sx={{ fontSize: "14px" }} component="span">
                        {shift?.name}
                      </Typography>
                    </Box>
                  );
                }}
              >
                <Box
                  px={2}
                  py={1.5}
                  position="sticky"
                  top={0}
                  bgcolor="white"
                  zIndex={1}
                >
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search shift"
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <SearchIcon sx={{ color: "#999", fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "#e0e0e0" },
                        "&:hover fieldset": { borderColor: "#bdbdbd" },
                        "&.Mui-focused fieldset": { borderColor: "#50ABFF" },
                      },
                    }}
                  />
                </Box>
                {filteredShifts.length === 0 ? (
                  <MenuItem disabled>
                    <Typography color="text.secondary" component="span">
                      No users found
                    </Typography>
                  </MenuItem>
                ) : (
                  filteredShifts.map((shift) => (
                    <MenuItem key={shift.id} value={shift.id.toString()}>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Typography component="span">{shift.name}</Typography>
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <Typography
              variant="body2"
              fontWeight={600}
              color="#1a1a1a"
              component="div"
            >
              Date
            </Typography>
            <Box textAlign="start">
              <Button
                onClick={handleDateButtonClick}
                variant="outlined"
                sx={{
                  width: "fit-content",
                  justifyContent: "space-between",
                  textTransform: "none",
                  color: "#1a1a1a",
                  borderColor: "#e0e0e0",
                  bgcolor: "white",
                  "&:hover": {
                    borderColor: "#e0e0e0",
                    bgcolor: "white",
                    color: "#1a1a1a",
                  },
                  fontSize: "14px",
                  fontWeight: 400,
                }}
              >
                {getDateButtonText()}
              </Button>
            </Box>
          </Box>

          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleDatePopoverClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            PaperProps={{
              sx: {
                mt: 1,
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                borderRadius: "8px",
              },
            }}
          >
            <StyledDayPicker>
              <DayPicker
                mode="single"
                selected={singleDate}
                onSelect={handleSingleDateChange}
                showOutsideDays
                defaultMonth={singleDate || new Date()}
                disabled={{ after: new Date() }}
                modifiersClassNames={{
                  selected: "rdp-day_selected",
                }}
              />
            </StyledDayPicker>
          </Popover>

          <Box display="flex" gap={4} mb={2}>
            {(["start", "end"] as const).map((field) => (
              <Box
                key={field}
                sx={{
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                  py: 0.5,
                  mb: 2,
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color="text.primary"
                  sx={{ width: "10%" }}
                >
                  {field === "start" ? "Start" : "End"}
                </Typography>

                <TextField
                  type="text"
                  value={newRecord[field] ?? ""}
                  placeholder="HH:MM"
                  variant="outlined"
                  size="small"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d:]/g, "");
                    setNewRecord((prev) => ({
                      ...prev,
                      [field]: raw,
                    }));
                  }}
                  onBlur={() => handleBlur(field)}
                  sx={{
                    width: 72,
                    "& .MuiInputBase-input": {
                      fontSize: "0.75rem",
                      textAlign: "center",
                      fontFamily: "monospace",
                    },
                  }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        display="flex"
        gap={2}
        px={3}
        py={2.5}
        borderTop="1px solid #f0f0f0"
        sx={{
          bgcolor: "#fafafa",
          paddingX: "24px",
          paddingY: "16px",
          boxShadow: "0 -2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!newRecord.userId || loading}
          sx={{
            textTransform: "none",
            fontWeight: 500,
            bgcolor: !newRecord.userId ? "#e0e0e0" : "#1e4db7",
            color: "white",
            boxShadow: "none",
            px: 3,
            "&:hover": {
              bgcolor: !newRecord.userId ? "#e0e0e0" : "#1e4db7",
              boxShadow: "none",
            },
            "&:disabled": {
              bgcolor: "#e0e0e0",
              color: "#999",
            },
          }}
        >
          {loading ? <CircularProgress size={24} /> : "Add Leave"}
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
};

export default AddWorklog;
