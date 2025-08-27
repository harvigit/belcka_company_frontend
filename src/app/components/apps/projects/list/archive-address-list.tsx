"use client";
import React, { useCallback, useEffect, useState } from "react";
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
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import api from "@/utils/axios";
import { IconArrowBackUp, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";

interface ArchiveAddressProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
  projectId?: number | null;
}
export interface TradeList {
  trade_id: number;
  name: string;
}

export type TeamList = {
  id: number;
  name: string;
};

const ArchiveAddress: React.FC<ArchiveAddressProps> = ({
  open,
  onClose,
  onWorkUpdated,
  projectId,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<TeamList[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    action: "restore" | "delete";
  } | null>(null);
  // Fetch data
  const fetchTeams = useCallback(async () => {
    if (!projectId) return;

    try {
      const res = await api.get(
        `address/archive-list?project_id=${projectId}`
      );

      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch trades", err);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleConfirmAction = async () => {
    if (!selectedItem) return;

    try {
      const payload = {
        id: selectedItem.id,
      };

      if (selectedItem.action === "restore") {
        const response = await api.post("address/unarchive", payload);
        if (response.data.IsSuccess) {
          toast.success(response.data.message);
          fetchTeams();
          onWorkUpdated?.();
          onClose();
        }
      } else if (selectedItem.action === "delete") {
        const response = await api.delete(
          `/address/delete?id=${selectedItem.id}`
        );
        if (response.data.IsSuccess) {
          toast.success(response.data.message);
          fetchTeams();
        }
      }
    } catch (err) {
      console.error("Action failed", err);
    }
  };

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
          <Grid container mt={3}>
            <Grid size={{ xs: 12, lg: 12 }}>
              <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
                <IconButton onClick={onClose}>
                  <IconArrowLeft />
                </IconButton>
                <Typography variant="h5" fontWeight={700}>
                  Archive Address List
                </Typography>
              </Box>

              {data.map((item, index) => (
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
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      className="multi-ellipsis"
                    >
                      Name: {item.name}
                    </Typography>
                    <Box display={"flex"} fontSize="10px">
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => {
                          setSelectedItem({ id: item.id, action: "restore" });
                          setOpenDialog(true);
                        }}
                      >
                        <IconArrowBackUp />
                      </IconButton>
                      {/* <IconButton
                        color="error"
                        size="small"
                        onClick={() => {
                          setSelectedItem({ id: item.id, action: "delete" });
                          setOpenDialog(true);
                        }}
                      >
                        <IconTrash />
                      </IconButton> */}
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
          color="error"
          onClick={onClose}
          variant="contained"
          size="medium"
          fullWidth
        >
          Close
        </Button>
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {selectedItem?.action === "restore"
            ? "Restore Task"
            : "Confirm Deletion"}
        </DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to <strong>{selectedItem?.action}</strong>{" "}
            this task?
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
            {selectedItem?.action === "restore" ? "Confirm" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default ArchiveAddress;
