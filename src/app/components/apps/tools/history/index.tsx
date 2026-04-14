"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Button,
  Divider,
} from "@mui/material";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import CloseIcon from "@mui/icons-material/Close";
import { Grid } from "@mui/system";
import Image from "next/image";

interface HireHistoryProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
  companyId?: number | null;
  setId?: number | null;
}

const HireHistory: React.FC<HireHistoryProps> = ({
  open,
  onClose,
  onWorkUpdated,
  companyId,
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [requestOrders, setRequestOrders] = useState<any[]>([]);
  const [value, setValue] = useState(0);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleTabChange = (event: any, newValue: number) => {
    setValue(newValue);
    setOrders([]);
    setRequestOrders([]);
  };

  const tabStatusMap: Record<number, number> = {
    0: 1,
    1: 2,
    2: 3,
    3: 4,
    4: 6,
  };

  const hireStatus = {
    AVAILABLE: 1,
    REQUEST: 2,
    HIRED: 3,
    IN_SERVICE: 4,
    DAMAGED: 5,
    CANCELLED: 6,
  };

  const fetchOrders = useCallback(async () => {
    if (!companyId) return;

    try {
      const status = tabStatusMap[value];

      const res = await api.get(
        `hire-orders/get-products?company_id=${companyId}&status=${status}`,
      );

      if (res.data.IsSuccess) {
        setOrders(res.data.info);
      }
    } catch (err) {
      console.error(err);
    }
  }, [companyId, value]);

  const fetchRequestOrders = useCallback(async () => {
    if (!companyId) return;

    try {
      const res = await api.get(
        `hire-orders/get?company_id=${companyId}&status=${hireStatus.REQUEST}`,
      );

      if (res.data.IsSuccess) {
        setRequestOrders(res.data.info);
      }
    } catch (err) {
      console.error(err);
    }
  }, [companyId]);

  useEffect(() => {
    if (!open) return;
    if (value === 1) {
      fetchRequestOrders();
    } else {
      fetchOrders();
    }
  }, [open, value, fetchOrders, fetchRequestOrders]);

  const handleStatusChange = async ({
    orderId,
    productIds,
    status,
    needService = false,
  }: {
    orderId: number;
    productIds: number[];
    status: number;
    needService?: boolean;
  }) => {
    try {
      setLoadingId(orderId);

      const res = await api.post(`hire-orders/update-status`, {
        company_id: companyId,
        id: orderId,
        status,
        product_ids: productIds.join(","),
        ...(status === hireStatus.IN_SERVICE && {
          need_service: needService,
        }),
      });

      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        onWorkUpdated?.();

        if (value === 1) {
          fetchRequestOrders();
        } else {
          fetchOrders();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 480,
        "& .MuiDrawer-paper": { width: 480, backgroundColor: "#f9f9f9" },
      }}
    >
      <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
        {/* HEADER */}
        <Box
          display="flex"
          justifyContent="space-between"
          textAlign={"center"}
          px={1}
        >
          <Typography fontWeight={600}>Hire</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Tabs value={value} onChange={handleTabChange}>
          <Tab label="Available" className="hire_tabs" />
          <Tab label="Request" className="hire_tabs" />
          <Tab label="Hired" className="hire_tabs" />
          <Tab label="In Service" className="hire_tabs" />
          <Tab label="Cancel" className="hire_tabs" />
        </Tabs>

        <Box p={2}>
          {value === 1 ? (
            requestOrders.length > 0 ? (
              <Grid container spacing={2}>
                {requestOrders.map((order, idx) => (
                  <Grid size={{ xs: 12 }} key={idx}>
                    <Box
                      sx={{
                        border: "1px solid #ddd",
                        borderRadius: 2,
                        position: "relative",
                        p: 2,
                        bgcolor: "white",
                        transition: "0.2s",
                        cursor: "pointer",
                        "&:hover": {
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          transform: "translateY(-1px)",
                        },
                      }}
                    >
                      <Box
                        justifyContent="space-between"
                        alignItems="center"
                        mb={1}
                        sx={{ top: -8, position: "absolute" }}
                        flexWrap="wrap"
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            px: 1.2,
                            py: 0.2,
                            borderRadius: "12px",
                            bgcolor: "#FF7F00",
                            color: "#fff",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            textTransform: "capitalize",
                          }}
                        >
                          Order: #{order.order_id}
                        </Typography>
                      </Box>
                      {order.products.map((product: any) => (
                        <Box
                          key={product.id}
                          display="block"
                          gap={1}
                          alignItems="center"
                        >
                          <Typography fontWeight={500} textAlign={"end"}>
                            {order.user_name}
                          </Typography>
                          <Box
                            display={"block "}
                            alignItems={"center"}
                            justifyContent={"space-between"}
                            sx={{ p: 1 }}
                          >
                            <Typography color="textSecondary">
                              Hire: {order.from_date_formate} -{" "}
                              {order.from_date_formate}
                            </Typography>
                            <Typography color="textSecondary">
                              Order Date: {order.date}
                            </Typography>
                          </Box>
                          <Box
                            display="flex"
                            gap={1}
                            mt={1}
                            alignItems="center"
                          >
                            <Image
                              src={
                                product.image_url ||
                                "/images/products/product.svg"
                              }
                              alt="product"
                              width={50}
                              height={50}
                            />

                            <Box flex={1}>
                              <Typography fontWeight={500}>
                                {product.short_name}
                              </Typography>
                              <Box
                                display={"flex"}
                                alignItems={"center"}
                                justifyContent={"space-between"}
                              >
                                <Typography
                                  variant="caption"
                                  color="textSecondary"
                                >
                                  {product.uuid}
                                </Typography>
                                <Box
                                  display="flex"
                                  gap={1}
                                  justifyContent={"end"}
                                >
                                  <Button
                                    disabled={loadingId === order.id}
                                    onClick={() =>
                                      handleStatusChange({
                                        orderId: order.id,
                                        productIds: [product.product_id],
                                        status: hireStatus.HIRED,
                                      })
                                    }
                                    sx={{
                                      px: 1.6,
                                      py: 0.7,
                                      borderRadius: "18px",
                                      border: 2,
                                      bgcolor: "#32A852",
                                      color: "#fff",
                                      fontSize: "0.75rem",
                                      fontWeight: 500,
                                      textTransform: "capitalize",
                                      "&:hover": {
                                        bgcolor: "#32A852",
                                        color: "#fff",
                                      },
                                    }}
                                  >
                                    Approve
                                  </Button>

                                  <Button
                                    disabled={loadingId === order.id}
                                    onClick={() =>
                                      handleStatusChange({
                                        orderId: order.id,
                                        productIds: [product.product_id],
                                        status: hireStatus.CANCELLED,
                                      })
                                    }
                                    sx={{
                                      px: 1.6,
                                      py: 0.7,
                                      borderRadius: "18px",
                                      border: 2,
                                      bgcolor: "#FF0000",
                                      color: "#fff",
                                      fontSize: "0.75rem",
                                      fontWeight: 500,
                                      textTransform: "capitalize",
                                      "&:hover": {
                                        bgcolor: "#FF0000",
                                        color: "#fff",
                                      },
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </Box>
                              </Box>
                              <Typography variant="body2" fontWeight={500}>
                                {product.supplier_name}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography textAlign="center" mt={4}>
                No data found.
              </Typography>
            )
          ) : orders.length > 0 ? (
            <Grid container spacing={2}>
              {orders.map((work, idx) => (
                <Grid size={{ xs: 12 }} key={idx}>
                  <Box
                    sx={{
                      border: "1px solid #ddd",
                      borderRadius: 2,
                      position: "relative",
                      p: 2,
                      bgcolor: "white",
                      transition: "0.2s",
                      cursor: "pointer",
                      "&:hover": {
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    <Box
                      justifyContent="space-between"
                      alignItems="center"
                      mb={1}
                      sx={{ top: -8, position: "absolute" }}
                      flexWrap="wrap"
                    >
                      {work.order_status == hireStatus.AVAILABLE ? (
                        <Typography
                          variant="body2"
                          sx={{
                            px: 1.2,
                            py: 0.2,
                            borderRadius: "12px",
                            bgcolor: work.status_color,
                            color: "#fff",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            textTransform: "capitalize",
                          }}
                        >
                          {work.stock_status}
                        </Typography>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            px: 1.2,
                            py: 0.2,
                            borderRadius: "12px",
                            bgcolor: "#FF7F00",
                            color: "#fff",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            textTransform: "capitalize",
                          }}
                        >
                          Order: #{work.order_id}
                        </Typography>
                      )}
                    </Box>
                    <Typography fontWeight={500} textAlign={"end"}>
                      {work.user_name}
                    </Typography>
                    {work.order_status !== hireStatus.AVAILABLE && (
                      <Box
                        display={"block "}
                        alignItems={"center"}
                        justifyContent={"space-between"}
                        sx={{ p: 1 }}
                      >
                        <Typography color="textSecondary">
                          Hire: {work.from_date_formate} -{" "}
                          {work.from_date_formate}
                        </Typography>
                        <Typography color="textSecondary">
                          Order Date: {work.date}
                        </Typography>
                      </Box>
                    )}
                    <Box display="block" gap={1} alignItems="center">
                      <Box display="flex" gap={1} alignItems="center">
                        <Image
                          src={work.image_url || "/images/products/product.svg"}
                          alt="product"
                          width={60}
                          height={60}
                        />

                        <Box flex={1}>
                          <Typography fontWeight={600}>
                            {work.short_name}
                          </Typography>

                          <Box
                            display={"flex"}
                            alignItems={"center"}
                            justifyContent={"space-between"}
                          >
                            <Typography variant="caption" color="textSecondary">
                              {work.uuid}
                            </Typography>

                            <Box display="flex" gap={1} justifyContent={"end"}>
                              {work.order_status === hireStatus.HIRED && (
                                <Button
                                  disabled={loadingId === work.id}
                                  onClick={() =>
                                    handleStatusChange({
                                      orderId: work.order_id_int,
                                      productIds: [work.product_id],
                                      status: hireStatus.IN_SERVICE,
                                      needService: true,
                                    })
                                  }
                                  sx={{
                                    px: 1.6,
                                    py: 0.7,
                                    borderRadius: "18px",
                                    border: 2,
                                    bgcolor: "#FF7F00",
                                    color: "#fff",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    textTransform: "capitalize",
                                    "&:hover": {
                                      bgcolor: "#FF7F00",
                                      color: "#fff",
                                    },
                                  }}
                                >
                                  Return
                                </Button>
                              )}
                            </Box>
                          </Box>
                          <Typography variant="body2" fontWeight={500}>
                            {work.supplier_name}
                          </Typography>
                          {work.approve_by_user_name &&
                            work.order_status == hireStatus.HIRED && (
                              <Typography variant="body2">
                                Approved by: {work.approve_by_user_name}
                              </Typography>
                            )}
                          {work.approve_by_user_name &&
                            work.order_status == hireStatus.IN_SERVICE && (
                              <Typography variant="body2">
                                Qty: {work.available_qty}
                              </Typography>
                            )}
                          {work.order_status === hireStatus.IN_SERVICE && (
                            <Box
                              display="flex"
                              gap={1}
                              justifyContent={"flex-end"}
                            >
                              <Button
                                onClick={() =>
                                  handleStatusChange({
                                    orderId: work.order_id_int,
                                    productIds: [work.product_id],
                                    status: hireStatus.AVAILABLE,
                                    needService: false,
                                  })
                                }
                                sx={{
                                  px: 1.6,
                                  py: 0.7,
                                  borderRadius: "18px",
                                  border: 2,
                                  bgcolor: "#32A852",
                                  color: "#fff",
                                  fontSize: "0.75rem",
                                  fontWeight: 500,
                                  textTransform: "capitalize",
                                  "&:hover": {
                                    bgcolor: "#32A852",
                                    color: "#fff",
                                  },
                                }}
                              >
                                Available To
                              </Button>

                              <Button
                                onClick={() =>
                                  handleStatusChange({
                                    orderId: work.order_id_int,
                                    productIds: [work.product_id],
                                    status: hireStatus.DAMAGED,
                                    needService: false,
                                  })
                                }
                                sx={{
                                  px: 1.6,
                                  py: 0.7,
                                  borderRadius: "18px",
                                  border: 2,
                                  bgcolor: "#FF0000",
                                  color: "#fff",
                                  fontSize: "0.75rem",
                                  fontWeight: 500,
                                  textTransform: "capitalize",
                                  "&:hover": {
                                    bgcolor: "#FF0000",
                                    color: "#fff",
                                  },
                                }}
                              >
                                Damaged
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography textAlign="center" mt={4}>
              No data found.
            </Typography>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default HireHistory;
