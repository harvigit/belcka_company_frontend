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

type AssignProjectDialogProps = {
  open: boolean;
  onClose: () => void;
  projects: any[];
  productIds: number[];
  onAssigned: () => void;
};

const AssignProjectDialog: React.FC<AssignProjectDialogProps> = ({
  open,
  onClose,
  projects,
  productIds,
  onAssigned,
}) => {
  const [selectedProjects, setSelectedProjects] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelectedProjects([]);
  }, [open]);

  const handleAssign = async () => {
    if (!selectedProjects.length) {
      toast.error("Please select at least one project");
      return;
    }
    setSaving(true);
    try {
      const response = await api.post("products/bulk-assign-projects", {
        product_ids: productIds,
        project_ids: selectedProjects.map((p: any) => p.id),
      });
      if (response.data.IsSuccess) {
        toast.success(response.data.message || "Assigned Successfully");
        onAssigned();
        onClose();
      } else {
        toast.error(response.data.message || "Failed to assign project");
      }
    } catch {
      toast.error("Failed to assign project");
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
      <DialogTitle>Assign Project</DialogTitle>
      <DialogContent>
        <Autocomplete
          multiple
          options={projects || []}
          getOptionLabel={(option: any) => option.name || ""}
          value={selectedProjects}
          onChange={(_, newValue) => setSelectedProjects(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Projects"
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

export default AssignProjectDialog;
