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
import { packsText, splitQty } from "../shared/orderUtils";

interface IssuableItem {
  internal_item_id: number;
  code: string;
  name: string;
  unit_name: string | null;
  is_sub_qty: boolean;
  issue_pack_qty: number | null;
  issue_pack_unit_name: string | null;
  on_hand: number;
  base_price: number | null;
}

interface Line {
  internal_item_id: number;
  packs: string;
  units: string;
}

interface InternalOrderDrawerProps {
  open: boolean;
  order: any | null;
  companyId?: number | null;
  options: InventoryOptions;
  onClose: () => void;
  onSaved: () => void;
}

const isSub = (i?: IssuableItem) =>
  !!i?.is_sub_qty && (i?.issue_pack_qty ?? 0) > 1;

const InternalOrderDrawer: React.FC<InternalOrderDrawerProps> = ({
  open,
  order,
  companyId,
  options,
  onClose,
  onSaved,
}) => {
  const [storeId, setStoreId] = useState<number | "">("");
  const [projectId, setProjectId] = useState<number | "">("");
  const [requestedFor, setRequestedFor] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [items, setItems] = useState<IssuableItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStoreId(order?.store_id ?? "");
    setProjectId(order?.project_id ?? "");
    setRequestedFor(order?.requested_for ?? "");
    setNote(order?.note ?? "");
    setLines(
      (order?.lines ?? []).map((l: any) => {
        const q =
          l.is_sub_qty && l.issue_pack_qty > 1
            ? splitQty(l.base_qty, l.issue_pack_qty)
            : { packs: 0, units: l.base_qty };
        return {
          internal_item_id: l.internal_item_id,
          packs: q.packs ? String(q.packs) : "",
          units: q.units ? String(q.units) : "",
        };
      }),
    );
  }, [open, order]);

  useEffect(() => {
    if (!open || !companyId || !storeId) {
      setItems([]);
      return;
    }
    api
      .get(
        `inventory-new/internal-orders/issuable-items?company_id=${companyId}&store_id=${storeId}`,
      )
      .then((res) => setItems(res.data?.info ?? []))
      .catch(() => setItems([]));
  }, [open, companyId, storeId]);

  const itemById = useMemo(
    () => new Map(items.map((i) => [i.internal_item_id, i])),
    [items],
  );
  const lineBase = (line: Line, item?: IssuableItem) =>
    item
      ? (isSub(item)
          ? Number(line.packs || 0) * (item.issue_pack_qty ?? 1)
          : 0) + Number(line.units || 0)
      : 0;
  const lineValue = (line: Line, item?: IssuableItem) =>
    lineBase(line, item) * (item?.base_price ?? 0);
  const total = lines.reduce(
    (t, l) => t + lineValue(l, itemById.get(l.internal_item_id)),
    0,
  );

  const submit = async (issue: boolean) => {
    if (!storeId) {
      toast.error("Please select a store!");
      return;
    }
    if (!lines.length) {
      toast.error("Add at least one item to the order!");
      return;
    }
    if (issue) {
      const short = lines.find((l) => {
        const item = itemById.get(l.internal_item_id);
        return item && lineBase(l, item) > item.on_hand;
      });
      if (short) {
        const item = itemById.get(short.internal_item_id)!;
        toast.error(
          `${item.name}: only ${packsText(item.on_hand, item.issue_pack_qty, item.unit_name, item.issue_pack_unit_name)} in stock!`,
        );
        return;
      }
    }
    setIsSaving(true);
    try {
      const payload = {
        ...(order?.id && { id: order.id }),
        company_id: companyId,
        store_id: storeId,
        project_id: projectId || null,
        requested_for: requestedFor || null,
        note,
        issue,
        lines: lines.map((l) => ({
          internal_item_id: l.internal_item_id,
          qty_packs: Number(l.packs || 0),
          qty_units: Number(l.units || 0),
        })),
      };
      const result = await api.post(
        order?.id
          ? "inventory-new/internal-orders/update"
          : "inventory-new/internal-orders/create",
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

  const available = items.filter(
    (i) => !lines.some((l) => l.internal_item_id === i.internal_item_id),
  );

  return (
    <FormDrawer
      open={open}
      width={640}
      title={order?.id ? `Edit ${order.order_number}` : "Add Internal Order"}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      isSaving={isSaving}
      submitLabel="Save draft"
      secondaryAction={{ label: "Save & issue", onClick: () => submit(true) }}
    >
      <FormField label="Issue from store">
        <CustomTextField
          select
          value={storeId}
          onChange={(e: any) => {
            setStoreId(e.target.value);
            setLines([]);
          }}
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

      <Stack direction="row" spacing={2}>
        <Box flex={1}>
          <FormField label="Project">
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
        </Box>
        <Box flex={1}>
          <FormField label="For">
            <Autocomplete
              size="small"
              options={options.users}
              value={options.users.find((u) => u.id === requestedFor) ?? null}
              onChange={(_, value) => setRequestedFor(value?.id ?? "")}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => (
                <CustomTextField {...params} placeholder="Select person..." />
              )}
            />
          </FormField>
        </Box>
      </Stack>

      <FormField label="Note">
        <CustomTextField
          placeholder="Note..."
          value={note}
          onChange={(e: any) => setNote(e.target.value)}
          fullWidth
        />
      </FormField>

      <Divider />
      <Typography variant="subtitle2" fontWeight={700}>
        Items
      </Typography>
      {storeId ? (
        <Autocomplete
          size="small"
          options={available}
          value={null}
          onChange={(_, value) => {
            if (value)
              setLines((prev) => [
                ...prev,
                {
                  internal_item_id: value.internal_item_id,
                  packs: "",
                  units: "",
                },
              ]);
          }}
          getOptionLabel={(o) => `${o.code} · ${o.name}`}
          getOptionDisabled={(o) => o.on_hand <= 0}
          renderOption={(props, o) => (
            <li {...props} key={o.internal_item_id}>
              <Box>
                <Typography variant="body2">
                  {o.code} · {o.name}
                </Typography>
                <Typography
                  variant="caption"
                  color={o.on_hand > 0 ? "textSecondary" : "error"}
                >
                  {packsText(
                    o.on_hand,
                    o.issue_pack_qty,
                    o.unit_name,
                    o.issue_pack_unit_name,
                  )}{" "}
                  in stock · base{" "}
                  {o.base_price === null ? "-" : `£${o.base_price.toFixed(4)}`}
                </Typography>
              </Box>
            </li>
          )}
          noOptionsText="No more items: only items approved for this store"
          renderInput={(params) => (
            <CustomTextField {...params} placeholder="Add item..." />
          )}
        />
      ) : (
        <Alert severity="info">Select a store to add items.</Alert>
      )}

      {lines.map((line, index) => {
        const item = itemById.get(line.internal_item_id);
        const base = lineBase(line, item);
        const short = item && base > item.on_hand;
        return (
          <Box
            key={line.internal_item_id}
            sx={{
              border: "1px solid",
              borderColor: short ? "error.light" : "#eef2f7",
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
                  {item ? `${item.code} · ${item.name}` : "Loading..."}
                </Typography>
                {item && (
                  <Typography
                    variant="caption"
                    color={short ? "error" : "textSecondary"}
                  >
                    {packsText(
                      item.on_hand,
                      item.issue_pack_qty,
                      item.unit_name,
                      item.issue_pack_unit_name,
                    )}{" "}
                    in stock
                    {isSub(item) &&
                      ` · 1 ${item.issue_pack_unit_name ?? "pack"} = ${item.issue_pack_qty} ${item.unit_name ?? "unit"}`}
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
                  mode={isSub(item) ? "packs+units" : "units"}
                  packs={line.packs}
                  units={line.units}
                  packLabel={item.issue_pack_unit_name ?? "pack"}
                  unitLabel={item.unit_name ?? "unit"}
                  onChange={(v) =>
                    setLines((prev) =>
                      prev.map((l, i) => (i === index ? { ...l, ...v } : l)),
                    )
                  }
                />
                <Box textAlign="right">
                  <Typography variant="body2" fontWeight={600}>
                    {money(lineValue(line, item))}
                  </Typography>
                  {isSub(item) && (
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
          <Box>
            <Typography fontWeight={700}>Estimated value</Typography>
            <Typography variant="caption" color="textSecondary">
              Charged at the base price when it is issued
            </Typography>
          </Box>
          <Typography fontWeight={700}>{money(total)}</Typography>
        </Stack>
      )}
    </FormDrawer>
  );
};

export default InternalOrderDrawer;
