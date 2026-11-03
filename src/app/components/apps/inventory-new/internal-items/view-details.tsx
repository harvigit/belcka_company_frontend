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
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconArrowLeft,
  IconEdit,
  IconPlus,
  IconStarFilled,
  IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import { money, qty } from "../shared/useInventoryOptions";
import LinkedSupplierItemsTable from "../shared/LinkedSupplierItemsTable";

interface InternalItemDetailsProps {
  open: boolean;
  item: any | null;
  onClose: () => void;
  onEdit: (item: any) => void;
  onAddSupplierItem: (item: any) => void;
}

const APPROVAL_TEXT: Record<
  number,
  { label: string; color: string; bg: string }
> = {
  0: { label: "Waiting for admin", color: "warning.main", bg: "warning.light" },
  1: { label: "Approved", color: "success.main", bg: "success.light" },
  2: { label: "Rejected", color: "error.main", bg: "error.light" },
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <Box
    display="flex"
    alignItems="flex-start"
    gap={2}
    width="100%"
    sx={{
      minWidth: 0,
      flexWrap: { xs: "wrap", sm: "nowrap" },
    }}
  >
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{
        width: { xs: "100%", sm: 140 },
        minWidth: { sm: 140 },
        flexShrink: 0,
      }}
    >
      {label}
    </Typography>

    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        overflowWrap: "anywhere",
        wordBreak: "break-word",
      }}
    >
      {typeof value === "string" || typeof value === "number" ? (
        <Typography
          variant="body2"
          fontWeight={500}
          sx={{
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            lineHeight: 1.6,
          }}
        >
          {value}
        </Typography>
      ) : (
        value
      )}
    </Box>
  </Box>
);

// Internal item details with the supplier items linked to it and the stores it is approved for.
const InternalItemDetails: React.FC<InternalItemDetailsProps> = ({
  open,
  item,
  onClose,
  onEdit,
  onAddSupplierItem,
}) => {
  const supplierItems: any[] = item?.supplier_items ?? [];
  const storeItems: any[] = item?.store_items ?? [];
  const unit = item?.unit_name ?? "unit";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 600, md: 680 },
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
              Internal Item Details
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {item && (
              <Button
                variant="contained"
                size="small"
                startIcon={<IconEdit size={16} />}
                onClick={() => onEdit(item)}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
              >
                Edit
              </Button>
            )}
            <IconButton onClick={onClose}>
              <IconX />
            </IconButton>
          </Box>
        </Box>

        {item && (
          <Box flex={1} overflow="auto" sx={{ pr: 1, mt: 1 }}>
            <Typography
              variant="body2"
              sx={{
                bgcolor: item.status ? "success.light" : "grey.200",
                color: item.status ? "success.main" : "text.secondary",
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                display: "inline-block",
                fontWeight: 600,
                mb: 2,
              }}
            >
              {item.status ? "Active" : "Inactive"}
            </Typography>

            {item.image_url && (
              <Box
                mb={2}
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: 1,
                  overflow: "hidden",
                  border: "1px solid #eef2f7",
                }}
              >
                <Image
                  src={item.image_url}
                  alt={item.name ?? "Internal item"}
                  width={120}
                  height={120}
                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                />
              </Box>
            )}
            <Stack spacing={1.5} mb={3}>
              <DetailRow label="Code" value={item.code} />
              <DetailRow label="Name" value={item.name} />
              <DetailRow label="Category" value={item.category_name ?? "-"} />
              <DetailRow
                label="Inventory 1 product"
                value={
                  item.legacy_product_id
                    ? `${item.legacy_product_uuid} · ${item.legacy_product_name}`
                    : "-"
                }
              />
              <DetailRow
                label="Base price"
                value={
                  item.base_price === null || item.base_price === undefined
                    ? "-"
                    : `£${Number(item.base_price).toFixed(4)}`
                }
              />
              <DetailRow label="Base unit" value={item.unit_name ?? "-"} />
              <DetailRow
                label="Market price"
                value={money(item.market_price)}
              />
              <DetailRow
                label="Sub qty"
                value={
                  item.is_sub_qty
                    ? `Yes · 1 ${item.issue_pack_unit_name ?? "pack"} = ${item.issue_pack_qty} ${unit}`
                    : "No"
                }
              />
              {item.description && (
                <DetailRow label="Description" value={item.description} />
              )}
            </Stack>

            <Divider />

            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mt={2}
              mb={1}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Supplier items ({supplierItems.length})
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<IconPlus size={16} />}
                onClick={() => onAddSupplierItem(item)}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Link supplier item
              </Button>
            </Box>
            {supplierItems.length === 0 ? (
              <Typography variant="body2" color="textSecondary" mb={3}>
                No supplier items are linked yet. Link one here or pick this
                internal item on a supplier item.
              </Typography>
            ) : (
              <Box mb={3}>
                <LinkedSupplierItemsTable items={supplierItems} unit={unit} />
              </Box>
            )}

            <Divider />

            <Typography variant="subtitle2" fontWeight={700} mt={2} mb={1}>
              Stores ({storeItems.length})
            </Typography>
            {storeItems.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Not on any store list yet. Add it from Store Items.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {storeItems.map((st) => {
                  const status =
                    APPROVAL_TEXT[st.approval_status] ?? APPROVAL_TEXT[0];
                  return (
                    <Box
                      key={st.id}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        border: "1px solid #eef2f7",
                        borderRadius: 1,
                        px: 1.5,
                        py: 1,
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {st.store_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Min {qty(st.min_qty)} · Max {qty(st.max_qty)} {unit}
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          bgcolor: status.bg,
                          color: status.color,
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          fontWeight: 600,
                        }}
                      >
                        {status.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default InternalItemDetails;
