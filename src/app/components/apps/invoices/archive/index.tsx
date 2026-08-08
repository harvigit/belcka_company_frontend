"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Stack,
  Chip,
  TextField,
  InputAdornment,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import api from "@/utils/axios";
import { IconArrowBackUp, IconSearch, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

interface ArchiveInvoiceProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
  companyId?: number | null;
}

const ArchiveInvoice: React.FC<ArchiveInvoiceProps> = ({
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
  const [searchTerm, setSearchTerm] = useState("");

  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const isIndeterminate =
    selectedIds.length > 0 && selectedIds.length < data.length;

  const fetchArchivedInvoices = useCallback(async () => {
    if (!companyId) return;

    try {
      const res = await api.get(
        `po-invoices/archive-list?company_id=${companyId}`,
      );
      if (res.data) setData(res.data.info || []);
    } catch (err) {
      console.error("Failed to fetch archived invoices", err);
    }
  }, [companyId]);

  useEffect(() => {
    if (open) {
      fetchArchivedInvoices();
      setSelectedIds([]);
      setSearchTerm("");
    }
  }, [open, fetchArchivedInvoices]);

  const handleCheckboxChange = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((item) => item.id));
    }
  };

  const handleConfirmAction = async () => {
    if (!actionType || selectedIds.length === 0) return;

    try {
      setIsSaving(true);
      const payload = {
        invoice_ids: selectedIds.join(","),
        company_id: companyId,
      };

      if (actionType === "restore") {
        const response = await api.post("po-invoices/unarchive", payload);
        if (response.data.IsSuccess) {
          toast.success(response.data.message);
          fetchArchivedInvoices();
          onWorkUpdated?.();
          onClose?.();
        }
      } else {
        const response = await api.post("po-invoices/delete", payload);
        if (response.data.IsSuccess) {
          toast.success(response.data.message);
          fetchArchivedInvoices();
          onWorkUpdated?.();
        }
      }

      setSelectedIds([]);
    } catch (err) {
      console.error("Action failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return data;

    return data.filter((item) => {
      const invoiceId = String(item.invoice_id || "").toLowerCase();
      const project = String(item.project || "").toLowerCase();
      const supplier = String(item.supplier || "").toLowerCase();
      const description = String(item.description || "").toLowerCase();
      return (
        invoiceId.includes(search) ||
        project.includes(search) ||
        supplier.includes(search) ||
        description.includes(search) ||
        String(item.id).includes(search)
      );
    });
  }, [data, searchTerm]);

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
              Archived Invoice List
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

        <TextField
          id="search"
          type="text"
          size="small"
          variant="outlined"
          placeholder="Search..."
          value={searchTerm}
          fullWidth
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconSearch size={16} />
                </InputAdornment>
              ),
            },
          }}
        />

        {filteredData.length === 0 && (
          <Box mt={2} p={2} textAlign="center">
            <Typography variant="body1" color="textSecondary">
              No records found for invoices..
            </Typography>
          </Box>
        )}

        {filteredData.map((invoice) => (
          <Box
            key={invoice.id}
            mt={1}
            p={1.5}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              border: "1px solid #e7e3e3ff",
              borderRadius: "10px",
            }}
          >
            <Box display="flex" alignItems="center" gap={1} width="100%">
              <CustomCheckbox
                checked={selectedIds.includes(invoice.id)}
                onChange={() => handleCheckboxChange(invoice.id)}
              />
              <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  flexWrap="wrap"
                >
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    component="span"
                    sx={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: 1.25,
                      wordBreak: "break-word",
                    }}
                  >
                    {invoice.invoice_id || "-"}
                  </Typography>
                  {invoice.project ? (
                    <Chip label={invoice.project} size="small" />
                  ) : null}
                </Box>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {[invoice.supplier, invoice.expected_delivery_date]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </Typography>
              </Stack>
            </Box>
          </Box>
        ))}
      </Box>

      <Box mt={2} display="flex" gap={2} flexWrap="wrap">
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
            {(() => {
              const labels = selectedIds.map((id) => {
                const row = data.find((item) => item.id === id);
                return String(row?.invoice_id || "").trim() || String(id);
              });
              const actionLabel = actionType === "restore" ? "restore" : "delete";
              if (labels.length === 1) {
                return (
                  <>
                    Are you sure you want to {actionLabel} invoice{" "}
                    <strong>{labels[0]}</strong>?
                  </>
                );
              }
              return (
                <>
                  Are you sure you want to {actionLabel} these invoices:{" "}
                  <strong>{labels.join(", ")}</strong>?
                </>
              );
            })()}
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

export default ArchiveInvoice;
