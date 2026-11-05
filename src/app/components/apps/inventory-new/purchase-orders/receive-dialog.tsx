"use client";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import QtyInput from "../shared/QtyInput";
import { isoDate, packsText, splitQty } from "../shared/orderUtils";

interface ReceiveDialogProps {
  open: boolean;
  order: any | null;
  companyId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

type Qty = { packs: string; units: string };
const EMPTY: Qty = { packs: "", units: "" };

const headCell = { fontWeight: 600, whiteSpace: "nowrap" } as const;

// Delivery note: good goes into stock; damaged is paid for but not added to stock.
const ReceiveDialog: React.FC<ReceiveDialogProps> = ({
  open,
  order,
  companyId,
  onClose,
  onSaved,
}) => {
  const [deliveryRef, setDeliveryRef] = useState("");
  const [receivedAt, setReceivedAt] = useState(isoDate(new Date()));
  const [note, setNote] = useState("");
  const [good, setGood] = useState<Record<number, Qty>>({});
  const [damaged, setDamaged] = useState<Record<number, Qty>>({});
  const [isSaving, setIsSaving] = useState(false);

  const lines: any[] = (order?.lines ?? []).filter(
    (l: any) => l.outstanding_qty > 0,
  );

  useEffect(() => {
    if (!open) return;
    setDeliveryRef("");
    setReceivedAt(isoDate(new Date()));
    setNote("");
    setGood({});
    setDamaged({});
  }, [open]);

  const toBase = (l: any, q?: Qty) =>
    q
      ? Number(q.packs || 0) * l.pack_qty +
        (l.is_sub_qty ? Number(q.units || 0) : 0)
      : 0;

  const fillAll = () =>
    setGood(
      Object.fromEntries(
        lines.map((l) => {
          const q = l.is_sub_qty
            ? splitQty(l.outstanding_qty, l.pack_qty)
            : { packs: l.outstanding_qty / l.pack_qty, units: 0 };
          return [
            l.id,
            { packs: String(q.packs), units: q.units ? String(q.units) : "" },
          ];
        }),
      ),
    );

  const submit = async () => {
    const payloadLines = lines
      .map((l) => ({
        po_line_id: l.id,
        good_qty: toBase(l, good[l.id]),
        damaged_qty: toBase(l, damaged[l.id]),
      }))
      .filter((l) => l.good_qty > 0 || l.damaged_qty > 0);
    if (!payloadLines.length) {
      toast.error("Enter the qty received on at least one line!");
      return;
    }
    const over = lines.find(
      (l) =>
        toBase(l, good[l.id]) + toBase(l, damaged[l.id]) >
        l.outstanding_qty + 1e-9,
    );
    if (over) {
      toast.error(
        `${over.supplier_code}: only ${packsText(over.outstanding_qty, over.pack_qty, over.unit_name)} is still to come!`,
      );
      return;
    }
    setIsSaving(true);
    try {
      const result = await api.post("inventory-new/purchase-orders/receive", {
        company_id: companyId,
        id: order.id,
        delivery_ref: deliveryRef,
        received_at: receivedAt,
        note,
        lines: payloadLines,
      });
      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        onSaved();
      }
    } catch (error) {
      // the api interceptor already shows the error message
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ m: 0, position: "relative" }}>
        Receive {order?.po_number}
        <Typography variant="body2" color="textSecondary">
          {order?.supplier_name} → {order?.store_name}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <IconX />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          mt={1}
          mb={2}
        >
          <CustomTextField
            label="Delivery note ref"
            placeholder="e.g. DN-6150"
            value={deliveryRef}
            onChange={(e: any) => setDeliveryRef(e.target.value)}
            size="small"
          />
          <CustomTextField
            label="Received on"
            type="date"
            value={receivedAt}
            onChange={(e: any) => setReceivedAt(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <CustomTextField
            label="Note"
            value={note}
            onChange={(e: any) => setNote(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
        </Stack>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={1}
        >
          <Alert severity="info" sx={{ py: 0 }}>
            Damaged qty is paid for but not added to stock, so its cost raises
            the base price.
          </Alert>
          <Button size="small" variant="outlined" onClick={fillAll}>
            Fill all outstanding as good
          </Button>
        </Stack>

        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headCell}>Item</TableCell>
                <TableCell sx={headCell}>Outstanding</TableCell>
                <TableCell sx={headCell}>Good</TableCell>
                <TableCell sx={headCell}>Damaged</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((l) => {
                const mode = l.is_sub_qty ? "packs+units" : "packs";
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {l.supplier_code} · {l.supplier_item_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {l.internal_item_uuid} {l.internal_item_name} ·{" "}
                        {l.pack_qty} {l.unit_name ?? "unit"} per pack
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" whiteSpace="nowrap">
                        {packsText(l.outstanding_qty, l.pack_qty, l.unit_name)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <QtyInput
                        mode={mode}
                        packs={good[l.id]?.packs ?? ""}
                        units={good[l.id]?.units ?? ""}
                        unitLabel={l.unit_name ?? "unit"}
                        onChange={(v) =>
                          setGood((prev) => ({ ...prev, [l.id]: v }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <QtyInput
                        mode={mode}
                        packs={damaged[l.id]?.packs ?? EMPTY.packs}
                        units={damaged[l.id]?.units ?? EMPTY.units}
                        unitLabel={l.unit_name ?? "unit"}
                        onChange={(v) =>
                          setDamaged((prev) => ({ ...prev, [l.id]: v }))
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={isSaving}>
          {isSaving ? "Saving..." : "Book delivery"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiveDialog;
