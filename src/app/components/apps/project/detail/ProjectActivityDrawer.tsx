"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Typography,
} from "@mui/material";
import { IconArrowLeft, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import api from "@/utils/axios";

type ProjectActivityItem = {
  id: number;
  user_name?: string | null;
  message?: string | null;
  date_added?: string | null;
  request_type?: number | null;
  status_int?: number | null;
  type_name?: string | null;
};

const formatActivityDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = dayjs(
    value,
    ["DD/MM/YYYY HH:mm:ss", "DD/MM/YYYY", "DD-MM-YYYY HH:mm", "YYYY-MM-DD"],
    true,
  );
  if (parsed.isValid()) return parsed.format("DD/MM/YYYY");
  const fallback = dayjs(value);
  return fallback.isValid() ? fallback.format("DD/MM/YYYY") : String(value);
};

const activityLabel = (item: ProjectActivityItem) => {
  if (item.request_type === 102 && item.status_int == 3) return "Start shift";
  if (item.request_type === 102 && item.status_int == 4) return "Stop shift";
  return item.type_name || "Activity";
};

const activityColor = (item: ProjectActivityItem) => {
  if (item.request_type === 102 && item.status_int == 3) return "#7d54f0ff";
  if (item.request_type === 102 && item.status_int == 4) return "#f53c3cff";
  return "#FF7F00";
};

const ProjectActivityDrawer = ({
  open,
  onClose,
  projectId,
  projectName,
  companyId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: number;
  projectName?: string | null;
  companyId?: number | null;
}) => {
  const [history, setHistory] = useState<ProjectActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  const fetchHistories = async (currentPage: number, append = false) => {
    if (!companyId || !projectId) return;
    try {
      setLoading(true);
      const res = await api.get(
        `project/get-history?page=${currentPage}&limit=${limit}&company_id=${companyId}&project_id=${projectId}`,
      );
      const newData = res.data?.info || [];
      setHistory((prev) => (append ? [...prev, ...newData] : newData));
      setTotalItems(res.data?.data?.totalItems || 0);
    } catch (err) {
      console.error("Failed to fetch project activity", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setPage(1);
    setHistory([]);
    fetchHistories(1, false);
  }, [open, projectId, companyId]);

  const handleSeeMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistories(nextPage, true);
  };

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
      <Box sx={{ position: "relative", p: 2 }}>
        <IconButton
          aria-label="close"
          onClick={onClose}
          size="small"
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[900],
            zIndex: 10,
          }}
        >
          <IconX size={18} />
        </IconButton>

        <Box display="flex" alignItems="center">
          <IconButton onClick={onClose}>
            <IconArrowLeft size={20} />
          </IconButton>
          <Typography variant="h6" fontWeight={700} noWrap>
            {projectName ? `${projectName} Activity` : "Project Activity"}
          </Typography>
        </Box>

        {loading && history.length === 0 ? (
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress />
          </Box>
        ) : history.length > 0 ? (
          <Box mt={1}>
            {history.map((item, index) => (
              <Box
                key={item.id ?? index}
                mb={2}
                pl={2}
                pr={2}
                mt={2}
                position="relative"
                display="flex"
                alignItems="center"
                sx={{
                  width: "100%",
                  minHeight: 100,
                  borderRadius: "25px",
                  boxShadow: "rgb(33 33 33 / 12%) 0px 4px 4px 0px",
                  border: "1px solid rgb(240 240 240)",
                }}
              >
                <Box
                  position="absolute"
                  top="-10px"
                  left="15px"
                  bgcolor={activityColor(item)}
                  px={1.5}
                  borderRadius="10px"
                  zIndex={1}
                >
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    fontSize="12px !important"
                    color="#fff"
                  >
                    {activityLabel(item)}
                  </Typography>
                </Box>
                <Box display="initial" width="100%" textAlign="start">
                  <Typography fontSize="14px" className="multi-ellipsis">
                    <b>{item.user_name}:</b> {item.message}
                  </Typography>
                  <p
                    style={{
                      fontSize: "12px",
                      textAlign: "end",
                      color: "GrayText",
                      margin: 0,
                    }}
                  >
                    {formatActivityDate(item.date_added)}
                  </p>
                </Box>
              </Box>
            ))}
            {history.length < totalItems && (
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
          <Typography mt={2} ml={1} variant="h6">
            No activities are found for this project!!
          </Typography>
        )}
      </Box>
    </Drawer>
  );
};

export default ProjectActivityDrawer;
