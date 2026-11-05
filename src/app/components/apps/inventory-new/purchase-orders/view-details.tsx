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
  packsText,
  PO_STATUS,
  StatusText,
} from "../shared/orderUtils";

interface PurchaseOrderDetailsProps {
  open: boolean;
  order: any | null;
  onClose: () => void;
  onEdit: (order: any) => void;
  onPlace: (order: any) => void;
  onReceive: (order: any) => void;
  onCloseShort: (order: any) => void;
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

const PurchaseOrderDetails: React.FC<PurchaseOrderDetailsProps> = ({
  open,
  order,
  onClose,
  onEdit,
  onPlace,
  onReceive,
  onCloseShort,
  onCancel,
}) => {
  const status = order
    ? (PO_STATUS[order.status] ?? PO_STATUS[0])
    : PO_STATUS[0];
  const lines: any[] = order?.lines ?? [];
  // deliveries are stored per supplier item (one line per supplier item on a PO)
  const lineBySupplierItem = new Map(lines.map((l) => [l.supplier_item_id, l]));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 640, md: 780 },
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
              {order?.po_number ?? "Purchase Order"}
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
                  onClick={() => onPlace(order)}
                  sx={actionSx}
                >
                  Place order
                </Button>
              </>
            )}
            {(order?.status === 1 || order?.status === 2) && (
              <Button
                size="small"
                variant="contained"
                onClick={() => onReceive(order)}
                sx={actionSx}
              >
                Receive
              </Button>
            )}
            {order?.status === 2 && (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => onCloseShort(order)}
                sx={actionSx}
              >
                Close short
              </Button>
            )}
            {(order?.status === 0 || order?.status === 1) && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => onCancel(order)}
                sx={actionSx}
              >
                Cancel order
              </Button>
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
              <DetailRow label="Supplier" value={order.supplier_name ?? "-"} />
              <DetailRow label="Deliver to" value={order.store_name ?? "-"} />
              <DetailRow label="Project" value={order.project_name ?? "-"} />
              <DetailRow
                label="Source"
                value={
                  order.source === "reorder" ? "Reorder planner" : "Manual"
                }
              />
              <DetailRow
                label="Ordered on"
                value={dateText(order.order_date)}
              />
              <DetailRow
                label="Expected"
                value={dateText(order.expected_date)}
              />
              <DetailRow
                label="Created by"
                value={order.created_by_name ?? "-"}
              />
              {order.received_by_name && (
                <DetailRow
                  label="Last received by"
                  value={order.received_by_name}
                />
              )}
              {order.note && <DetailRow label="Note" value={order.note} />}
              {order.closed_at && (
                <DetailRow
                  label="Closed short on"
                  value={dateText(order.closed_at)}
                />
              )}
              <DetailRow label="Total" value={money(order.total)} />
            </Stack>

            <Divider />
            <Typography variant="subtitle2" fontWeight={700} mt={2} mb={1}>
              Items ({lines.length})
            </Typography>
            <TableContainer
              sx={{ mb: 3, border: "1px solid #eef2f7", borderRadius: 1 }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headCell}>Item</TableCell>
                    <TableCell sx={headCell}>Ordered</TableCell>
                    <TableCell sx={headCell}>Good</TableCell>
                    <TableCell sx={headCell}>Damaged</TableCell>
                    <TableCell sx={headCell}>Outstanding</TableCell>
                    <TableCell sx={headCell} align="right">
                      Total
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((l) => {
                    const fmt = (n: number) =>
                      packsText(n, l.pack_qty, l.unit_name);
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {l.supplier_code} · {l.supplier_item_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {l.internal_item_uuid} {l.internal_item_name} ·{" "}
                            {money(l.pack_price)} per {l.pack_qty}{" "}
                            {l.unit_name ?? "unit"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" whiteSpace="nowrap">
                            {fmt(l.base_qty)}
                          </Typography>
                          {l.pack_qty > 1 && (
                            <Typography variant="caption" color="textSecondary">
                              = {l.base_qty} {l.unit_name ?? "unit"}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" whiteSpace="nowrap">
                            {fmt(l.good_qty)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            whiteSpace="nowrap"
                            color={l.damaged_qty ? "error.main" : undefined}
                          >
                            {fmt(l.damaged_qty)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            whiteSpace="nowrap"
                            fontWeight={l.outstanding_qty ? 600 : 400}
                            color={
                              l.outstanding_qty && order.status !== 5
                                ? "warning.main"
                                : undefined
                            }
                          >
                            {fmt(l.outstanding_qty)}
                          </Typography>
                          {l.closed_qty > 0 && (
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              display="block"
                            >
                              {fmt(l.closed_qty)} closed short
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {money(l.line_total)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider />
            <Typography variant="subtitle2" fontWeight={700} mt={2} mb={1}>
              Deliveries ({order.receives?.length ?? 0})
            </Typography>
            {!order.receives?.length ? (
              <Typography variant="body2" color="textSecondary">
                Nothing received yet.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {order.receives.map((r: any) => (
                  <Box
                    key={r.id}
                    sx={{
                      border: "1px solid #eef2f7",
                      borderRadius: 1,
                      px: 1.5,
                      py: 1,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" fontWeight={600}>
                        {r.delivery_ref || "No delivery ref"}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {dateText(r.received_at)}
                      </Typography>
                    </Stack>
                    {r.lines.map((rl: any) => {
                      const l = lineBySupplierItem.get(rl.supplier_item_id);
                      if (!l) return null;
                      return (
                        <Typography
                          key={rl.supplier_item_id}
                          variant="caption"
                          color="textSecondary"
                          display="block"
                        >
                          {l.supplier_code}:{" "}
                          {packsText(rl.good_qty, l.pack_qty, l.unit_name)} good
                          {rl.damaged_qty
                            ? `, ${packsText(rl.damaged_qty, l.pack_qty, l.unit_name)} damaged`
                            : ""}
                        </Typography>
                      );
                    })}
                    {r.note && (
                      <Typography variant="caption" display="block">
                        {r.note}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default PurchaseOrderDetails;
