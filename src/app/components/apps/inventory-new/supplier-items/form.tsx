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
import QuickAddInternalItem from "../shared/QuickAddInternalItem";
import { cleanUuidInput, useItemUuid } from "../shared/useItemUuid";
import toast from "react-hot-toast";

// same limits as the server
export const SUPPLIER_CODE_MAX = 50;
export const SUPPLIER_ITEM_NAME_MAX = 100;

export interface SupplierItemForm {
  id?: number;
  uuid: string;
  supplier_id: number | "";
  internal_item_ids: number[];
  supplier_code: string;
  name: string;
  is_pack: boolean;
  pack_qty: string;
  pack_unit_id: number | "";
  pack_price: string;
  lead_time_days: string;
  is_preferred: boolean;
}

export const emptySupplierItem: SupplierItemForm = {
  uuid: "",
  supplier_id: "",
  internal_item_ids: [],
  supplier_code: "",
  name: "",
  is_pack: false,
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
  const [quickInternalOpen, setQuickInternalOpen] = useState(false);
  const set = (name: keyof SupplierItemForm, value: any) =>
    setFormData((prev) => ({ ...prev, [name]: value }));
  const { uuidError, uuidChecking } = useItemUuid(
    "supplier",
    open,
    companyId,
    formData.id,
    formData.uuid,
    (uuid) => set("uuid", uuid),
  );

  const internalItemIds = formData.internal_item_ids ?? [];
  const internalItems = options.internal_items.filter((i) =>
    internalItemIds.includes(i.id),
  );
  const internalItem = internalItems[0] ?? null;

  const submit = (e: React.FormEvent) => {
    if (uuidError) {
      e.preventDefault();
      toast.error(uuidError);
      return;
    }
    onSubmit(e);
  };
  const supplierDefaultLead =
    options.suppliers.find((sp) => sp.id === formData.supplier_id)
      ?.default_lead_time_days ?? null;
  const packQty = formData.is_pack ? Number(formData.pack_qty) : 1;
  const packPrice = Number(formData.pack_price);
  const unitPrice =
    packQty > 0 && formData.pack_price !== "" ? packPrice / packQty : null;

  return (
    <FormDrawer
      open={open}
      title={formData.id ? "Edit Supplier Item" : "Add Supplier Item"}
      onClose={onClose}
      onSubmit={submit}
      isSaving={isSaving || uuidChecking}
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
        label="UUID"
        hint={
          uuidError ??
          (formData.id
            ? "Unique in the company"
            : "Generated for you; you can change it. Must be unique in the company")
        }
      >
        <CustomTextField
          placeholder="e.g. SUP-0001"
          value={formData.uuid}
          onChange={(e: any) => set("uuid", cleanUuidInput(e.target.value))}
          error={!!uuidError}
          fullWidth
          slotProps={{ htmlInput: { maxLength: 50 } }}
        />
      </FormField>

      <FormField
        label="Supplier code"
        hint={`The supplier's own product code; unique per supplier (max ${SUPPLIER_CODE_MAX} characters)`}
      >
        <CustomTextField
          placeholder="e.g. GL-NIT-12"
          value={formData.supplier_code}
          onChange={(e: any) => set("supplier_code", e.target.value)}
          fullWidth
          slotProps={{ htmlInput: { maxLength: SUPPLIER_CODE_MAX } }}
        />
      </FormField>

      <FormField label="Supplier item name">
        <CustomTextField
          placeholder="Name on the supplier's list..."
          value={formData.name}
          onChange={(e: any) => set("name", e.target.value)}
          fullWidth
          slotProps={{ htmlInput: { maxLength: SUPPLIER_ITEM_NAME_MAX } }}
        />
      </FormField>

      <FormField
        label="Internal items (optional)"
        hint="One supplier item can be linked to several internal items. Leave empty to keep it unlinked, or add a new one"
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Autocomplete
            multiple
            size="small"
            fullWidth
            disableCloseOnSelect
            filterSelectedOptions
            options={options.internal_items}
            value={internalItems}
            onChange={(_, value) => {
              const ids = [...new Set(value.map((v) => v.id))];
              setFormData((prev) => ({
                ...prev,
                internal_item_ids: ids,
                is_preferred: ids.length ? prev.is_preferred : false,
              }));
            }}
            getOptionLabel={(o) => `${o.uuid} · ${o.name}`}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => (
              <CustomTextField
                {...params}
                placeholder={internalItems.length ? "" : "Search internal items..."}
              />
            )}
          />
          <Tooltip title="Add internal item">
            <Fab
              color="primary"
              size="small"
              sx={{ flexShrink: 0 }}
              onClick={() => setQuickInternalOpen(true)}
            >
              <IconPlus size={14} />
            </Fab>
          </Tooltip>
        </Box>
      </FormField>
      <QuickAddInternalItem
        open={quickInternalOpen}
        onClose={() => setQuickInternalOpen(false)}
        companyId={companyId ?? null}
        options={options}
        onOptionsChanged={onOptionsChanged}
        defaultName={formData.name}
        onCreated={async (id) => {
          await onOptionsChanged?.();
          setFormData((prev) => {
            const ids = prev.internal_item_ids ?? [];
            return {
              ...prev,
              internal_item_ids: ids.includes(id) ? ids : [...ids, id],
            };
          });
        }}
      />

      <FormControlLabel
        sx={{ gap: 1.5, ml: 0 }}
        control={
          <IOSSwitch
            checked={formData.is_pack}
            onChange={(e) => set("is_pack", e.target.checked)}
          />
        }
        label={
          <Typography variant="body2">
            Bought in packs (pack qty and unit)
          </Typography>
        }
      />

      {formData.is_pack && (
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
      )}

      <Stack direction="row" spacing={2}>
        <FormField
          label={formData.is_pack ? "Pack price (£)" : "Unit price (£)"}
        >
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
      {formData.is_pack && unitPrice !== null && Number.isFinite(unitPrice) && (
        <Typography variant="caption" color="textSecondary" mt={-1}>
          = £{unitPrice.toFixed(4)} per {internalItem?.unit_name ?? "unit"}
        </Typography>
      )}

      <FormControlLabel
        sx={{ gap: 1.5, ml: 0 }}
        control={
          <IOSSwitch
            checked={formData.is_preferred}
            disabled={!internalItemIds.length}
            onChange={(e) => set("is_preferred", e.target.checked)}
          />
        }
        label={
          internalItemIds.length > 1
            ? "Preferred supplier for these internal items"
            : "Preferred supplier for this internal item"
        }
      />
    </FormDrawer>
  );
};

export default SupplierItemDrawer;
