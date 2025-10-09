import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Grid,
  IconButton,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { Stack } from "@mui/system";
import { IconArrowBackUp, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";

interface ArchiveTaskProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
}
export interface TradeList {
  trade_id: number;
  name: string;
}

export type TaskList = {
  id: number;
  name: string;
  trade_id?: number;
  trade_name?: string;
  duration: string;
  repeatable_job: boolean;
  is_pricework: boolean;
  rate: string;
  units: string;
};

const ArchiveTask: React.FC<ArchiveTaskProps> = ({
  open,
  onClose,
  onWorkUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<TaskList[]>([]);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    action: "restore" | "delete";
  } | null>(null);

  // Fetch data
  const fetchArchiveAddress = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `type-works/archive-works-list?company_id=${user.company_id}`
      );
      if (res.data?.info) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch archive addresses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchiveAddress();
  }, [open]);

  const handleConfirmAction = async () => {
    if (!selectedItem) return;

    try {
      const payload = {
        id: selectedItem.id,
      };
      if (selectedItem.action === "restore") {
        let response = await api.post("type-works/unarchive", payload);
        if (response.data.IsSuccess == true) {
          toast.success(response.data.message);
          onWorkUpdated?.();
        }
      } else if (selectedItem.action === "delete") {
        let response = await api.delete(
          `/type-works/delete?id=${selectedItem.id}`
        );
        if (response.data.IsSuccess == true) {
          toast.success(response.data.message);
        }
      }

      fetchArchiveAddress();
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
                  Archive Task List
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
                  <Stack
                    direction="row"
                    alignItems="center"
                    flexWrap="wrap"
                    position="absolute"
                    top="-13px"
                    left="10px"
                    px={0.5}
                    py={0.5}
                    borderRadius="10px"
                    zIndex={1}
                    gap="2px"
                  >
                    <Chip
                      label={item.trade_name}
                      sx={{
                        bgcolor: "#FF7F00",
                        color: "#fff",
                        fontWeight: "600",
                        height: "19px",
                      }}
                    />
                    <Chip
                      label={`~${item.duration}`}
                      sx={{
                        bgcolor: "#7523D3",
                        color: "#fff",
                        fontWeight: "600",
                        height: "19px",
                      }}
                    />
                    {item.is_pricework ? (
                      <Chip
                        label={`${item.rate}`}
                        sx={{
                          bgcolor: "#32A852",
                          color: "#fff",
                          fontWeight: "600",
                          height: "19px",
                        }}
                      />
                    ) : (
                      <Chip
                        label="Job"
                        sx={{
                          bgcolor: "#FF008C",
                          color: "#fff",
                          fontWeight: "600",
                          height: "19px",
                        }}
                      />
                    )}
                  </Stack>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    width="100%"
                    height="20px"
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      className="archive-multi-ellipsis"
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
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => {
                          setSelectedItem({ id: item.id, action: "delete" });
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

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {selectedItem?.action === "restore"
            ? "Restore Task"
            : "Confirm Deletion"}
        </DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to <strong>{selectedItem?.action}</strong>{" "}
            this template?
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
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default ArchiveTask;
