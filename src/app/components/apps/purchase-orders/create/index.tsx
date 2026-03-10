"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { IconX } from "@tabler/icons-react";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import Image from "next/image";

interface Product {
  id: number;
  short_name: string;
  price: number;
  image_url?: string | null;
  uuid: string;
  supplier_name: string | null;
  currency: string;
}

interface ProductRow {
  id: number;
  short_name: string;
  qty: number | string;
  price: number | string;
  line_total: number;
  checked: boolean;
  image_url?: string | null;
  uuid: string;
  supplier_name: String | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: number | null;

  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;

  handleSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  ids?: { id: number; qty: number; supplier_id: number }[];
  mode?: "create" | "edit";
  editData?: any;
}

const PurchaseOrder: React.FC<Props> = ({
  open,
  onClose,
  companyId,
  formData,
  setFormData,
  handleSubmit,
  ids,
  isSaving,
  mode = "create",
  editData,
}) => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [orderId, setOrderId] = useState<number>(0);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const TAX_PERCENT = 20;
  const [currency, setCurrency] = useState("");

  useEffect(() => {
    if (!ids || ids.length === 0 || allProducts.length === 0) return;
    const uniqueSupplierIds = [...new Set(ids.map((item) => item.supplier_id))];

    setFormData((prev: any) => ({
      ...prev,
      supplier_id: uniqueSupplierIds,
    }));
    const mappedProducts: ProductRow[] = ids
      .map((selected) => {
        const product = allProducts.find((p) => p.id === selected.id);
        const items = allProducts.filter((product) =>
          ids.some((x) => x.id === product.id),
        );

        setSelectedProducts(items);
        if (!product) return null;
        setCurrency(product.currency);

        return {
          id: product.id,
          short_name: product.short_name,
          price: product.price ?? "",
          qty: selected.qty,
          line_total: (Number(product.price) || 0) * selected.qty,
          checked: true,
          image_url: product.image_url,
          uuid: product.uuid,
          supplier_name: product.supplier_name,
        };
      })
      .filter(Boolean) as ProductRow[];

    setProducts(mappedProducts);
  }, [ids, allProducts]);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && editData) {
      fetchResources(true);

      setOrderId(editData.order_id);
      setCurrency(editData.currency);

      const supplierIdsFromPO = [
        ...new Set(editData.purchase_orders.map((po: any) => po.supplier_id)),
      ];

      setFormData((prev: any) => ({
        id: editData.id,
        company_id: editData.company_id,
        order_id: editData.order_id,
        supplier_id:
          supplierIdsFromPO.length > 0
            ? supplierIdsFromPO
            : Array.isArray(editData.supplier_id)
              ? editData.supplier_id
              : [editData.supplier_id || 0],
        store_id: editData.store_id,
        received_by: editData.received_by,
        note: editData.note,
        ref: editData.ref,
        date: editData.date,
        expected_delivery_date: editData.expected_delivery_date,
        total_amount: editData.total_amount,
        tax: editData.tax,
      }));

      // Map products for the table
      const mappedProducts: ProductRow[] = editData.purchase_orders.map(
        (p: any) => {
          const qty = Number(p.qty) || 0;
          const price = Number(p.price) || 0;

          return {
            id: p.product_id,
            short_name: p.short_name,
            qty,
            price,
            line_total: qty * price,
            checked: true,
            image_url: p.image_url,
            uuid: p.uuid,
            supplier_name: p.supplier_name,
          };
        },
      );

      setProducts(mappedProducts);

      // Select products from allProducts that match purchase_orders
      const selected = allProducts.filter((product) =>
        editData.purchase_orders.some(
          (po: any) => po.product_id === product.id,
        ),
      );

      setSelectedProducts(selected);
    } else {
      fetchResources(false);
      setProducts([]);
      setSelectedProducts([]);
    }
  }, [open, mode, editData]);

  const fetchResources = async (isEdit = false) => {
    const res = await api.get(
      `get-inventory-resources?company_id=${companyId}`,
    );

    setAllProducts(res.data.products || []);
    setUsers(res.data.users);
    setSuppliers(res.data.suppliers);
    setStores(res.data.stores);

    if (!isEdit) {
      setOrderId(res.data.orderId);
      setProducts([]);
    }
  };

  const updateProductData = useCallback((id: number, value: any) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              qty: value,
              line_total: (Number(item.price) || 0) * (Number(value) || 0),
            }
          : item,
      ),
    );
  }, []);
  const unitTotal = useMemo(() => {
    return products
      .filter((p) => p.checked)
      .reduce((sum, p) => sum + (Number(p.line_total) || 0), 0);
  }, [products]);

  const taxAmount = useMemo(() => {
    return (unitTotal * TAX_PERCENT) / 100;
  }, [unitTotal, TAX_PERCENT]);

  const totalAmount = useMemo(() => {
    return unitTotal + taxAmount;
  }, [unitTotal, taxAmount]);

  useEffect(() => {
    setFormData((prev: any) => ({
      ...prev,
      product_data: products.map((p) => ({
        product_id: p.id,
        qty: p.qty,
        price: p.price,
      })),
      tax: taxAmount.toFixed(2),
      total_amount: totalAmount.toFixed(2),
    }));
  }, [products, taxAmount, totalAmount, setFormData]);

  const columnHelper = createColumnHelper<ProductRow>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("short_name", {
        header: "ITEM",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Stack direction="row" alignItems="center" gap={2}>
              <Box>
                <Image
                  src={item.image_url || ""}
                  alt="product"
                  width={50}
                  height={50}
                />
              </Box>
              <Box>
                <Typography className="f-14">{item.short_name}</Typography>
                <Typography variant="caption">Code: {item.uuid}</Typography>
              </Box>
            </Stack>
          );
        },
      }),

      columnHelper.accessor("supplier_name", {
        header: "SUPPLIER",
        cell: (info) => (
          <Typography ml={1}>{info.getValue() ?? "-"}</Typography>
        ),
      }),

      columnHelper.accessor("qty", {
        header: "QTY",
        cell: ({ row }) => (
          <CustomTextField
            size="small"
            type="text"
            inputMode="numeric"
            value={row.original.qty ?? ""}
            sx={{ width: 100 }}
            onChange={(e: any) => {
              if (!/^\d*\.?\d*$/.test(e.target.value)) return;
              updateProductData(row.original.id, e.target.value);
            }}
          />
        ),
      }),

      columnHelper.accessor("price", {
        header: `PRICE(${currency})`,
        cell: ({ row }) => (
          <TextField
            size="small"
            value={row.original.price ?? ""}
            sx={{ width: 100 }}
            onChange={(e) => {
              const value = e.target.value;
              if (!/^\d*\.?\d*$/.test(value)) return;
              setProducts((prev) =>
                prev.map((item) =>
                  item.id === row.original.id
                    ? {
                        ...item,
                        price: value,
                        line_total:
                          (Number(value) || 0) * (Number(item.qty) || 0),
                      }
                    : item,
                ),
              );
            }}
          />
        ),
      }),

      columnHelper.accessor("line_total", {
        header: "LINE TOTAL",
        cell: (info) => `${currency}${Number(info.getValue() || 0).toFixed(2)}`,
      }),
    ],
    [currency],
  );
  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 0,
          height: "95vh",
          boxShadow: "none",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          overflow: "hidden",
        },
      }}
    >
      <Box
        p={2}
        display={"flex"}
        alignItems={"center"}
        justifyContent={"space-between"}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            {mode === "edit" ? "Edit Purchase Order" : "Add Purchase Order"}
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <IconX />
        </IconButton>
      </Box>
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          paddingRight: 1,
          px: 4,
        }}
      >
        <form
          className="task-form"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
        >
          <Box p={3} pt={0}>
            <Box display={"flex"} alignItems={"center"} gap={2}>
              <Box className="form_inputs">
                <Typography variant="body2" gutterBottom>
                  Order ID
                </Typography>
                <CustomTextField
                  name="name"
                  fullWidth
                  value={orderId}
                  onChange={(e: any) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      order_id: e.target.value,
                    }))
                  }
                />
              </Box>
              <Box className="form_inputs">
                <Typography variant="body2" gutterBottom>
                  Expected Delivery Date
                </Typography>
                <CustomTextField
                  id="expected_delivery_date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    min: formData.date || undefined,
                  }}
                  value={formData.expected_delivery_date || ""}
                  onChange={(e: any) =>
                    setFormData((p: any) => ({
                      ...p,
                      expected_delivery_date: e.target.value,
                    }))
                  }
                />
              </Box>
              <Box className="form_inputs">
                <Typography variant="body2" gutterBottom>
                  Ref
                </Typography>
                <CustomTextField
                  fullWidth
                  value={formData.ref}
                  onChange={(e: any) =>
                    setFormData((p: any) => ({
                      ...p,
                      ref: e.target.value,
                    }))
                  }
                />
              </Box>
            </Box>
            <Box display={"flex"} alignItems="center" gap={2} mb={2}>
              {/* <Box className="form_inputs">
                <Typography variant="body2" gutterBottom>
                  received By
                </Typography>
                <Autocomplete
                  fullWidth
                  options={users}
                  value={
                    users.find((p) => p.id === formData.received_by) || null
                  }
                  onChange={(event, newValue) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      received_by: newValue ? newValue.id : null,
                    }))
                  }
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      placeholder="Select Received By"
                    />
                  )}
                />
              </Box> */}
            </Box>

            <Box display={"flex"} alignItems={"flex-start"} gap={2} mb={2}>
              <Box className="form_inputs">
                <Typography variant="body2" gutterBottom>
                  Store
                </Typography>
                <Autocomplete
                  fullWidth
                  options={stores}
                  value={stores.find((p) => p.id === formData.store_id) || null}
                  onChange={(event, newValue) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      store_id: newValue ? newValue.id : null,
                    }))
                  }
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Select Store" />
                  )}
                />
              </Box>
              <Box className="form_inputs">
                <Typography variant="body2" gutterBottom>
                  Supplier
                </Typography>
                <Autocomplete
                  fullWidth
                  multiple
                  options={suppliers?.filter(
                    (supplier) =>
                      Array.isArray(formData.supplier_id) &&
                      formData.supplier_id.includes(supplier.id),
                  )}
                  value={suppliers?.filter(
                    (supplier) =>
                      Array.isArray(formData.supplier_id) &&
                      formData.supplier_id.includes(supplier.id),
                  )}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      // placeholder="Select Supplier"
                    />
                  )}
                />
              </Box>

              <Box className="form_inputs">
                <Typography variant="body2" gutterBottom>
                  Note
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  value={formData.note ?? null}
                  onChange={(e: any) =>
                    setFormData((p: any) => ({
                      ...p,
                      note: e.target.value,
                    }))
                  }
                />
              </Box>
            </Box>
            <TableContainer
              sx={{ border: 1, borderColor: "#eee", borderRadius: 2 }}
            >
              <Table>
                <TableHead>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => (
                        <TableCell key={h.id}>
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableHead>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} sx={{ p: 1 }}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box
              display={"flex"}
              justifyContent={"space-between"}
              alignItems={"end"}
              mt={2}
            >
              {/* CHECKBOX */}
              <Box display="flex" alignItems="center">
                <CustomCheckbox
                  checked={formData.checked_product || false}
                  onChange={(e) =>
                    setFormData((p: any) => ({
                      ...p,
                      checked_product: e.target.checked,
                    }))
                  }
                />
                <Typography>
                  Implement the rate adjustments for products in the catalogue
                </Typography>
              </Box>

              {/* TOTALS */}
              <Box mt={4} display="flex" justifyContent="flex-end">
                <Box width={300}>
                  <Stack spacing={2}>
                    <TextField
                      label="Unit Total"
                      value={`${currency}${unitTotal.toFixed(2)}`}
                      disabled
                    />
                    <TextField
                      label={`Tax (${TAX_PERCENT}%)`}
                      value={`${currency}${taxAmount.toFixed(2)}`}
                      disabled
                    />
                    <TextField
                      label="Total Amount"
                      value={`${currency}${totalAmount.toFixed(2)}`}
                      disabled
                    />
                  </Stack>
                </Box>
              </Box>
            </Box>
          </Box>
        </form>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "start",
          gap: 2,
          p: 2,
          mt: "auto",
        }}
      >
        <Button
          color="primary"
          variant="contained"
          size="large"
          type="submit"
          onClick={handleSubmit}
          disabled={isSaving}
          sx={{ borderRadius: 3, width: "8%" }}
        >
          {isSaving ? "Saving..." : mode === "edit" ? "Update" : "Save"}
        </Button>
        <Button
          color="inherit"
          onClick={onClose}
          variant="contained"
          size="large"
          sx={{
            backgroundColor: "transparent",
            borderRadius: 3,
            color: "GrayText",
          }}
        >
          Close
        </Button>
      </Box>
    </Drawer>
  );
};

export default PurchaseOrder;
