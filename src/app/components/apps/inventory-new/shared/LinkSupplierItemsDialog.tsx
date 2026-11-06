"use client";
import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { IconPlus } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormField from "./FormField";
import { InventoryOptions } from "./useInventoryOptions";

interface SupplierItemRow {
  id: number;
  uuid: string;
  supplier_name: string | null;
  supplier_code: string;
  name: string;
  // internal items it is already linked to (a supplier item can have several)
  internal_items: { id: number; uuid: string; name: string }[];
}

interface LinkSupplierItemsDialogProps {
  open: boolean;
  onClose: () => void;
  companyId?: number | null;
  options: InventoryOptions;
  internalItemId?: number | null;
  supplierItemIds?: number[];
  onLinked: () => void;
  onCreateNew?: (internalItemId: number | null) => void;
}

const label = (s: SupplierItemRow) =>
  `${s.supplier_name ?? "-"} · ${s.supplier_code} · ${s.name}`;

const LinkSupplierItemsDialog: React.FC<LinkSupplierItemsDialogProps> = ({
  open,
  onClose,
  companyId,
  options,
  internalItemId,
  supplierItemIds,
  onLinked,
  onCreateNew,
}) => {
  const [internalId, setInternalId] = useState<number | null>(null);
  const [picked, setPicked] = useState<SupplierItemRow[]>([]);
  const [supplierItems, setSupplierItems] = useState<SupplierItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !companyId) return;
    setInternalId(internalItemId ?? null);
    setLoading(true);
    api
      .get(`inventory-new/supplier-items/get?company_id=${companyId}`)
      .then((res) => {
        const rows: SupplierItemRow[] = res.data?.info ?? [];
        setSupplierItems(rows);
        setPicked(rows.filter((r) => supplierItemIds?.includes(r.id)));
      })
      .catch(() => setSupplierItems([]))
      .finally(() => setLoading(false));
  }, [open, companyId, internalItemId]);

  const internalItem = options.internal_items.find((i) => i.id === internalId) ?? null;
  const internalLocked = !!internalItemId;
  // already linked to this internal item: shown, can't be picked again
  const linkedHere = (s: SupplierItemRow) =>
    !!internalId && (s.internal_items ?? []).some((i) => i.id === internalId);
  // its other internal items (it stays linked to them too)
  const otherLinks = (s: SupplierItemRow) =>
    (s.internal_items ?? []).filter((i) => i.id !== internalId).map((i) => i.uuid);

  const submit = async () => {
    if (!internalId) {
      toast.error("Please pick the internal item!");
      return;
    }
    const ids = [...new Set(picked.filter((s) => !linkedHere(s)).map((s) => s.id))];
    if (!ids.length) {
      toast.error("Please pick at least one supplier item!");
      return;
    }
    setSaving(true);
    try {
      const result = await api.post("inventory-new/supplier-items/link", {
        company_id: companyId,
        internal_item_id: internalId,
        supplier_item_ids: ids.join(","),
      });
      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        onLinked();
        onClose();
      }
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Link supplier items</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <FormField label="Internal item">
            <Autocomplete
              size="small"
              options={options.internal_items}
              value={internalItem}
              disabled={internalLocked}
              onChange={(_, value) => {
                setInternalId(value?.id ?? null);
                setPicked((prev) =>
                  prev.filter((s) => !value || !(s.internal_items ?? []).some((i) => i.id === value.id)),
                );
              }}
              getOptionLabel={(o) => `${o.uuid} · ${o.name}`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => <CustomTextField {...params} placeholder="Search internal item..." />}
            />
          </FormField>

          <FormField
            label="Supplier items"
            hint="Pick one or more. Supplier items keep any other internal items they are linked to"
          >
            <Autocomplete
              multiple
              size="small"
              disableCloseOnSelect
              loading={loading}
              options={supplierItems}
              value={picked}
              onChange={(_, value) =>
                setPicked(value.filter((v, i, all) => all.findIndex((x) => x.id === v.id) === i))
              }
              filterSelectedOptions
              getOptionLabel={label}
              getOptionDisabled={linkedHere}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderOption={(props, option, { selected }) => (
                <li {...props} key={option.id}>
                  <Checkbox size="small" checked={selected || linkedHere(option)} disabled={linkedHere(option)} sx={{ mr: 1 }} />
                  <Box minWidth={0}>
                    <Typography variant="body2" noWrap>
                      {label(option)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {option.uuid}
                      {linkedHere(option) && " · already linked here"}
                      {otherLinks(option).length > 0 && ` · also linked to ${otherLinks(option).join(", ")}`}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <CustomTextField {...params} placeholder={picked.length ? "" : "Search supplier items..."} />
              )}
            />
          </FormField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
        {onCreateNew ? (
          <Button
            startIcon={<IconPlus size={16} />}
            onClick={() => {
              onClose();
              onCreateNew(internalId);
            }}
            sx={{ textTransform: "none" }}
          >
            New supplier item
          </Button>
        ) : (
          <span />
        )}
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} variant="outlined" color="primary">
            Cancel
          </Button>
          <Button onClick={submit} variant="contained" disabled={saving}>
            {saving ? "Linking..." : "Link"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default LinkSupplierItemsDialog;
