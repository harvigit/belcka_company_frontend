"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Drawer,
  Box,
  Grid,
  IconButton,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import api from "@/utils/axios";
import { IconArrowBackUp, IconSearch, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

import { AxiosResponse } from "axios";

interface ArchiveTeamProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
}
export interface TradeList {
  trade_id: number;
  name: string;
}

export type TeamList = {
  id: number;
  name: string;
};

const ArchiveTeam: React.FC<ArchiveTeamProps> = ({
  open,
  onClose,
  onWorkUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<TeamList[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const isIndeterminate =
    selectedIds.length > 0 && selectedIds.length < data.length;
  const [actionType, setActionType] = useState<"restore" | "delete" | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");

  const handleCheckboxChange = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      const allIds = data.map((item) => item.id);
      setSelectedIds(allIds);
    }
  };

  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    action: "restore" | "delete";
  } | null>(null);

  // Fetch data
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const res: AxiosResponse<any> = await api.get(`team/archive-team-list`);

      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch trades", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open == true) {
      fetchTeams();
    }
  }, [open]);

  const handleConfirmAction = async () => {
    if (!actionType || selectedIds.length === 0) return;

    try {
      const payload = {
        teams_ids: selectedIds.join(","),
      };

      if (actionType === "restore") {
        const response = await api.post("team/unarchive", payload);
        if (response.data.IsSuccess) {
          toast.success(response.data.message);
          fetchTeams();
          onWorkUpdated?.();
          onClose();
        }
      } else if (actionType === "delete") {
        const response = await api.delete(
          `/team/delete?team_ids=${selectedIds.join(",")}`,
        );
        if (response.data.IsSuccess) {
          toast.success(response.data.message);
          fetchTeams();
          onWorkUpdated?.();
          onClose();
        }
      }
    } catch (err) {
      console.error("Action failed", err);
      // toast.error("Something went wrong");
    }
  };
  const filteredData = useMemo(() => {
    let filtered = data.filter((item) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(search);
      return matchesSearch;
    });

    return filtered;
  }, [data, searchTerm]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 400,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 400,
          padding: 2,
          backgroundColor: "#f9f9f9",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          paddingRight: 1,
        }}
      >
        <Box className="task-form">
          <Grid container>
            <Grid size={{ xs: 12, lg: 12 }}>
              <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
                <IconButton onClick={onClose}>
                  <IconArrowLeft />
                </IconButton>
                <Typography variant="h6" color="inherit" fontWeight={700}>
                  Archived Team List
                </Typography>
              </Box>
              <Box display={"flex"} gap={1} justifyItems={"center"}>
                <TextField
                  id="search"
                  type="text"
                  size="small"
                  variant="outlined"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconSearch size={"16"} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent={"flex-end"}
                >
                  <Typography variant="body2">Select All</Typography>
                  <CustomCheckbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onChange={handleSelectAll}
                  />
                </Box>
              </Box>

              {filteredData.length === 0 && (
                <Box mt={2} p={2} textAlign="center">
                  <Typography variant="body1" color="textSecondary">
                    No records found...
                  </Typography>
                </Box>
              )}
              {filteredData.map((item, index) => (
                <Box
                  key={index}
                  mt={2}
                  p={2}
                  position="relative"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    border: "1px solid #999999",
                    borderRadius: "15px",
                  }}
                >
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    width="100%"
                  >
                    <Box display={"flex"} alignItems={"center"} gap={1}>
                      <CustomCheckbox
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleCheckboxChange(item.id)}
                      />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Name:
                      </Typography>
                      <Typography
                        color="textSecondary"
                        variant="body1"
                        fontWeight={600}
                        className="f-14"
                        sx={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: 1.25,
                          maxWidth: 180,
                          wordBreak: "break-word",
                        }}
                      >
                        {item.name}
                      </Typography>
                    </Box>
                    <Box display={"flex"} fontSize="10px">
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => {
                          setSelectedIds([item.id]);
                          setActionType("restore");
                          setOpenDialog(true);
                        }}
                      >
                        <IconArrowBackUp />
                      </IconButton>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => {
                          setSelectedIds([item.id]);
                          setActionType("delete");
                          setOpenDialog(true);
                        }}
                      >
                        <IconTrash />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Grid>
          </Grid>
        </Box>
      </Box>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          sx={{ borderRadius: 3, mr: 2 }}
          startIcon={<IconArrowBackUp />}
          disabled={selectedIds.length === 0}
          onClick={() => {
            setActionType("restore");
            setOpenDialog(true);
          }}
        >
          Restore
        </Button>
        <Button
          variant="contained"
          color="error"
          sx={{ borderRadius: 3, mr: 2 }}
          startIcon={<IconTrash />}
          disabled={selectedIds.length === 0}
          onClick={() => {
            setActionType("delete");
            setOpenDialog(true);
          }}
        >
          Delete
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

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {actionType === "restore" ? "Restore Team" : "Confirm Deletion"}
        </DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to <strong>{actionType}</strong> this team?
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
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              handleConfirmAction();
              setOpenDialog(false);
            }}
          >
            {actionType === "restore" ? "Confirm" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default ArchiveTeam;
