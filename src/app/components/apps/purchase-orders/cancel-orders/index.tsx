"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { IconDownload, IconX } from "@tabler/icons-react";
import api from "@/utils/axios";

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: number | null;
  id: any;
}

const CancelOrder: React.FC<Props> = ({ open, onClose, companyId, id }) => {
  const [product, setProduct] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (id > 0) {
      fetchOrderDetail();
    }
  }, [id]);

  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `purchase-orders/detail?company_id=${companyId}&id=${id}&is_web=true`,
      );
      if (res.data?.IsSuccess) {
        setProduct(res.data.info || null);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const groupedCancelOrders = Object.values(
    (product?.purchase_orders || [])
      .flatMap((po: any) => po.cancel_orders || [])
      .reduce((acc: any, item: any) => {
        const date = item?.date_formate || "No Date";

        if (!acc[date]) {
          acc[date] = {
            date,
            items: [],
          };
        }

        acc[date].items.push(item);

        return acc;
      }, {}),
  );
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
      <Box
        display={"flex"}
        alignItems={"center"}
        justifyContent={"space-between"}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            Cancel Order
          </Typography>
          {product?.order_id}
        </Box>
        <IconButton onClick={onClose}>
          <IconX />
        </IconButton>
      </Box>
      <Divider sx={{ p: 1 }} />
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          paddingRight: 1,
          px: 4,
        }}
      >
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
            mt: 2
          }}
        >
          {product?.supplier_name}
        </Typography>
        {groupedCancelOrders.map((group: any, index: number) => (
          <Box
            key={index}
            mt={2}
            position="relative"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              width="100%"
            >
              <Box display={"flex"} alignItems={"center"} gap={1}>
                <Typography
                  color="textSecondary"
                  variant="body1"
                  fontWeight={600}
                  className="f-14"
                >
                  {group.date}
                </Typography>
              </Box>

              <Box display={"flex"} fontSize="10px">
                <IconButton
                  color="primary"
                  onClick={async (e) => {
                    e.stopPropagation();

                    try {
                      setLoading(true);

                      const res = await api.post(
                        `purchase-orders/invoice?company_id=${companyId}&id=${id}&type=cancel`,
                      );

                      if (res.data.IsSuccess) {
                        const invoiceUrl = res.data.invoice;

                        if (!invoiceUrl) return;

                        window.open(
                          invoiceUrl,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }
                    } catch (error) {
                      console.error("Failed to open invoice:", error);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <IconDownload />
                </IconButton>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "start",
          gap: 2,
          p: 2,
          mt: "auto",
        }}
      >
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
    </Drawer>
  );
};

export default CancelOrder;
