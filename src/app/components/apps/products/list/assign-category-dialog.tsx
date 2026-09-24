"use client";
import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import api from "@/utils/axios";
import toast from "react-hot-toast";

type AssignCategoryDialogProps = {
  open: boolean;
  onClose: () => void;
  categories: any[];
  productIds: number[];
  onAssigned: () => void;
};

const AssignCategoryDialog: React.FC<AssignCategoryDialogProps> = ({
  open,
  onClose,
  categories,
  productIds,
  onAssigned,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelectedCategory(null);
  }, [open]);

  const handleAssign = async () => {
    if (!selectedCategory) {
      toast.error("Please select a category");
      return;
    }
    setSaving(true);
    try {
      const response = await api.post("products/bulk-assign-categories", {
        product_ids: productIds,
        category_id: selectedCategory.id,
      });
      if (response.data.IsSuccess) {
        toast.success(response.data.message || "Assigned Successfully");
        onAssigned();
        onClose();
      } else {
        toast.error(response.data.message || "Failed to assign category");
      }
    } catch {
      toast.error("Failed to assign category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Assign Category</DialogTitle>
      <DialogContent>
        <Autocomplete
          options={categories || []}
          getOptionLabel={(option: any) => option.name || ""}
          value={selectedCategory}
          onChange={(_, newValue) => setSelectedCategory(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Category"
              variant="outlined"
              fullWidth
              margin="normal"
            />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          variant="outlined"
          color="error"
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleAssign}
          variant="contained"
          color="primary"
          disabled={saving}
          startIcon={
            saving ? <CircularProgress size={14} color="inherit" /> : null
          }
        >
          {saving ? "Assigning..." : "Assign"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignCategoryDialog;
