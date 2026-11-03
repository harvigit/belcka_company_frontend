"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Drawer,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { IconArrowLeft, IconX } from "@tabler/icons-react";
import api from "@/utils/axios";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import { dateText, MOVEMENT_TEXT } from "../shared/orderUtils";
import { money, qty } from "../shared/useInventoryOptions";

interface MovementsDrawerProps {
  open: boolean;
  row: any | null;
  companyId?: number | null;
  onClose: () => void;
}

const headCell = { fontWeight: 600, py: 1, whiteSpace: "nowrap" } as const;

// Stock ledger of one item in one store, newest first.
const MovementsDrawer: React.FC<MovementsDrawerProps> = ({
  open,
  row,
  companyId,
  onClose,
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !row || !companyId) return;
    setLoading(true);
    api
      .get(
        `inventory-new/stock/movements?company_id=${companyId}&store_id=${row.store_id}&internal_item_id=${row.internal_item_id}&page=1&limit=200`,
      )
      .then((res) => setRows(res.data?.info ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [open, row, companyId]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 680, md: 820 },
          borderRadius: 0,
          boxShadow: "none",
        },
      }}
    >
      <Box p={3} pt={2} height="100%" display="flex" flexDirection="column">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <IconButton onClick={onClose}>
              <IconArrowLeft />
            </IconButton>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Stock Movements
              </Typography>
              {row && (
                <Typography variant="body2" color="textSecondary">
                  {row.code} · {row.name} at {row.store_name}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <IconX />
          </IconButton>
        </Box>

        <Box flex={1} overflow="auto" mt={2}>
          {loading ? (
            <SkeletonLoader columns={[{ name: "" }]} rowCount={5} />
          ) : !rows.length ? (
            <Typography variant="body2" color="textSecondary">
              No movements yet.
            </Typography>
          ) : (
            <TableContainer
              sx={{ border: "1px solid #eef2f7", borderRadius: 1 }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={headCell}>Date</TableCell>
                    <TableCell sx={headCell}>Type</TableCell>
                    <TableCell sx={headCell}>Qty</TableCell>
                    <TableCell sx={headCell}>Rate</TableCell>
                    <TableCell sx={headCell}>Value</TableCell>
                    <TableCell sx={headCell}>Base after</TableCell>
                    <TableCell sx={headCell}>Balance</TableCell>
                    <TableCell sx={headCell}>By / note</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Typography variant="body2" whiteSpace="nowrap">
                          {dateText(m.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" whiteSpace="nowrap">
                          {MOVEMENT_TEXT[m.type] ?? m.type}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={
                            m.qty > 0
                              ? "success.main"
                              : m.qty < 0
                                ? "error.main"
                                : "textSecondary"
                          }
                        >
                          {m.qty > 0 ? "+" : ""}
                          {qty(m.qty)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {m.rate === null ? "-" : `£${m.rate.toFixed(4)}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {m.value ? money(m.value) : "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {m.base_price_after === null
                            ? "-"
                            : `£${m.base_price_after.toFixed(4)}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {qty(m.store_balance_after)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {m.action_by_name ?? "-"}
                        </Typography>
                        {m.note && (
                          <Typography variant="caption" color="textSecondary">
                            {m.note}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default MovementsDrawer;
