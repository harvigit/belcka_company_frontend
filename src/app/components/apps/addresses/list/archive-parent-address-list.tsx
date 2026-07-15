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
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

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
  const [actionType, setActionType] = useState<"restore" | "delete" | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < data.length;

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

  const handleConfirmAction = async () => {
    if (!actionType || selectedIds.length === 0) return;

    try {
      if (actionType === "restore") {
        for (const id of selectedIds) {
          await api.post("address/parent-unarchive", { id });
        }
        toast.success("Unarchive successfully");
      } else {
        const response = await api.post("address/parent-delete", { address_ids: selectedIds.join(",") });
        if (response.data.IsSuccess) {
          toast.success(response.data.message);
        } else {
          toast.error(response.data.message);
        }
      }
      
      fetchAddresses();
      onWorkUpdated?.();
      setSelectedIds([]);
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
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center" flexWrap="wrap">
                  <IconButton onClick={onClose}>
                    <IconArrowLeft />
                  </IconButton>
                  <Typography variant="h6" color="inherit" fontWeight={700}>
                    Archived Addresses
                  </Typography>
                </Box>
                {data.length > 0 && (
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" mr={1}>
                      Select All
                    </Typography>
                    <CustomCheckbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onChange={handleSelectAll}
                    />
                  </Box>
                )}
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
                  </Box>
                </Box>
              ))}
            </Grid>
          </Grid>
        </Box>
      </Box>

      <Box mt={2} display="flex" gap={2}>
        <Button
          variant="contained"
          color="primary"
          sx={{ borderRadius: 3 }}
          className="drawer_buttons"
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
          sx={{ borderRadius: 3 }}
          className="drawer_buttons"
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
          {actionType === "restore" ? "Confirm Restore" : "Confirm Deletion"}
        </DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to {actionType} selected address(es)?
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
