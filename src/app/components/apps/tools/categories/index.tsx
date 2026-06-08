"use client";
import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Tooltip,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import { IconEdit, IconTrash, IconPlus } from "@tabler/icons-react";
import api from "@/utils/axios";
import toast from "react-hot-toast";

interface ToolCategoriesDrawerProps {
  open: boolean;
  onClose: () => void;
  companyId?: number | null;
  onWorkUpdated?: () => void;
}

const ToolCategoriesDrawer: React.FC<ToolCategoriesDrawerProps> = ({
  open,
  onClose,
  companyId,
  onWorkUpdated,
}) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchCategories = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await api.get(`tool-categories/get?company_id=${companyId}`);
      if (res.data?.info) {
        setCategories(res.data.info);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open, companyId]);

  const handleAddEdit = async () => {
    if (!categoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        company_id: companyId,
        name: categoryName,
        ...(editingId && { id: editingId }),
      };

      const endpoint = editingId
        ? "tool-categories/update"
        : "tool-categories/create";
      const res = await api.post(endpoint, payload);

      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Saved successfully");
        setOpenDialog(false);
        onWorkUpdated?.();
        fetchCategories();
      } else {
        toast.error(res.data?.message || "Failed to save");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const payload = {
        ids: deletingId.toString(),
      };
      const res = await api.post("tool-categories/delete", payload);
      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Deleted successfully");
        setDeleteDialog(false);
        fetchCategories();
      } else {
        toast.error(res.data?.message || "Failed to delete");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Something went wrong");
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setCategoryName("");
    setOpenDialog(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setCategoryName(item.name);
    setOpenDialog(true);
  };

  const openDelete = (id: number) => {
    setDeletingId(id);
    setDeleteDialog(true);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 600,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 600,
          padding: 2,
          backgroundColor: "#f9f9f9",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box sx={{ flex: 1, overflowY: "auto", paddingRight: 1 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={onClose}>
              <IconArrowLeft />
            </IconButton>
            <Typography variant="h6" fontWeight={700}>
              Tool Categories
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={18} />}
            onClick={openAdd}
          >
            Add Category
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    No categories found.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                      >
                        <Tooltip title="Edit">
                          <IconButton
                            onClick={() => openEdit(row)}
                            color="primary"
                            size="small"
                          >
                            <IconEdit size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            onClick={() => openDelete(row.id)}
                            color="error"
                            size="small"
                          >
                            <IconTrash size={18} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Add / Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingId ? "Edit Category" : "Add Category"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            type="text"
            fullWidth
            variant="outlined"
            inputProps={{ maxLength: 50 }}
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddEdit}
            variant="contained"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this category?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default ToolCategoriesDrawer;
