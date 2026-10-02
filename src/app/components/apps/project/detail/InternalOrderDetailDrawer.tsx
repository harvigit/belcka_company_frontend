"use client";

import React from "react";
import {
  Avatar,
  Box,
  Chip,
  Drawer,
  Grid,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { IconArrowLeft, IconX } from "@tabler/icons-react";

type OrderItem = {
  product_name?: string | null;
  product_image?: string | null;
  uuid?: string | null;
  qty?: string | null;
  remaining_qty?: string | null;
  amount?: string | null;
  adjusted_stock?: string | null;
  stock_in_hand?: string | null;
};

export type InternalOrderDetail = {
  order_id?: string | null;
  type?: string | null;
  date?: string | null;
  project_name?: string | null;
  address_name?: string | null;
  company_name?: string | null;
  total_formatted?: string | null;
  currency?: string | null;
  total?: number | string | null;
  user_name?: string | null;
  user_image?: string | null;
  ordered_by_name?: string | null;
  ordered_by_image?: string | null;
  type_key?: string | null;
  file?: string | null;
  status_text?: string | null;
  status_color?: string | null;
  items?: OrderItem[];
};

const Meta = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography
      fontSize={11}
      color="text.secondary"
      fontWeight={700}
      textTransform="uppercase"
    >
      {label}
    </Typography>
    <Typography fontSize={14} fontWeight={600} sx={{ wordBreak: "break-word" }}>
      {value || "-"}
    </Typography>
  </Box>
);

const Person = ({
  name,
  image,
}: {
  name?: string | null;
  image?: string | null;
}) => (
  <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
    <Avatar src={image || undefined} sx={{ width: 28, height: 28 }}>
      {(name || "?").charAt(0)}
    </Avatar>
    <Typography fontSize={14} fontWeight={600} noWrap>
      {name || "-"}
    </Typography>
  </Stack>
);

export default function InternalOrderDetailDrawer({
  open,
  order,
  onClose,
}: {
  open: boolean;
  order: InternalOrderDetail | null;
  onClose: () => void;
}) {
  const amount =
    order?.total_formatted ||
    (order?.total == null
      ? "-"
      : `${order.currency || ""}${Number(order.total).toFixed(2)}`);

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          height: { xs: "95vh" },
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          px={{ xs: 2, sm: 3 }}
          py={1.5}
          borderBottom="1px solid #e5e7eb"
        >
          <Box>
            <Box display={"flex"} alignItems={"center"}>
              <IconButton onClick={onClose} aria-label="Close order">
                <IconArrowLeft size={20} />
              </IconButton>
              <Typography fontWeight={800} fontSize={{ xs: 16, sm: 18 }} noWrap>
                {order?.order_id || "Order"}
              </Typography>
              <Chip
                size="medium"
                sx={{
                  ml: 1,
                  bgcolor: order?.status_color
                    ? `${order?.status_color}20`
                    : "#F5F5F5",
                  color: order?.status_color || "#0e1df3ff",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                }}
                label={order?.status_text}
              />
            </Box>
            <Typography fontSize={12} color="text.secondary" ml={5}>
              {order?.type || "Internal order"}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close order">
            <IconX size={20} />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, overflow: "auto", px: { xs: 2, sm: 3 }, py: 2 }}>
          {!order ? null : (
            <>
              <Grid container spacing={2} mb={2}>
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                  <Meta label="Project" value={order.project_name} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                  <Meta label="Address" value={order.address_name} />
                </Grid>
                {/* <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                  <Meta label="Company" value={order.company_name} />
                </Grid> */}
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                  <Meta label="Order date" value={order.date} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                  <Meta label="Order type" value={order.type} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                  <Meta label="Amount" value={amount} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography
                    fontSize={11}
                    color="text.secondary"
                    fontWeight={700}
                    textTransform="uppercase"
                  >
                    User
                  </Typography>
                  <Person name={order.user_name} image={order.user_image} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography
                    fontSize={11}
                    color="text.secondary"
                    fontWeight={700}
                    textTransform="uppercase"
                  >
                    Order by
                  </Typography>
                  <Person
                    name={order.ordered_by_name}
                    image={order.ordered_by_image}
                  />
                </Grid>
              </Grid>

              {String(order.type_key || order.type || "").toLowerCase() ===
                "collect" &&
                order.file && (
                  <Box mt={2} mb={2}>
                    <Typography
                      fontSize={11}
                      color="text.secondary"
                      fontWeight={700}
                      textTransform="uppercase"
                      mb={1}
                    >
                      Attachment
                    </Typography>
                    <Box
                      component="a"
                      href={order.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: "inline-block" }}
                    >
                      <Box
                        component="img"
                        src={order.file}
                        alt="Collect attachment"
                        sx={{
                          width: { xs: "100%", sm: 220 },
                          maxHeight: 180,
                          objectFit: "cover",
                          borderRadius: 2,
                          border: "1px solid #e5e7eb",
                        }}
                      />
                    </Box>
                  </Box>
                )}

              <Grid container spacing={1.5}>
                {(order.items || []).map((item, index) => (
                  <Grid
                    key={`${item.uuid || item.product_name}-${index}`}
                    size={{ xs: 12, sm: 6 }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        border: "1px solid #e5e7eb",
                        borderRadius: 2,
                        p: { xs: 1.5, sm: 2 },
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        mb={1}
                      >
                        <Avatar
                          variant="rounded"
                          src={item.product_image || undefined}
                          sx={{ width: 52, height: 52, bgcolor: "#f3f4f6" }}
                        />
                        <Box minWidth={0}>
                          <Typography
                            fontWeight={700}
                            sx={{ wordBreak: "break-word" }}
                          >
                            {item.product_name || "-"}
                          </Typography>
                          <Typography fontSize={12} color="text.secondary">
                            {item.uuid && <>UUID: {item.uuid || "-"}</>}
                          </Typography>
                        </Box>
                      </Stack>
                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 3 }}>
                          <Meta label="Qty" value={item.qty} />
                        </Grid>
                        <Grid size={{ xs: 3 }}>
                          <Meta label="Amount" value={item.amount} />
                        </Grid>
                        <Grid size={{ xs: 3 }}>
                          <Meta
                            label="Adjusted stock"
                            value={item.adjusted_stock}
                          />
                        </Grid>
                        {item.stock_in_hand && (
                          <Grid size={{ xs: 3 }}>
                            <Meta
                              label="Stock in hand"
                              value={item.stock_in_hand || "-"}
                            />
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  </Grid>
                ))}
                {(order.items || []).length === 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Typography color="text.secondary">
                      No product history for this order.
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
