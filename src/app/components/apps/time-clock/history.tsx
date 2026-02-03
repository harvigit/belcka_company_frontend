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
import PermissionGuard from "@/app/auth/PermissionGuard";

interface BookkeeperProps {
  open: boolean;
  onClose: () => void;
}

const BookkeeperHistory: React.FC<BookkeeperProps> = ({ open, onClose }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const limit = 20;
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [loading, setLoading] = useState<boolean>(false);

  const fetchHistories = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `time-clock/bookkeeper-history?company_id=${user.company_id}`,
      );
      if (res.data?.info) {
        setHistory(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
    setLoading(false);
  };
  const paginatedFeeds = history?.slice(0, page * limit) || [];

  useEffect(() => {
    if (open == true) {
      fetchHistories();
    }
  }, [open]);

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
            },
          },
        }}
      >
        <Box sx={{ position: "relative", p: 2 }}>
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
          <Grid container spacing={2} display="block">
            <Box
              display={"flex"}
              alignContent={"center"}
              alignItems={"center"}
              flexWrap={"wrap"}
            >
              <IconButton onClick={() => onClose()}>
                <IconArrowLeft />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                Bookkeeper Activities
              </Typography>
            </Box>

            {history.length > 0 ? (
              <Box mt={3}>
                <Box
                  sx={{
                    maxHeight: history.length > 3 ? "auto" : "auto",
                    overflow: history.length > 3 ? "auto" : "visible",
                    pr: 0,
                  }}
                >
                  {paginatedFeeds.map((addr, index) => {
                    let color = "";

                    switch (addr.request_type) {
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
                        color = "#949090ff";
                        break;
                      default:
                        color = "#ff3737ff";
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
                        <Box
                          display="initial"
                          width="100%"
                          textAlign="start"
                          mt={1}
                        >
                          <Typography
                            fontSize="14px"
                            className="multi-ellipsis"
                          >
                            <b>{addr.user_name}:</b>{" "}
                            <Tooltip placement="top" title={addr.message} arrow>{addr.message}</Tooltip>
                          </Typography>
                          <p
                            style={{
                              fontSize: "12px",
                              textAlign: "end",
                              color: "GrayText",
                              margin: 0,
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
                  No activities are found for bookkeeper!!
                </Typography>
              </>
            )}
          </Grid>
        </Box>
      </Drawer>
    </Box>
  );
};

export default BookkeeperHistory;
