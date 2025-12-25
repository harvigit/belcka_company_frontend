import React, { useEffect, useState } from "react";
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
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { IconArrowBackUp } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { AxiosResponse } from "axios";

interface ArchiveClientProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
}

export type ClientList = {
  id: number;
  company_id?: number;
  name?: string;
  email: string;
  status: string;
  invite_date: string;
  expired_on: string;
  projects: string;
  company_name: string;
};

const ArchiveClient: React.FC<ArchiveClientProps> = ({
  open,
  onClose,
  onWorkUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<ClientList[]>([]);
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
      const res: AxiosResponse<any> = await api.get(
        `company-clients/archive-list?company_id=${user.company_id}`
      );
      if (res.data?.info) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch archive client", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open == true) {
      fetchArchiveAddress();
    }
  }, [open]);

  const handleConfirmAction = async () => {
    if (!selectedItem) return;

    try {
      const payload = {
        id: selectedItem.id,
      };
      if (selectedItem.action === "restore") {
        let response: AxiosResponse<any> = await api.post(
          "company-clients/unarchive",
          payload
        );
        if (response.data.IsSuccess == true) {
          toast.success(response.data.message);
          onWorkUpdated?.();
        }
      } else if (selectedItem.action === "delete") {
        let response: AxiosResponse<any> = await api.post(
          `/company-locations/delete`,
          payload
        );
        if (response.data.IsSuccess == true) {
          toast.success(response.data.message);
          onWorkUpdated?.();
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
          <Grid container>
            <Grid size={{ xs: 12, lg: 12 }}>
              <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
                <IconButton onClick={onClose}>
                  <IconArrowLeft />
                </IconButton>
                <Typography variant="h6" color="inherit" fontWeight={700}>
                  Archive Client List
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
                    height="20px"
                  >
                    <Box display={"flex"} alignItems={"center"} gap={1}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Name:
                      </Typography>
                      <Typography
                        color="textSecondary"
                        variant="body1"
                        fontWeight={600}
                        className="multi-ellipsis"
                        fontSize={"14px !important"}
                      >
                        {item.name}
                      </Typography>
                    </Box>
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
            ? "Restore Client"
            : "Confirm Deletion"}
        </DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to <strong>{selectedItem?.action}</strong>{" "}
            this client?
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

export default ArchiveClient;
