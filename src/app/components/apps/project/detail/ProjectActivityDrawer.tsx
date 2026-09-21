"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import api from "@/utils/axios";
import {
  EmptyState,
  OverviewFullListView,
  overviewTableSx,
} from "./OverviewRecordsDrawer";

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
    [
      "DD/MM/YYYY HH:mm:ss",
      "DD/MM/YYYY HH:mm",
      "DD/MM/YYYY",
      "DD-MM-YYYY HH:mm",
      "YYYY-MM-DD HH:mm:ss",
      "YYYY-MM-DD",
    ],
    true,
  );
  const source = parsed.isValid() ? parsed : dayjs(value);
  if (!source.isValid()) return String(value);
  return source.hour() || source.minute()
    ? source.format("DD/MM/YYYY HH:mm")
    : source.format("DD/MM/YYYY");
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  const fetchHistories = async (currentPage: number, currentLimit: number) => {
    if (!companyId || !projectId) return;
    try {
      setLoading(true);
      const res = await api.get(
        `project/get-history?page=${currentPage}&limit=${currentLimit}&company_id=${companyId}&project_id=${projectId}`,
      );
      setHistory(res.data?.info || []);
      setTotalItems(Number(res.data?.data?.totalItems || 0));
    } catch (err) {
      console.error("Failed to fetch project activity", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setPage(0);
      setRowsPerPage(50);
    }
  }, [open, projectId, companyId]);

  useEffect(() => {
    if (!open) return;
    fetchHistories(page + 1, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page, rowsPerPage, projectId, companyId]);

  return (
    <OverviewFullListView
      open={open}
      title={projectName ? `${projectName} Activity` : "Project Activity"}
      onClose={onClose}
    >
      {loading && history.length === 0 ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={28} />
        </Box>
      ) : history.length > 0 || totalItems > 0 ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <TableContainer
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
            }}
          >
            <Table
              stickyHeader
              size="small"
              aria-label="sticky table"
              sx={{
                ...overviewTableSx,
                minWidth: 640,
                "& td:first-of-type": {
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Message</TableCell>
                  <TableCell sx={{ width: 160 }}>Type</TableCell>
                  <TableCell sx={{ width: 170 }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((item, index) => (
                  <TableRow key={item.id ?? index}>
                    <TableCell
                      sx={{
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.user_name
                        ? `${item.user_name}: ${item.message || "-"}`
                        : item.message || "-"}
                    </TableCell>
                    <TableCell>
                      {" "}
                      <Box
                        width={"60%"}
                        top="-10px"
                        left="15px"
                        bgcolor={activityColor(item)}
                        px={1.5}
                        borderRadius="10px"
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
                    </TableCell>
                    <TableCell>{formatActivityDate(item.date_added)}</TableCell>
                  </TableRow>
                ))}
                {!loading && history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>No activities found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalItems}
            page={page}
            onPageChange={(_, next) => setPage(next)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[50, 100, 250, 500]}
            sx={{
              flexShrink: 0,
              borderTop: "1px solid",
              borderColor: "divider",
              overflow: "visible",
              bgcolor: "background.paper",
              ".MuiTablePagination-toolbar": {
                flexWrap: "wrap",
                minHeight: 52,
              },
            }}
          />
        </Box>
      ) : (
        <EmptyState message="No activities are found for this project!!" />
      )}
    </OverviewFullListView>
  );
};

export default ProjectActivityDrawer;
