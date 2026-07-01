"use client";
import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Grid,
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

interface BookkeeperProps {
  open: boolean;
  onClose: () => void;
}

const BookkeeperHistory: React.FC<BookkeeperProps> = ({ open, onClose }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const limit = 20;
  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: number | null;
  };

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user?.company_id) {
      setHistory([]);
      setPage(1);
      setTotalItems(0);

      fetchHistories(1);
    } else {
      setHistory([]);
      setPage(1);
      setTotalItems(0);
    }
  }, [open, user?.company_id]);

  const fetchHistories = async (currentPage: number) => {
    setLoading(true);

    try {
      const res = await api.get(
        `time-clock/bookkeeper-history?company_id=${user.company_id}&page=${currentPage}&limit=${limit}`,
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
    } finally {
      setLoading(false);
    }
  };

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
        onClose={onClose}
        PaperProps={{
          sx: {
            width: 500,
            maxWidth: "100%",
            "& .MuiDrawer-paper": {
              width: 500,
              padding: 2,
              backgroundColor: "#f9f9f9",
            },
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            p: 2,
          }}
        >
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 0,
              top: 8,
            }}
          >
            <IconX size={18} />
          </IconButton>

          <Grid container spacing={2} display="block">
            <Box display="flex" alignItems="center">
              <IconButton onClick={onClose}>
                <IconArrowLeft />
              </IconButton>

              <Typography variant="h6" fontWeight={700}>
                Bookkeeper Activities
              </Typography>
            </Box>

            {loading && history.length === 0 ? (
              <Box display="flex" justifyContent="center" mt={4}>
                <CircularProgress />
              </Box>
            ) : history.length > 0 ? (
              <Box mt={1}>
                {history.map((addr, index) => {
                  let color = "";

                  switch (addr.request_type) {
                    case 126:
                      color = "#0066ff";
                      break;

                    case 111:
                      color = "#A600FF";
                      break;

                    case 102:
                      color = "#FF7F00";
                      break;

                    case 121:
                      color = "#32A852";
                      break;

                    case 110:
                      color = "#949090";
                      break;

                    default:
                      color = "#ff3737";
                  }

                  return (
                    <Box
                      key={addr.id ?? index}
                      mt={2}
                      p={2}
                      position="relative"
                      display="flex"
                      alignItems="center"
                      sx={{
                        width: "100%",
                        height: "100px",
                        borderRadius: "25px",
                        boxShadow: "rgb(33 33 33 / 12%) 0px 4px 4px 0px",
                        border: "1px solid rgb(240 240 240)",
                        background: "#fff",
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
                        <Typography color="#fff" fontSize={12} fontWeight={700}>
                          {addr.type_name}
                        </Typography>
                      </Box>

                      <Box width="100%" textAlign="start">
                        <Typography fontSize="14px" className="multi-ellipsis">
                          <b>{addr.user_name}:</b>{" "}
                          <Tooltip title={addr.message} arrow>
                            <span>{addr.message}</span>
                          </Tooltip>
                        </Typography>

                        <Typography
                          fontSize="12px"
                          textAlign="end"
                          color="gray"
                        >
                          {addr.date}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}

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
              <Typography mt={3} ml={2} variant="h5">
                No activities are found for bookkeeper!!
              </Typography>
            )}
          </Grid>
        </Box>
      </Drawer>
    </Box>
  );
};

export default BookkeeperHistory;
