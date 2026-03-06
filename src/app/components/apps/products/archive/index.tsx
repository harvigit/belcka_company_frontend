"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import api from "@/utils/axios";
import { IconArrowBackUp, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

interface ArchiveProductProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
  companyId?: number | null;
}

const ArchiveProduct: React.FC<ArchiveProductProps> = ({
  open,
  onClose,
  onWorkUpdated,
  companyId,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionType, setActionType] = useState<"restore" | "delete" | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const isAllSelected = data.length > 0 && selectedIds.length === data.length;

  const isIndeterminate =
    selectedIds.length > 0 && selectedIds.length < data.length;
  const fetchProjects = useCallback(async () => {
    if (!companyId) return;

    try {
      const res = await api.get(
        `products/archive-list?company_id=${companyId}`,
      );
      if (res.data) setData(res.data.info);
    } catch (err) {
      console.error("Failed to fetch archive products", err);
    }
  }, [companyId]);

  useEffect(() => {
    if (open) {
      fetchProjects();
      setSelectedIds([]);
    }
  }, [open]);

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
      setIsSaving(true);
      const payload = {
        product_ids: selectedIds.join(","),
      };

      if (actionType === "restore") {
        const response = await api.post("products/unarchive", payload);
        if (response.data.IsSuccess) {
          toast.success(response.data.message);
          fetchProjects();
          onWorkUpdated?.();
          onClose?.();
        }
      } else {
        const response = await api.post("products/delete", payload);
        if (response.data.IsSuccess) {
          toast.success(response.data.message);
          fetchProjects();
          onWorkUpdated?.();
        }
      }

      fetchProjects();
      onWorkUpdated?.();
      setSelectedIds([]);
      setIsSaving(false);
    } catch (err) {
      console.error("Action failed", err);
    }
    setIsSaving(false);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 450,
        "& .MuiDrawer-paper": {
          width: 450,
          padding: 2,
          backgroundColor: "#f9f9f9",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Product List */}
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Box display="flex" alignItems="center">
            <IconButton onClick={onClose}>
              <IconArrowLeft />
            </IconButton>
            <Typography variant="h6" fontWeight={700}>
              Archived Product List
            </Typography>
          </Box>
          {data.length > 0 && (
            <Box display="flex" alignItems="center">
              <FormControlLabel
                label="Select All"
                control={
                  <CustomCheckbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onChange={handleSelectAll}
                  />
                }
              />
            </Box>
          )}
        </Box>

        {data.map((item) => (
          <Box
            key={item.id}
            mt={2}
            p={2}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              border: "1px solid #999999",
              borderRadius: "15px",
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <FormControlLabel
                label={
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
                      maxWidth: 350,
                      wordBreak: "break-word",
                    }}
                  >
                    {item.name ? item.name : item.sort_name}
                  </Typography>
                }
                control={
                  <CustomCheckbox
                    checked={selectedIds.includes(item.id)}
                    onChange={() => handleCheckboxChange(item.id)}
                  />
                }
              />
            </Box>
          </Box>
        ))}
      </Box>

      {/* Bottom Action Buttons */}
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

      {/* Confirmation Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {actionType === "restore" ? "Confirm Restore" : "Confirm Deletion"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to <strong>{actionType}</strong> selected
            products?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              handleConfirmAction();
              setOpenDialog(false);
            }}
            disabled={isSaving}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default ArchiveProduct;
