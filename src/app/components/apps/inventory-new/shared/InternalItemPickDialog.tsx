"use client";
import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  Tooltip,
  Typography,
} from "@mui/material";
import { IconPlus } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import QuickAddInternalItem from "./QuickAddInternalItem";
import { InventoryOptions } from "./useInventoryOptions";

interface InternalItemPickDialogProps {
  item: any | null;
  onClose: () => void;
  companyId?: number | null;
  options: InventoryOptions;
  onOptionsChanged?: () => Promise<void> | void;
  onSaved: () => void;
}

const InternalItemPickDialog: React.FC<InternalItemPickDialogProps> = ({
  item,
  onClose,
  companyId,
  options,
  onOptionsChanged,
  onSaved,
}) => {
  const [pickedIds, setPickedIds] = useState<number[]>([]);
  const [quickOpen, setQuickOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const currentIds: number[] = (item?.internal_items ?? []).map((i: any) => i.id);

  useEffect(() => {
    setPickedIds((item?.internal_items ?? []).map((i: any) => i.id));
  }, [item]);

  const value = options.internal_items.filter((i) => pickedIds.includes(i.id));
  const unchanged =
    pickedIds.length === currentIds.length && pickedIds.every((id) => currentIds.includes(id));

  const submit = async () => {
    if (!item || saving) return;
    if (unchanged) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const result = await api.post("inventory-new/supplier-items/set-internal-items", {
        company_id: companyId,
        id: item.id,
        internal_item_ids: pickedIds.join(","),
      });
      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        onSaved();
        onClose();
      }
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={!!item && !quickOpen}
        onClose={() => {
          if (!saving) onClose();
        }}
      >
        <DialogTitle>{currentIds.length ? "Change Internal Items" : "Add Internal Items"}</DialogTitle>
        <DialogContent>
          {item && (
            <Typography variant="body2" color="textSecondary" mb={1.5}>
              {item.supplier_name ?? "-"} · {item.supplier_code} · {item.name}
            </Typography>
          )}
          <Box display="flex" alignItems="center" gap={1}>
            <Autocomplete
              multiple
              size="small"
              disableCloseOnSelect
              filterSelectedOptions
              options={options.internal_items}
              value={value}
              onChange={(_, v) => setPickedIds([...new Set(v.map((o) => o.id))])}
              getOptionLabel={(o) => `${o.code} · ${o.name}`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => (
                <CustomTextField {...params} placeholder={value.length ? "" : "Select internal items"} />
              )}
              sx={{ width: { xs: "100%", sm: 400 } }}
            />
            <Tooltip title="Add internal item">
              <Fab color="primary" size="small" sx={{ flexShrink: 0 }} onClick={() => setQuickOpen(true)}>
                <IconPlus size={14} />
              </Fab>
            </Tooltip>
          </Box>
          <Typography variant="caption" color="textSecondary" display="block" mt={1}>
            Pick one or more internal items. Remove them all to unlink.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="error" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            variant="contained"
            color="primary"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {saving ? "Saving..." : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      <QuickAddInternalItem
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        companyId={companyId ?? null}
        options={options}
        onOptionsChanged={onOptionsChanged}
        defaultName={item?.name}
        onCreated={async (id) => {
          await onOptionsChanged?.();
          setPickedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        }}
      />
    </>
  );
};

export default InternalItemPickDialog;
