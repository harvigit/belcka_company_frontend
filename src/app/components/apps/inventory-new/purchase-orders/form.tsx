"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "../shared/FormDrawer";
import FormField from "../shared/FormField";
import QtyInput from "../shared/QtyInput";
import { InventoryOptions, money } from "../shared/useInventoryOptions";
import { isoDate, splitQty } from "../shared/orderUtils";
import { useActiveStoreId } from "../shared/useActiveStore";

interface OrderableItem {
  // "supplierItemId:internalItemId": a supplier item linked to several internal items shows once per internal item
  key: string;
  id: number;
  internal_item_id: number;
  supplier_code: string;
  name: string;
  internal_item_uuid: string;
  internal_item_name: string;
  unit_name: string | null;
  pack_qty: number;
  pack_unit_name: string | null;
  pack_price: number | null;
  is_sub_qty: boolean;
}

interface Line {
  supplier_item_id: number;
  // the internal item this line is stocked as
  internal_item_id: number;
  packs: string;
  units: string;
}

interface PurchaseOrderDrawerProps {
  open: boolean;
  order: any | null;
  companyId?: number | null;
  options: InventoryOptions;
  onClose: () => void;
  onSaved: () => void;
}

const PurchaseOrderDrawer: React.FC<PurchaseOrderDrawerProps> = ({
  open,
  order,
  companyId,
  options,
  onClose,
  onSaved,
}) => {
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [storeId, setStoreId] = useState<number | "">("");
  // a new order starts on the store activated on the Stores page; it can be changed
  const activeStoreId = useActiveStoreId(options);
  const [expectedDate, setExpectedDate] = useState("");
  const [note, setNote] = useState("");
  const [projectId, setProjectId] = useState<number | "">("");
  const [lines, setLines] = useState<Line[]>([]);
  const [items, setItems] = useState<OrderableItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // load the order being edited, or start empty
  useEffect(() => {
    if (!open) return;
    setSupplierId(order?.supplier_id ?? "");
    setStoreId(order ? order.store_id ?? "" : activeStoreId ?? "");
    setExpectedDate(isoDate(order?.expected_date));
    setNote(order?.note ?? "");
    setProjectId(order?.project_id ?? "");
    setLines(
      (order?.lines ?? []).map((l: any) => {
        const q = l.is_sub_qty
          ? splitQty(l.base_qty, l.pack_qty)
          : { packs: l.qty_packs, units: 0 };
        return {
          supplier_item_id: l.supplier_item_id,
          internal_item_id: l.internal_item_id,
          packs: String(q.packs),
          units: q.units ? String(q.units) : "",
        };
      }),
    );
  }, [open, order]);

  useEffect(() => {
    if (!open || !companyId || !supplierId || !storeId) {
      setItems([]);
      return;
    }
    api
      .get(
        `inventory-new/purchase-orders/orderable-items?company_id=${companyId}&supplier_id=${supplierId}&store_id=${storeId}`,
      )
      .then((res) => setItems(res.data?.info ?? []))
      .catch(() => setItems([]));
  }, [open, companyId, supplierId, storeId]);

  const itemByKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);
  const lineKey = (l: Line) => `${l.supplier_item_id}:${l.internal_item_id}`;

  const lineBase = (line: Line, item?: OrderableItem) =>
    item
      ? Number(line.packs || 0) * item.pack_qty +
        (item.is_sub_qty ? Number(line.units || 0) : 0)
      : 0;
  const lineTotal = (line: Line, item?: OrderableItem) =>
    item && item.pack_price !== null
      ? lineBase(line, item) * (item.pack_price / item.pack_qty)
      : 0;
  const total = lines.reduce(
    (t, l) => t + lineTotal(l, itemByKey.get(lineKey(l))),
    0,
  );

  // changing supplier or store drops lines that no longer belong
  const changeHeader = (setter: (v: any) => void, value: any) => {
    setter(value);
    if (lines.length) setLines([]);
  };

  const submit = async (placeOrder: boolean) => {
    if (!supplierId || !storeId) {
      toast.error("Please select a supplier and a store!");
      return;
    }
    if (!lines.length) {
      toast.error("Add at least one item to the order!");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...(order?.id && { id: order.id }),
        company_id: companyId,
        supplier_id: supplierId,
        store_id: storeId,
        expected_date: expectedDate || null,
        project_id: projectId || null,
        note,
        place_order: placeOrder,
        lines: lines.map((l) => ({
          supplier_item_id: l.supplier_item_id,
          internal_item_id: l.internal_item_id,
          qty_packs: Number(l.packs || 0),
          qty_units: Number(l.units || 0),
        })),
      };
      const result = await api.post(
        order?.id
          ? "inventory-new/purchase-orders/update"
          : "inventory-new/purchase-orders/create",
        payload,
      );
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

  // a supplier item goes on the order once (for one of its internal items)
  const available = items.filter(
    (i) => !lines.some((l) => l.supplier_item_id === i.id),
  );

  return (
    <FormDrawer
      open={open}
      width={680}
      title={order?.id ? `Edit ${order.po_number}` : "Add Purchase Order"}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      isSaving={isSaving}
      submitLabel="Save draft"
      secondaryAction={{
        label: "Save & place order",
        onClick: () => submit(true),
      }}
    >
      <Stack direction="row" spacing={2}>
        <Box flex={1}>
          <FormField label="Supplier">
            <CustomTextField
              select
              value={supplierId}
              onChange={(e: any) => changeHeader(setSupplierId, e.target.value)}
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
          </FormField>
        </Box>
        <Box flex={1}>
          <FormField label="Deliver to store">
            <CustomTextField
              select
              value={storeId}
              onChange={(e: any) => changeHeader(setStoreId, e.target.value)}
              fullWidth
              size="small"
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
        </Box>
      </Stack>

      <FormField
        label="Project"
        hint="Optional: the project this order is bought for"
      >
        <CustomTextField
          select
          value={projectId}
          onChange={(e: any) => setProjectId(e.target.value)}
          fullWidth
          size="small"
          slotProps={{ select: { displayEmpty: true } }}
        >
          <MenuItem value="">No project</MenuItem>
          {options.projects.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </CustomTextField>
      </FormField>

      <Stack direction="row" spacing={2}>
        <Box flex={1}>
          <FormField label="Expected date">
            <CustomTextField
              type="date"
              value={expectedDate}
              onChange={(e: any) => setExpectedDate(e.target.value)}
              fullWidth
            />
          </FormField>
        </Box>
        <Box flex={1}>
          <FormField label="Note">
            <CustomTextField
              placeholder="Note for this order..."
              value={note}
              onChange={(e: any) => setNote(e.target.value)}
              fullWidth
            />
          </FormField>
        </Box>
      </Stack>

      <Divider />

      <Typography variant="subtitle2" fontWeight={700}>
        Items
      </Typography>
      {supplierId && storeId ? (
        <Autocomplete
          size="small"
          options={available}
          value={null}
          onChange={(_, value) => {
            if (value)
              setLines((prev) => [
                ...prev,
                {
                  supplier_item_id: value.id,
                  internal_item_id: value.internal_item_id,
                  packs: "1",
                  units: "",
                },
              ]);
          }}
          getOptionLabel={(o) => `${o.supplier_code} · ${o.name}`}
          renderOption={(props, o) => (
            <li {...props} key={o.key}>
              <Box>
                <Typography variant="body2">
                  {o.supplier_code} · {o.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {o.internal_item_uuid} {o.internal_item_name} · {o.pack_qty}{" "}
                  {o.unit_name ?? "unit"} per pack · {money(o.pack_price)}
                  {o.is_sub_qty ? " · Sub qty" : ""}
                </Typography>
              </Box>
            </li>
          )}
          noOptionsText="No more items: only supplier items linked to an internal item approved for this store"
          renderInput={(params) => (
            <CustomTextField {...params} placeholder="Add supplier item..." />
          )}
        />
      ) : (
        <Alert severity="info">
          Select a supplier and a store to add items.
        </Alert>
      )}

      {lines.map((line, index) => {
        const item = itemByKey.get(lineKey(line));
        const base = lineBase(line, item);
        return (
          <Box
            key={lineKey(line)}
            sx={{
              border: "1px solid #eef2f7",
              borderRadius: 1,
              p: 1.5,
              backgroundColor: "#fff",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {item ? `${item.supplier_code} · ${item.name}` : "Loading..."}
                  {item?.is_sub_qty && (
                    <Typography
                      component="span"
                      variant="caption"
                      color="primary"
                      fontWeight={600}
                      ml={1}
                    >
                      Sub qty
                    </Typography>
                  )}
                </Typography>
                {item && (
                  <Typography variant="caption" color="textSecondary">
                    {item.internal_item_uuid} {item.internal_item_name} ·{" "}
                    {item.pack_qty} {item.unit_name ?? "unit"} per pack at{" "}
                    {money(item.pack_price)}
                  </Typography>
                )}
              </Box>
              <IconButton
                size="small"
                color="error"
                onClick={() =>
                  setLines((prev) => prev.filter((_, i) => i !== index))
                }
              >
                <IconTrash size={16} />
              </IconButton>
            </Stack>
            {item && (
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mt={1}
              >
                <QtyInput
                  mode={item.is_sub_qty ? "packs+units" : "packs"}
                  packs={line.packs}
                  units={line.units}
                  packLabel={item.pack_unit_name ?? "pack"}
                  unitLabel={item.unit_name ?? "unit"}
                  onChange={(v) =>
                    setLines((prev) =>
                      prev.map((l, i) => (i === index ? { ...l, ...v } : l)),
                    )
                  }
                />
                <Box textAlign="right">
                  <Typography variant="body2" fontWeight={600}>
                    {money(lineTotal(line, item))}
                  </Typography>
                  {item.pack_qty > 1 && (
                    <Typography variant="caption" color="textSecondary">
                      = {base} {item.unit_name ?? "unit"}
                    </Typography>
                  )}
                </Box>
              </Stack>
            )}
          </Box>
        );
      })}

      {lines.length > 0 && (
        <Stack direction="row" justifyContent="space-between" px={0.5}>
          <Typography fontWeight={700}>Total</Typography>
          <Typography fontWeight={700}>{money(total)}</Typography>
        </Stack>
      )}
    </FormDrawer>
  );
};

export default PurchaseOrderDrawer;
