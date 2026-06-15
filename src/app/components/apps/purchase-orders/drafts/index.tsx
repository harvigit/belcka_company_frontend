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
  Tooltip,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import api from "@/utils/axios";
import { IconCheck, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";

interface DraftPurchaseOrderProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
  companyId?: number | null;
  onEditOrder?: (order: any) => void;
}

const DraftPurchaseOrder: React.FC<DraftPurchaseOrderProps> = ({
  open,
  onClose,
  onWorkUpdated,
  companyId,
  onEditOrder,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    action: "create" | "delete";
  } | null>(null);

  // Fetch data
  const fetchDrafts = useCallback(async () => {
    if (!companyId) return;

    try {
      const res = await api.get(
        `purchase-orders/get?company_id=${companyId}&is_draft=true`,
      );

      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch drafts", err);
    }
  }, [companyId]);

  useEffect(() => {
    if (open == true) {
      fetchDrafts();
    }
  }, [open, fetchDrafts]);

  const handleConfirmAction = async () => {
    if (!selectedItem) return;

    try {
      if (selectedItem.action === "create") {
        const res = await api.get(
          `purchase-orders/detail?company_id=${companyId}&id=${selectedItem.id}`,
        );
        const orderData = res.data?.info;
        if (orderData) {
          setOpenDialog(false);
          onEditOrder?.(orderData);
          onClose?.();
        }
      } else if (selectedItem.action === "delete") {
        const payload = {
          id: selectedItem.id,
        };
        const response = await api.post(`purchase-orders/delete`, payload);
        if (response.data.IsSuccess) {
          toast.success(response.data.message);
          setOpenDialog(false);
          fetchDrafts();
          onWorkUpdated?.();
        }
      }
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
            <Grid size={{ xs: 12 }}>
              <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
                <IconButton onClick={onClose}>
                  <IconArrowLeft />
                </IconButton>
                <Typography variant="h6" color="inherit" fontWeight={700}>
                  Draft Purchase Orders
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
                    <Box display={"flex"} flexDirection="column" gap={0.5}>
                      <Box display={"flex"} alignItems={"center"} gap={1}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          Order ID:
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
                          {item.order_id ? item.order_id : ""}
                        </Typography>
                      </Box>
                      {item.ref && (
                        <Box display={"flex"} alignItems={"center"} gap={1}>
                          <Typography variant="subtitle2" fontWeight={500}>
                            Ref:
                          </Typography>
                          <Typography color="textSecondary" variant="body2">
                            {item.ref}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <Box display={"flex"} fontSize="10px">
                      <Tooltip title="Create Order">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => {
                            setSelectedItem({ id: item.id, action: "create" });
                            setOpenDialog(true);
                          }}
                        >
                          <IconCheck size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Draft">
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => {
                            setSelectedItem({ id: item.id, action: "delete" });
                            setOpenDialog(true);
                          }}
                        >
                          <IconTrash size={18} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              ))}
              {data.length === 0 && (
                <Box mt={4} textAlign="center">
                  <Typography color="textSecondary">
                    No drafts found.
                  </Typography>
                </Box>
              )}
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
          {selectedItem?.action === "create"
            ? "Create Order"
            : "Confirm Deletion"}
        </DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to{" "}
            <strong>
              {selectedItem?.action === "create" ? "create" : "delete"}
            </strong>{" "}
            this draft order?
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
            color={selectedItem?.action === "create" ? "primary" : "error"}
            variant="contained"
            onClick={() => {
              handleConfirmAction();
              setOpenDialog(false);
            }}
          >
            {selectedItem?.action === "create" ? "Proceed" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default DraftPurchaseOrder;
