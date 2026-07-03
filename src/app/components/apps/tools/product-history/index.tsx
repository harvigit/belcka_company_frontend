"use client";
import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  CircularProgress,
  Tooltip,
  Button,
} from "@mui/material";
import { IconX, IconArrowLeft } from "@tabler/icons-react";
import api from "@/utils/axios";

interface ProductHistoryProps {
  open: boolean;
  onClose: () => void;
  productId: number | null;
}

const ProductHistory: React.FC<ProductHistoryProps> = ({
  open,
  onClose,
  productId,
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 50;

  useEffect(() => {
    if (open && productId) {
      setHistory([]);
      setPage(1);
      fetchHistory(1);
    } else {
      setHistory([]);
      setPage(1);
      setTotalItems(0);
    }
  }, [open, productId]);

  const fetchHistory = async (currentPage: number) => {
    setLoading(true);

    try {
      const res = await api.get(
        `product-tools/history?product_id=${productId}&page=${currentPage}&limit=${limit}`,
      );

      if (res.data?.IsSuccess) {
        const newData = res.data.info || [];
        setHistory((prev) =>
          currentPage === 1 ? newData : [...prev, ...newData],
        );
        setTotalItems(res.data.data?.totalItems || 0);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeeMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage);
  };

  const hasMore = history.length < totalItems;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 500,
          maxWidth: "100%",
        },
      }}
    >
      <Box p={2}>
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 10,
            top: 10,
          }}
        >
          <IconX />
        </IconButton>

        <Box display="flex" alignItems="center">
          <IconButton onClick={onClose}>
            <IconArrowLeft />
          </IconButton>

          <Typography variant="h6" fontWeight={700}>
            Tools Activities
          </Typography>
        </Box>

        {loading && history.length === 0 && (
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress />
          </Box>
        )}

        {/* Data */}
        {!loading && history.length > 0 && (
          <Box
            sx={{
              mt: 1,
              maxHeight: "80vh",
              overflow: "auto",
            }}
          >
            {history.map((addr, index) => {
              let color = "#0066ff";

              if (
                addr.module === "product_trades" ||
                addr.request_type === 129
              ) {
                color = "#FF7F00";
              }

              return (
                <Box
                  key={addr.id ?? index}
                  mt={2}
                  p={2}
                  sx={{
                    borderRadius: "25px",
                    boxShadow: "0px 4px 4px #0002",
                    bgcolor: "#fff",
                    position: "relative",
                  }}
                >
                  <Box
                    position="absolute"
                    top="-10px"
                    left="15px"
                    bgcolor={color}
                    px={1.5}
                    borderRadius="10px"
                  >
                    <Typography color="#fff" fontSize={12}>
                      {addr.type_name || "Activity"}
                    </Typography>
                  </Box>

                  <Typography fontSize={14} mt={1}>
                    <b>{addr.user_name || "System"}:</b>{" "}
                    <Tooltip title={addr.message}>
                      <span>{addr.message}</span>
                    </Tooltip>
                  </Typography>

                  <Typography textAlign="end" fontSize={12} color="gray">
                    {addr.date || "-"}
                  </Typography>
                </Box>
              );
            })}

            {/* See More */}
            {hasMore && (
              <Box display="flex" justifyContent="center" my={2}>
                <Button
                  variant="outlined"
                  disabled={loading}
                  onClick={handleSeeMore}
                >
                  {loading ? <CircularProgress size={18} /> : "See More"}
                </Button>
              </Box>
            )}
          </Box>
        )}

        {!loading && history.length === 0 && (
          <Typography mt={3} textAlign={"center"}>
            No activities are found for this product!
          </Typography>
        )}
      </Box>
    </Drawer>
  );
};

export default ProductHistory;
