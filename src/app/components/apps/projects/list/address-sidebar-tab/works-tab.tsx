"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Badge,
} from "@mui/material";
import { Stack } from "@mui/system";
import {
  IconChevronRight,
  IconFilter,
  IconPaperclip,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import WorkDetailPage from "@/app/components/works";

interface WorksTabProps {
  addressId: number;
  companyId: number;
}

type FilterState = {
  type: string;
};

export const WorksTab = ({ addressId, companyId }: WorksTabProps) => {
  const [tabData, setTabData] = useState<any[]>([]);
  const [searchWork, setSearchWork] = useState<string>("");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number>(0);
  const [open, setOpen] = useState<boolean>(false);
  const [filterOptions, setFilterOptions] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterState>({ type: "" });
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);
  const [openSidebar, setOpenSidebar] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState(null);

  const fetchWorkTabData = async () => {
    try {
      const res = await api.get("/project/get-works", {
        params: { address_id: addressId, company_id: companyId },
      });

      if (res.data?.IsSuccess) {
        setTabData(res.data.info || []);
      } else {
        setTabData([]);
      }
    } catch {
      setTabData([]);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const res = await api.get("/trade/web-company-trades", {
        params: { company_id: companyId },
      });
      if (res.data?.IsSuccess) {
        setFilterOptions(res.data.company_trades || []);
      } else {
        setFilterOptions([]);
      }
    } catch {
      setFilterOptions([]);
    }
  };
  const formatHour = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "-";
    const num = parseFloat(val.toString());
    if (isNaN(num)) return "-";

    const h = Math.floor(num);
    const m = Math.round((num - h) * 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const truncateText = (text: string, maxLength: number = 12) => {
    if (!text) return "";
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  useEffect(() => {
    if (addressId) {
      fetchWorkTabData();
      fetchFilterOptions();
    }
  }, [addressId]);

  const filteredData = useMemo(() => {
    let data = [...tabData];

    if (filters.type) {
      data = data.filter((item) => item.trade_id?.toString() === filters.type);
    }

    if (searchWork.trim()) {
      const search = searchWork.trim().toLowerCase();
      data = data.filter(
        (item) =>
          item.name?.toLowerCase().includes(search) ||
          item.trade_name?.toLowerCase().includes(search)
      );
    }

    return data;
  }, [searchWork, tabData, filters]);

  const handleTaskDelete = async () => {
    try {
      const payload = {
        task_ids: String(selectedIds),
      };
      const response = await api.post("company-tasks/delete", payload);

      if (response.data.IsSuccess === true) {
        toast.success(response.data.message);
        await fetchWorkTabData();
      }
    } catch (error) {
    } finally {
      setOpenDialog(false);
    }
  };

  const handleWorkClick = (workId: any) => {
    setSelectedWorkId(workId);
    setOpenSidebar(true);
  };
  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
        sx={{ flexWrap: "wrap" }}
      >
        <TextField
          placeholder="Search..."
          size="small"
          value={searchWork}
          onChange={(e) => setSearchWork(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconSearch size={16} />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: "100%", sm: "80%" }, mb: { xs: 2, sm: 0 } }}
        />
        <Button variant="contained" onClick={() => setOpen(true)}>
          <IconFilter width={18} />
        </Button>
      </Stack>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ m: 0, position: "relative", overflow: "visible" }}>
          Filters
          <IconButton
            aria-label="close"
            onClick={() => setOpen(false)}
            size="large"
            sx={{
              position: "absolute",
              right: 12,
              top: 8,
              color: (theme) => theme.palette.grey[900],
              backgroundColor: "transparent",
              zIndex: 10,
              width: 50,
              height: 50,
            }}
          >
            <IconX size={40} style={{ width: 40, height: 40 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Autocomplete
              options={filterOptions}
              getOptionLabel={(opt: any) => opt.name || ""}
              value={
                filterOptions.find(
                  (opt) => opt.id.toString() === tempFilters.type
                ) || null
              }
              onChange={(_, newValue) => {
                setTempFilters({
                  ...tempFilters,
                  type: newValue ? newValue.id.toString() : "",
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Trade Type"
                  placeholder="Search trade type..."
                  fullWidth
                />
              )}
              clearOnEscape
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setFilters({ type: "" });
              setTempFilters({ type: "" });
              setOpen(false);
            }}
            color="inherit"
          >
            Clear
          </Button>

          <Button
            variant="contained"
            onClick={() => {
              setFilters(tempFilters);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
      <WorkDetailPage
        open={openSidebar}
        onClose={() => setOpenSidebar(false)}
        workId={selectedWorkId}
        companyId={companyId}
        addressId={addressId}
      />

      {/* List of works */}
      {filteredData.length > 0 ? (
        filteredData.map((work, idx) => (
          <Box
            key={idx}
            mb={2}
            sx={{ display: "flex", flexDirection: "column", cursor: "pointer" }}
            onClick={() => handleWorkClick(work.id)}
          >
            <Box
              sx={{
                position: "relative",
                border: "1px solid #ccc",
                borderRadius: 2,
                p: 2,
                mb: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                "&:hover": {
                  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
                },
              }}
            >
              {/* Labels */}
              <Box
                sx={{
                  position: "absolute",
                  top: -10,
                  left: 16,
                  right: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 1,
                  flexWrap: "wrap",
                  zIndex: 1,
                }}
              >
                <Box display={"flex"} gap={1}>
                  <Tooltip title={work.trade_name || ""} arrow>
                    <Box
                      sx={{
                        backgroundColor: "#FF7A00",
                        border: "1px solid #FF7A00",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: 500,
                        px: 1,
                        py: 0.2,
                        borderRadius: "999px",
                        maxWidth: "80px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                    >
                      {truncateText(work.trade_name)}
                    </Box>
                  </Tooltip>

                  <Box
                    sx={{
                      backgroundColor: "#7523D3",
                      border: "1px solid #7523D3",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 500,
                      px: 1,
                      py: 0.2,
                      borderRadius: "999px",
                    }}
                  >
                    {work.duration}
                  </Box>

                  <Box
                    sx={{
                      backgroundColor:
                        work.repeatable_job === "Task" ? "#32A852" : "#FF008C",
                      border:
                        work.repeatable_job === "Task"
                          ? "1px solid #32A852"
                          : "1px solid #FF008C",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 500,
                      px: 1,
                      py: 0.2,
                      borderRadius: "999px",
                    }}
                  >
                    {work.repeatable_job === "Task" ? work.rate : "Job"}
                  </Box>

                  <Box
                    sx={{
                      backgroundColor: work.status_color,
                      border: `1px solid ${work.status_color}`,
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 500,
                      px: 1,
                      py: 0.2,
                      borderRadius: "999px",
                    }}
                  >
                    {work.status_text}
                  </Box>
                </Box>
                <Box display={"flex"} gap={1} alignItems={"center"}>
                  <Badge
                    badgeContent={work.count}
                    color="error"
                    overlap="circular"
                  >
                    {work.count > 0 && (
                      <IconButton
                        sx={{
                          minHeight: "20px !important",
                          height: "10px",
                          top: "3px",
                          backgroundColor: "white",
                          "&:hover": {
                            backgroundColor: "white !important",
                          },
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <IconPaperclip color="#1e4db7" />
                      </IconButton>
                    )}
                  </Badge>
                </Box>
              </Box>

              {/* Work row */}
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ width: "100%", mt: 1 }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    fontWeight="bold"
                    sx={{ fontSize: { xs: "1rem", sm: "1.125rem" } }}
                  >
                    {work.name}
                  </Typography>
                </Box>

                {work.is_checklog === false && work.is_completed == false && (
                  <IconButton
                    color="error"
                    onClick={(e) => {
                      setOpenDialog(true);
                      setSelectedIds(work.id);
                      e.stopPropagation();
                    }}
                  >
                    <IconTrash width={18} />
                  </IconButton>
                )}

                {parseFloat(work.total_work_hours) > 0 && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight="bold" fontSize="1.25rem">
                      {formatHour(work.total_work_hours)} H
                    </Typography>
                    <IconButton>
                      <IconChevronRight
                        fontSize="small"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </IconButton>
                  </Stack>
                )}
              </Stack>
            </Box>
          </Box>
        ))
      ) : (
        <Typography variant="body2" color="text.secondary">
          No works found for this address.
        </Typography>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to delete this task?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>
          <Button onClick={handleTaskDelete} variant="outlined" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
