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
import { IconArrowBackUp } from "@tabler/icons-react";
import toast from "react-hot-toast";

interface ArchiveParentAddressProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
  companyId?: number | null;
}

export type ParentAddressList = {
  id: number;
  name: string;
};

const ArchiveParentAddress: React.FC<ArchiveParentAddressProps> = ({
  open,
  onClose,
  onWorkUpdated,
  companyId,
}) => {
  const [data, setData] = useState<ParentAddressList[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    action: "restore";
  } | null>(null);

  // Fetch data
  const fetchAddresses = useCallback(async () => {
    if (!companyId) return;

    try {
      const res = await api.get(
        `address/parent-archive-list?company_id=${companyId}`,
      );

      if (res.data) {
        setData(res.data.info || res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch archived parent addresses", err);
    }
  }, [companyId]);

  useEffect(() => {
    if (open) {
      fetchAddresses();
    }
  }, [open, fetchAddresses]);

  const handleConfirmAction = async () => {
    if (!selectedItem) return;

    try {
      const payload = {
        id: selectedItem.id,
      };

      if (selectedItem.action === "restore") {
        const response = await api.post("address/parent-unarchive", payload);
        if (response.data.IsSuccess) {
          toast.success(response.data.message || "Unarchive successfully");
          fetchAddresses();
          onWorkUpdated?.();
        }
      }
    } catch (err) {
      console.error("Action failed", err);
      toast.error("Action failed");
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
                  Archived Addresses
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
                          setSelectedItem({ id: item.id, action: "restore" });
                          setOpenDialog(true);
                        }}
                      >
                        <IconArrowBackUp />
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
        <DialogTitle>Restore Address</DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to restore this address?
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
            color="primary"
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

export default ArchiveParentAddress;
