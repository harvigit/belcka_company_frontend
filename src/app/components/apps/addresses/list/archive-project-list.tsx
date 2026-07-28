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
  Stack,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import api from "@/utils/axios";
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconTrash,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

interface ArchiveProjectProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
  companyId?: number | null;
}
export interface TradeList {
  trade_id: number;
  name: string;
}

export type TeamList = {
  id: number;
  name: string;
};

const ArchiveProject: React.FC<ArchiveProjectProps> = ({
  open,
  onClose,
  onWorkUpdated,
  companyId,
}) => {
  const [data, setData] = useState<TeamList[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    name?: string;
    action: "restore" | "delete";
  } | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!companyId) return;

    try {
      const res = await api.get(
        `project/archive-list-web?company_id=${companyId}`,
      );

      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch archive projects", err);
    }
  }, [companyId]);

  useEffect(() => {
    if (open == true) {
      fetchProjects();
    }
  }, [open]);

  const handleConfirmAction = async () => {
    if (!selectedItem) return;

    try {
      const payload = {
        id: selectedItem.id,
      };

      if (selectedItem.action === "restore") {
        const response = await api.post("project/unarchive", payload);
        if (response.data.IsSuccess) {
          toast.success(response.data.message);
          fetchProjects();
          onWorkUpdated?.();
          onClose?.();
        }
      } else if (selectedItem.action === "delete") {
        const response = await api.post(`project/delete`, payload);
        if (response.data.IsSuccess) {
          toast.success(response.data.message);
          fetchProjects();
          onWorkUpdated?.();
        }
      }
    } catch (err) {
      console.error("Action failed", err);
    } finally {
      setOpenDialog(false);
      setSelectedItem(null);
    }
  };

  const isDelete = selectedItem?.action === "delete";

  return (
    <>
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
                    Archived Project List
                  </Typography>
                </Box>

                {data.map((item, index) => (
                  <Box
                    key={item.id ?? index}
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
                            setSelectedItem({
                              id: item.id,
                              name: item.name,
                              action: "restore",
                            });
                            setOpenDialog(true);
                          }}
                        >
                          <IconArrowBackUp />
                        </IconButton>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => {
                            setSelectedItem({
                              id: item.id,
                              name: item.name,
                              action: "delete",
                            });
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

      {/* Portal outside Drawer so confirm is never hidden under the drawer (same pattern as Timesheet delete). */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setSelectedItem(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 1,
          },
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            {isDelete && <IconAlertTriangle size={24} color="#f97316" />}
            <Typography variant="h6" fontWeight={600}>
              {isDelete ? "Delete Project" : "Restore Project"}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="textSecondary">
            {isDelete ? (
              <>
                Are you sure you want to delete
                {selectedItem?.name ? (
                  <>
                    {" "}
                    <strong>{selectedItem.name}</strong>
                  </>
                ) : (
                  " this project"
                )}
                ? This action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to restore
                {selectedItem?.name ? (
                  <>
                    {" "}
                    <strong>{selectedItem.name}</strong>
                  </>
                ) : (
                  " this project"
                )}
                ?
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setOpenDialog(false);
              setSelectedItem(null);
            }}
            variant="outlined"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmAction}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {isDelete ? "Delete" : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ArchiveProject;
