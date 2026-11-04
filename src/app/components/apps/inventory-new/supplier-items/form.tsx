import React, { useState } from "react";
import {
  Autocomplete,
  Box,
  Fab,
  FormControlLabel,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { IconPlus } from "@tabler/icons-react";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "../shared/FormDrawer";
import FormField from "../shared/FormField";
import { InventoryOptions } from "../shared/useInventoryOptions";
import QuickAddSupplier from "../shared/QuickAddSupplier";

export interface SupplierItemForm {
  id?: number;
  supplier_id: number | "";
  internal_item_id: number | null;
  supplier_code: string;
  name: string;
  pack_qty: string;
  pack_unit_id: number | "";
  pack_price: string;
  lead_time_days: string;
  is_preferred: boolean;
}

export const emptySupplierItem: SupplierItemForm = {
  supplier_id: "",
  internal_item_id: null,
  supplier_code: "",
  name: "",
  pack_qty: "1",
  pack_unit_id: "",
  pack_price: "",
  lead_time_days: "",
  is_preferred: false,
};

interface SupplierItemDrawerProps {
  open: boolean;
  onClose: () => void;
  formData: SupplierItemForm;
  setFormData: React.Dispatch<React.SetStateAction<SupplierItemForm>>;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  options: InventoryOptions;
  companyId?: number | null;
  // reloads the dropdown data, so a supplier added here can be picked
  onOptionsChanged?: () => Promise<void> | void;
}

const SupplierItemDrawer: React.FC<SupplierItemDrawerProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isSaving,
  options,
  companyId,
  onOptionsChanged,
}) => {
  const [quickSupplierOpen, setQuickSupplierOpen] = useState(false);
  const set = (name: keyof SupplierItemForm, value: any) =>
    setFormData((prev) => ({ ...prev, [name]: value }));
  const internalItem =
    options.internal_items.find((i) => i.id === formData.internal_item_id) ??
    null;
  const supplierDefaultLead =
    options.suppliers.find((sp) => sp.id === formData.supplier_id)
      ?.default_lead_time_days ?? null;
  const packQty = Number(formData.pack_qty);
  const packPrice = Number(formData.pack_price);
  const unitPrice =
    packQty > 0 && formData.pack_price !== "" ? packPrice / packQty : null;

  return (
    <FormDrawer
      open={open}
      title={formData.id ? "Edit Supplier Item" : "Add Supplier Item"}
      onClose={onClose}
      onSubmit={onSubmit}
      isSaving={isSaving}
    >
      <FormField label="Supplier">
        <Box display="flex" alignItems="center" gap={1}>
          <CustomTextField
            select
            value={formData.supplier_id}
            onChange={(e: any) => set("supplier_id", e.target.value)}
            fullWidth
            size="small"
            slotProps={{ select: { displayEmpty: true } }}
          >
            <MenuItem value="" disabled>
              Select supplier
            </MenuItem>
            {options.suppliers.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </CustomTextField>
          <Tooltip title="Add supplier">
            <Fab
              color="primary"
              size="small"
              sx={{ flexShrink: 0 }}
              onClick={() => setQuickSupplierOpen(true)}
            >
              <IconPlus size={14} />
            </Fab>
          </Tooltip>
        </Box>
      </FormField>
      <QuickAddSupplier
        open={quickSupplierOpen}
        onClose={() => setQuickSupplierOpen(false)}
        companyId={companyId ?? null}
        onCreated={async (id) => {
          await onOptionsChanged?.();
          set("supplier_id", id);
        }}
      />

      <FormField
        label="Supplier code"
        hint="The supplier's own product code; unique per supplier"
      >
        <CustomTextField
          placeholder="e.g. GL-NIT-12"
          value={formData.supplier_code}
          onChange={(e: any) => set("supplier_code", e.target.value)}
          fullWidth
          slotProps={{ htmlInput: { maxLength: 50 } }}
        />
      </FormField>

      <FormField label="Name">
        <CustomTextField
          placeholder="Name on the supplier's list..."
          value={formData.name}
          onChange={(e: any) => set("name", e.target.value)}
          fullWidth
          slotProps={{ htmlInput: { maxLength: 50 } }}
        />
      </FormField>

      <FormField label="Internal item" hint="Leave empty to keep it unlinked">
        <Autocomplete
          size="small"
          options={options.internal_items}
          value={internalItem}
          onChange={(_, value) => {
            setFormData((prev) => ({
              ...prev,
              internal_item_id: value?.id ?? null,
              is_preferred: value ? prev.is_preferred : false,
            }));
          }}
          getOptionLabel={(o) => `${o.code} · ${o.name}`}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          renderInput={(params) => (
            <CustomTextField
              {...params}
              placeholder="Search internal item..."
            />
          )}
        />
      </FormField>

      <Stack direction="row" spacing={2}>
        <FormField
          label={`Pack qty${internalItem?.unit_name ? ` (${internalItem.unit_name})` : ""}`}
        >
          <CustomTextField
            value={formData.pack_qty}
            onChange={(e: any) => {
              const value = e.target.value;
              if (!/^\d{0,8}(\.\d{0,2})?$/.test(value)) return;
              set("pack_qty", value);
            }}
            fullWidth
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
        </FormField>
        <FormField label="Pack unit">
          <CustomTextField
            select
            value={formData.pack_unit_id}
            onChange={(e: any) => set("pack_unit_id", e.target.value)}
            fullWidth
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">-</MenuItem>
            {options.units.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.name}
              </MenuItem>
            ))}
          </CustomTextField>
        </FormField>
      </Stack>

      <Stack direction="row" spacing={2}>
        <FormField label="Pack price (£)">
          <CustomTextField
            placeholder="0.00"
            value={formData.pack_price}
            onChange={(e: any) => {
              const value = e.target.value;
              // Numbers only, max 99999999.99 (2 decimal places)
              if (!/^\d{0,8}(\.\d{0,2})?$/.test(value)) return;
              set("pack_price", value);
            }}
            fullWidth
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
        </FormField>
        <FormField
          label="Lead time (days)"
          hint={
            formData.lead_time_days === "" && supplierDefaultLead !== null
              ? `Empty uses the supplier default (${supplierDefaultLead} days)`
              : undefined
          }
        >
          <CustomTextField
            placeholder={
              supplierDefaultLead !== null ? String(supplierDefaultLead) : ""
            }
            value={formData.lead_time_days}
            onChange={(e: any) => {
              const value = e.target.value;
              if (!/^\d{0,3}$/.test(value)) return;
              set("lead_time_days", value);
            }}
            fullWidth
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
          />
        </FormField>
      </Stack>
      {unitPrice !== null && Number.isFinite(unitPrice) && (
        <Typography variant="caption" color="textSecondary" mt={-1}>
          = £{unitPrice.toFixed(4)} per {internalItem?.unit_name ?? "unit"}
        </Typography>
      )}

      <FormControlLabel
        sx={{ gap: 1.5, ml: 0 }}
        control={
          <IOSSwitch
            checked={formData.is_preferred}
            disabled={!formData.internal_item_id}
            onChange={(e) => set("is_preferred", e.target.checked)}
          />
        }
        label="Preferred supplier for this internal item"
      />
    </FormDrawer>
  );
};

export default SupplierItemDrawer;
