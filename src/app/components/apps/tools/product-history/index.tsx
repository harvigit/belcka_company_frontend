"use client";
import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  CircularProgress,
  Tooltip,
  Grid,
  Button,
} from "@mui/material";
import { IconX, IconArrowLeft } from "@tabler/icons-react";
import api from "@/utils/axios";
import dayjs from "dayjs";

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
  const [page, setPage] = useState<number>(1);
  const limit = 50;

  useEffect(() => {
    if (open && productId) {
      fetchHistory();
    } else {
      setHistory([]);
      setPage(1);
    }
  }, [open, productId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `product-tools/history?product_id=${productId}`,
      );
      if (res.data?.IsSuccess) {
        setHistory(res.data.info || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const paginatedFeeds = history.slice(0, page * limit);

  return (
    <Box>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: 500,
            maxWidth: "100%",
            "& .MuiDrawer-paper": {
              width: 500,
              padding: 2,
              backgroundColor: "#f9f9f9",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Close Button */}
          <IconButton
            aria-label="close"
            onClick={onClose}
            size="small"
            sx={{
              position: "absolute",
              right: 0,
              top: 8,
              color: (theme) => theme.palette.grey[900],
              backgroundColor: "transparent",
              zIndex: 10,
              width: 50,
              height: 50,
            }}
          >
            <IconX size={18} />
          </IconButton>

          {/* Activity History List */}
          <Grid container spacing={2} display="block">
            <Box
              display={"flex"}
              alignContent={"center"}
              alignItems={"center"}
              flexWrap={"wrap"}
            >
              <IconButton onClick={onClose}>
                <IconArrowLeft />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                Tools Activities
              </Typography>
            </Box>

            {loading && history.length === 0 ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            ) : paginatedFeeds.length > 0 ? (
              <Box sx={{ flex: 1, overflowY: "auto" }}>
                <Box
                  sx={{
                    maxHeight: paginatedFeeds.length > 3 ? "auto" : "auto",
                    overflow: paginatedFeeds.length > 3 ? "auto" : "visible",
                    pr: 0,
                  }}
                >
                  {paginatedFeeds.map((addr, index) => {
                    let color = "#0066ffff";

                    if (
                      addr.module === "product_trades" ||
                      addr.request_type === 129
                    ) {
                      color = "#FF7F00";
                    }

                    const userName = addr.user_name || "System";
                    const formattedDate = addr.date || "-";
                    const typeName = addr.type_name || "Activity";

                    return (
                      <Box
                        key={addr.id ?? index}
                        mb={index === paginatedFeeds.length - 1 ? 0 : 2}
                        pl={2}
                        pr={2}
                        mt={2}
                        position="relative"
                        display="flex"
                        alignItems="center"
                        sx={{
                          width: "100%",
                          lineHeight: "20px",
                          minHeight: "100px",
                          py: 2,
                          borderRadius: "25px",
                          boxShadow: "rgb(33 33 33 / 12%) 0px 4px 4px 0px",
                          border: "1px solid rgb(240 240 240)",
                          bgcolor: "#fff",
                        }}
                      >
                        <Box
                          position="absolute"
                          top="-10px"
                          left="15px"
                          bgcolor={color}
                          px={1.5}
                          borderRadius="10px"
                          zIndex={1}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            fontSize={"12px !important"}
                            color="#fff"
                            textTransform="capitalize"
                          >
                            {typeName}
                          </Typography>
                        </Box>
                        <Box display="initial" width="100%" textAlign="start">
                          <Typography
                            fontSize="14px"
                            className="multi-ellipsis"
                          >
                            <b>{userName}:</b>{" "}
                            <Tooltip placement="top" title={addr.message} arrow>
                              <span>{addr.message}</span>
                            </Tooltip>
                          </Typography>
                          <Typography
                            style={{
                              fontSize: "12px",
                              textAlign: "end",
                              color: "GrayText",
                            }}
                          >
                            {formattedDate}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                {paginatedFeeds.length < history.length && (
                  <Box display="flex" justifyContent="center" my={2}>
                    <Button
                      variant="outlined"
                      startIcon={
                        loading ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : null
                      }
                      onClick={() => setPage((prev) => prev + 1)}
                      disabled={loading}
                    >
                      See More
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <>
                <Typography mt={2} ml={2} variant="h5">
                  No activities are found for this product!
                </Typography>
              </>
            )}
          </Grid>
        </Box>
      </Drawer>
    </Box>
  );
};

export default ProductHistory;
