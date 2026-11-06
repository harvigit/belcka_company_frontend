"use client";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import QtyInput from "../shared/QtyInput";
import { packsText } from "../shared/orderUtils";

interface AdjustDialogProps {
  open: boolean;
  row: any | null;
  companyId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

const TYPES = [
  {
    value: "missing",
    label: "Missing",
    hint: "Leaves stock; its cost stays in the pool, so the base price rises.",
  },
  {
    value: "damaged",
    label: "Damaged",
    hint: "Leaves stock; its cost stays in the pool, so the base price rises.",
  },
  {
    value: "found",
    label: "Found",
    hint: "Comes back into stock at no cost, so the base price drops.",
  },
];

// Records missing, damaged or found stock for one item in one store.
const AdjustDialog: React.FC<AdjustDialogProps> = ({
  open,
  row,
  companyId,
  onClose,
  onSaved,
}) => {
  const [type, setType] = useState("missing");
  const [qty, setQty] = useState({ packs: "", units: "" });
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType("missing");
    setQty({ packs: "", units: "" });
    setNote("");
  }, [open]);

  const sub = !!row?.is_sub_qty && (row?.issue_pack_qty ?? 0) > 1;
  const base =
    (sub ? Number(qty.packs || 0) * row.issue_pack_qty : 0) +
    Number(qty.units || 0);

  const submit = async () => {
    if (base <= 0) {
      toast.error("Qty must be more than 0!");
      return;
    }
    if (type !== "found" && !note.trim()) {
      toast.error("Please add a reason!");
      return;
    }
    setIsSaving(true);
    try {
      const result = await api.post("inventory-new/stock/adjust", {
        company_id: companyId,
        store_id: row.store_id,
        internal_item_id: row.internal_item_id,
        type,
        qty: base,
        note,
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Adjust stock
        {row && (
          <Typography variant="body2" color="textSecondary">
            {row.uuid} · {row.name} at {row.store_name} ·{" "}
            {packsText(
              row.on_hand,
              sub ? row.issue_pack_qty : null,
              row.unit_name,
              row.issue_pack_unit_name,
            )}{" "}
            in stock
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <CustomTextField
            select
            label="Type"
            value={type}
            onChange={(e: any) => setType(e.target.value)}
            fullWidth
          >
            {TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </CustomTextField>
          <Alert severity="info">
            {TYPES.find((t) => t.value === type)?.hint}
          </Alert>
          {row && (
            <QtyInput
              mode={sub ? "packs+units" : "units"}
              packs={qty.packs}
              units={qty.units}
              packLabel={row.issue_pack_unit_name ?? "pack"}
              unitLabel={row.unit_name ?? "unit"}
              onChange={setQty}
            />
          )}
          <CustomTextField
            label={type === "found" ? "Note" : "Reason"}
            value={note}
            onChange={(e: any) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdjustDialog;
