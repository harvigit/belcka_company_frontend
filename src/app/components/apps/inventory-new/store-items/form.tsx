import React from "react";
import { Alert, Autocomplete, MenuItem, Stack } from "@mui/material";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "../shared/FormDrawer";
import FormField from "../shared/FormField";
import { InventoryOptions } from "../shared/useInventoryOptions";

export interface StoreItemForm {
  id?: number;
  store_id: number | "";
  internal_item_id: number | null;
  min_qty: string;
  max_qty: string;
}

export const emptyStoreItem: StoreItemForm = {
  store_id: "",
  internal_item_id: null,
  min_qty: "0",
  max_qty: "0",
};

interface StoreItemDrawerProps {
  open: boolean;
  onClose: () => void;
  formData: StoreItemForm;
  setFormData: React.Dispatch<React.SetStateAction<StoreItemForm>>;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  options: InventoryOptions;
  isAdmin: boolean;
}

const StoreItemDrawer: React.FC<StoreItemDrawerProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isSaving,
  options,
  isAdmin,
}) => {
  const set = (name: keyof StoreItemForm, value: any) =>
    setFormData((prev) => ({ ...prev, [name]: value }));
  const isEdit = !!formData.id;
  const internalItem =
    options.internal_items.find((i) => i.id === formData.internal_item_id) ??
    null;
  const unit = internalItem?.unit_name ?? "units";

  return (
    <FormDrawer
      open={open}
      title={
        isEdit
          ? "Edit Min / Max"
          : isAdmin
            ? "Add Item to Store"
            : "Request Item for Store"
      }
      onClose={onClose}
      onSubmit={onSubmit}
      isSaving={isSaving}
    >
      {!isEdit && (
        <Alert severity={isAdmin ? "success" : "info"}>
          {isAdmin
            ? "You are an admin, so the item is approved straight away."
            : "The request goes to an admin. The item can be ordered, issued and planned for this store once it is approved."}
        </Alert>
      )}

      <FormField label="Store">
        <CustomTextField
          select
          value={formData.store_id}
          onChange={(e: any) => set("store_id", e.target.value)}
          fullWidth
          size="small"
          disabled={isEdit}
          slotProps={{ select: { displayEmpty: true } }}
        >
          <MenuItem value="" disabled>
            Select store
          </MenuItem>
          {options.stores.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </CustomTextField>
      </FormField>

      <FormField label="Internal item">
        <Autocomplete
          size="small"
          // inactive items can't be added to a store
          options={options.internal_items.filter((i) => i.status !== false)}
          value={internalItem}
          disabled={isEdit}
          onChange={(_, value) => set("internal_item_id", value?.id ?? null)}
          getOptionLabel={(o) => `${o.uuid} · ${o.name}`}
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
          label={`Min (${unit})`}
          hint="Lowest: reorder urgently below this"
        >
          <CustomTextField
            value={formData.min_qty}
            onChange={(e: any) => {
              const value = e.target.value;
              if (!/^\d{0,10}(\.\d{0,2})?$/.test(value)) return;
              set("min_qty", value);
            }}
            fullWidth
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
        </FormField>
        <FormField label={`Max (${unit})`} hint="Highest: order up to this">
          <CustomTextField
            value={formData.max_qty}
            onChange={(e: any) => {
              const value = e.target.value;
              if (!/^\d{0,10}(\.\d{0,2})?$/.test(value)) return;
              set("max_qty", value);
            }}
            fullWidth
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
        </FormField>
      </Stack>
    </FormDrawer>
  );
};

export default StoreItemDrawer;
