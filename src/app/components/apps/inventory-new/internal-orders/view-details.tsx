"use client";
import React from "react";
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { IconArrowLeft, IconEdit, IconX } from "@tabler/icons-react";
import { money } from "../shared/useInventoryOptions";
import {
  dateText,
  IO_STATUS,
  packsText,
  StatusText,
} from "../shared/orderUtils";

interface InternalOrderDetailsProps {
  open: boolean;
  order: any | null;
  onClose: () => void;
  onEdit: (order: any) => void;
  onIssue: (order: any) => void;
  onCancel: (order: any) => void;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <Box display="flex" alignItems="center">
    <Typography variant="body2" color="textSecondary" width={140}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={500}>
      {value}
    </Typography>
  </Box>
);

const headCell = { fontWeight: 600, py: 1, whiteSpace: "nowrap" } as const;
const actionSx = {
  borderRadius: 2,
  textTransform: "none",
  fontWeight: 600,
} as const;

const InternalOrderDetails: React.FC<InternalOrderDetailsProps> = ({
  open,
  order,
  onClose,
  onEdit,
  onIssue,
  onCancel,
}) => {
  const status = order
    ? (IO_STATUS[order.status] ?? IO_STATUS[0])
    : IO_STATUS[0];
  const issued = order?.status === 1;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 600, md: 680 },
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
            <Typography variant="h6" fontWeight={700}>
              {order?.order_number ?? "Internal Order"}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {order?.status === 0 && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<IconEdit size={16} />}
                  onClick={() => onEdit(order)}
                  sx={actionSx}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => onIssue(order)}
                  sx={actionSx}
                >
                  Issue
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => onCancel(order)}
                  sx={actionSx}
                >
                  Cancel
                </Button>
              </>
            )}
            <IconButton onClick={onClose}>
              <IconX />
            </IconButton>
          </Box>
        </Box>

        {order && (
          <Box flex={1} overflow="auto" sx={{ pr: 1, mt: 1 }}>
            <Box mb={2}>
              <StatusText label={status.label} tone={status.tone} />
            </Box>
            <Stack spacing={1.5} mb={3}>
              <DetailRow label="Store" value={order.store_name ?? "-"} />
              <DetailRow
                label="Order type"
                value={order.order_type === "shop" ? "Shop" : "Store"}
              />
              <DetailRow label="Project" value={order.project_name ?? "-"} />
              <DetailRow label="For" value={order.requested_for_name ?? "-"} />
              <DetailRow
                label="Created by"
                value={order.created_by_name ?? "-"}
              />
              <DetailRow label="Issued on" value={dateText(order.issued_at)} />
              {order.note && <DetailRow label="Note" value={order.note} />}
              {issued && <DetailRow label="Value" value={money(order.total)} />}
            </Stack>

            <Divider />
            <Typography variant="subtitle2" fontWeight={700} mt={2} mb={1}>
              Items ({order.lines?.length ?? 0})
            </Typography>
            <TableContainer
              sx={{ border: "1px solid #eef2f7", borderRadius: 1 }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headCell}>Item</TableCell>
                    <TableCell sx={headCell}>Qty</TableCell>
                    <TableCell sx={headCell}>Rate</TableCell>
                    <TableCell sx={headCell} align="right">
                      Value
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(order.lines ?? []).map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {l.internal_item_uuid} · {l.internal_item_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" whiteSpace="nowrap">
                          {packsText(
                            l.base_qty,
                            l.is_sub_qty ? l.issue_pack_qty : null,
                            l.unit_name,
                            l.issue_pack_unit_name,
                          )}
                        </Typography>
                        {l.is_sub_qty && l.issue_pack_qty > 1 && (
                          <Typography variant="caption" color="textSecondary">
                            = {l.base_qty} {l.unit_name ?? "unit"}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {l.rate === null
                            ? "On issue"
                            : `£${l.rate.toFixed(4)}`}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {l.value === null ? "-" : money(l.value)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {!issued && (
              <Typography
                variant="caption"
                color="textSecondary"
                display="block"
                mt={1}
              >
                Rate and value are fixed at the base price when the order is
                issued.
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default InternalOrderDetails;
