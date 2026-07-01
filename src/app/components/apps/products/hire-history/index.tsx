"use client";
import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Button,
  IconButton,
  Drawer,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { IconX, IconArrowLeft } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";

interface ProductProps {
  open: boolean;
  onClose: () => void;
}

const HireOrderHistory: React.FC<ProductProps> = ({ open, onClose }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const limit = 20;
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHistories = async (currentPage: number) => {
    setLoading(true);
    try {
      const res = await api.get(
        `requests/get-history?company_id=${user.company_id}&type=131&page=${currentPage}&limit=${limit}`,
      );
      if (res.data?.IsSuccess) {
        const newData = res.data.info || [];

        setHistory((prev) =>
          currentPage === 1 ? newData : [...prev, ...newData],
        );

        setTotalItems(res.data.data?.totalItems || 0);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open == true) {
      fetchHistories(page);
    } else {
      setLoading(true);
      setHistory([]);
      setPage(1);
    }
  }, [open]);
  const handleSeeMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistories(nextPage);
  };

  const hasMore = history.length < totalItems;
  return (
    <Box>
      <Drawer
        anchor="right"
        open={open}
        onClose={() => onClose()}
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
        <Box
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* Close Button */}
          <IconButton
            aria-label="close"
            onClick={() => onClose()}
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

          <Box
            display="flex"
            flexDirection="column"
            flex={1}
            overflow="hidden"
            className="address-form"
          >
            <Box
              display={"flex"}
              alignContent={"center"}
              alignItems={"center"}
              flexWrap={"wrap"}
              pb={1}
            >
              <IconButton onClick={() => onClose()}>
                <IconArrowLeft />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                Hire History
              </Typography>
            </Box>

            {loading && history.length === 0 ? (
              <Box display="flex" justifyContent="center" mt={4}>
                <CircularProgress />
              </Box>
            ) : history.length > 0 ? (
              <Box sx={{ flex: 1, overflowY: "auto" }}>
                <Box
                  sx={{
                    maxHeight: history.length > 3 ? "auto" : "auto",
                    overflow: history.length > 3 ? "auto" : "visible",
                    pr: 0,
                  }}
                >
                  {history.map((addr, index) => {
                    let color = "";

                    switch (addr.request_type) {
                      case 131:
                        color = "#0066ffff";
                        break;
                      default:
                        color = "#949090ff";
                    }

                    return (
                      <Box
                        key={addr.id ?? index}
                        mb={index === history.length - 1 ? 0 : 2}
                        pl={2}
                        pr={2}
                        mt={2}
                        position="relative"
                        display="flex"
                        alignItems="center"
                        sx={{
                          width: "100%",
                          lineHeight: "10px",
                          height: "100px",
                          borderRadius: "25px",
                          boxShadow: "rgb(33 33 33 / 12%) 0px 4px 4px 0px",
                          border: "1px solid rgb(240 240 240)",
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
                          >
                            {addr.type_name}
                          </Typography>
                        </Box>
                        <Box display="initial" width="100%" textAlign="start">
                          <Typography
                            fontSize="14px"
                            className="multi-ellipsis"
                          >
                            <b>{addr.user_name}:</b>{" "}
                            <Tooltip placement="top" title={addr.message} arrow>
                              {addr.message}
                            </Tooltip>
                          </Typography>
                          <p
                            style={{
                              fontSize: "12px",
                              textAlign: "end",
                              color: "GrayText",
                              margin: "3px",
                            }}
                            color="textSecondary"
                          >
                            {addr.date}
                          </p>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                {hasMore && (
                  <Box display="flex" justifyContent="center" my={2}>
                    <Button
                      variant="outlined"
                      disabled={loading}
                      onClick={handleSeeMore}
                      startIcon={loading && <CircularProgress size={16} />}
                    >
                      See More
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <>
                <Typography mt={2} ml={2} variant="h5">
                  No activities are found for hire history!!
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default HireOrderHistory;
