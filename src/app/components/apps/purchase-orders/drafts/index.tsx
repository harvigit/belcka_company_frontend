"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Drawer,
  Box,
  Grid,
  IconButton,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Autocomplete,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Stack,
  TextField,
  Chip,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import api from "@/utils/axios";
import { IconCheck, IconTrash, IconX, IconPlus } from "@tabler/icons-react";
import toast from "react-hot-toast";
import Image from "next/image";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

interface DraftPurchaseOrderProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
  companyId?: number | null;
  onEditOrder?: (order: any) => void;
}

interface ProductRow {
  id: number;
  short_name: string;
  qty: number | string;
  price: number | string;
  line_total: number;
  image_url?: string | null;
  uuid: string;
  supplier_name: string | null;
  supplier_code: string | null;
  supplier_id?: number | null;
}

const TAX_PERCENT = 20;

const DraftPurchaseOrder: React.FC<DraftPurchaseOrderProps> = ({
  open,
  onClose,
  onWorkUpdated,
  companyId,
  onEditOrder,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    action: "create" | "delete";
  } | null>(null);

  // Edit drawer state
  const [editOpen, setEditOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<any>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [addProduct, setAddProduct] = useState<any | null>(null);
  const [addQty, setAddQty] = useState<string>("1");
  const [addPrice, setAddPrice] = useState<string>("");
  const [currency, setCurrency] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const fetchDrafts = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await api.get(
        `purchase-orders/get?company_id=${companyId}&is_draft=true`,
      );
      if (res.data) setData(res.data.info);
    } catch (err) {
      console.error("Failed to fetch drafts", err);
    }
  }, [companyId]);

  useEffect(() => {
    if (open) fetchDrafts();
  }, [open, fetchDrafts]);

  const fetchResources = useCallback(async () => {
    try {
      const res = await api.get(
        `get-inventory-resources?company_id=${companyId}`,
      );
      setAllProducts(res.data.products || []);
      setSuppliers(res.data.suppliers || []);
      setStores(res.data.stores || []);
    } catch (err) {
      console.error("Failed to fetch resources", err);
    }
  }, [companyId]);

  // Existing supplier IDs from current products
  const existingSupplierIds = useMemo(() => {
    const ids = products
      .map((p) => p.supplier_id)
      .filter((id): id is number => id != null && id !== undefined);
    return [...new Set(ids)];
  }, [products]);

  // Filter products available to add — must have same supplier as existing items
  const addableProducts = useMemo(() => {
    if (!allProducts.length) return [];
    const alreadyAdded = new Set(products.map((p) => p.id));
    return allProducts.filter((p) => {
      if (alreadyAdded.has(p.id)) return false;
      if (existingSupplierIds.length === 0) return true;
      return existingSupplierIds.includes(Number(p.supplier_id));
    });
  }, [allProducts, products, existingSupplierIds]);

  const openEditDrawer = useCallback(
    async (item: any) => {
      try {
        const res = await api.get(
          `purchase-orders/detail?company_id=${companyId}&id=${item.id}`,
        );
        const orderData = res.data?.info;
        if (!orderData) return;
        setEditOrder(orderData);

        const parseDateForInput = (dateStr: string) => {
          if (!dateStr) return "";
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
          const parts = dateStr.split(/[/-]/);
          if (parts.length === 3 && parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
          return dateStr;
        };

        setFormData({
          id: orderData.id,
          company_id: orderData.company_id,
          order_id: orderData.order_id,
          supplier_id: orderData.supplier_id,
          store_id: orderData.store_id,
          ref: orderData.ref ?? "",
          note: orderData.note ?? "",
          expected_delivery_date: parseDateForInput(
            orderData.expected_delivery_date ?? "",
          ),
          total_amount: orderData.total_amount,
          tax: orderData.tax,
          checked_product: false,
          is_draft: true,
        });

        const mappedProducts: ProductRow[] = (
          orderData.purchase_orders ?? []
        ).map((p: any) => ({
          id: p.product_id,
          short_name: p.short_name,
          qty: Number(p.qty) || 0,
          price: Number(p.price) || 0,
          line_total: (Number(p.qty) || 0) * (Number(p.price) || 0),
          image_url: p.image_url,
          uuid: p.uuid,
          supplier_name: p.supplier_name,
          supplier_code: p.supplier_code,
          supplier_id: p.supplier_id ? Number(p.supplier_id) : null,
        }));
        setProducts(mappedProducts);
        setCurrency(orderData.currency ?? "");
        setAddProduct(null);
        setAddQty("1");
        setAddPrice("");

        await fetchResources();
        setEditOpen(true);
      } catch (err) {
        console.error("Failed to open edit drawer", err);
      }
    },
    [companyId, fetchResources],
  );

  const unitTotal = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.line_total) || 0), 0),
    [products],
  );
  const taxAmount = useMemo(() => (unitTotal * TAX_PERCENT) / 100, [unitTotal]);
  const totalAmount = useMemo(
    () => unitTotal + taxAmount,
    [unitTotal, taxAmount],
  );

  // Sync product_data + totals into formData
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
  }, [products, taxAmount, totalAmount]);

  const removeProduct = (id: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddItem = () => {
    if (!addProduct) return;
    const qty = Number(addQty) || 1;
    const price = Number(addPrice) || Number(addProduct.price) || 0;
    // Supplier validation
    if (
      existingSupplierIds.length > 0 &&
      !existingSupplierIds.includes(Number(addProduct.supplier_id))
    ) {
      toast.error(
        "New item's supplier must match the existing items' supplier.",
      );
      return;
    }
    setProducts((prev) => [
      ...prev,
      {
        id: addProduct.id,
        short_name: addProduct.short_name,
        qty,
        price,
        line_total: qty * price,
        image_url: addProduct.image_url,
        uuid: addProduct.uuid,
        supplier_name: addProduct.supplier_name,
        supplier_code: addProduct.supplier_code,
        supplier_id: addProduct.supplier_id
          ? Number(addProduct.supplier_id)
          : null,
      },
    ]);
    setAddProduct(null);
    setAddQty("1");
    setAddPrice("");
  };

  const handleSaveDraft = async (is_draft: boolean) => {
    setIsSaving(true);
    try {
      const submissionData = { ...formData, is_draft };
      const result = await api.post("purchase-orders/update", submissionData);

      if (result.data.IsSuccess) {
        toast.success(is_draft ? "Draft updated!" : result.data.message);
        setEditOpen(false);
        fetchDrafts();
        onWorkUpdated?.();
        if (!is_draft) onClose?.();
      }
    } catch (err: any) {
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedItem) return;
    try {
      if (selectedItem.action === "create") {
        const res = await api.get(
          `purchase-orders/detail?company_id=${companyId}&id=${selectedItem.id}`,
        );
        const orderData = res.data?.info;
        if (orderData) {
          setOpenDialog(false);
          onEditOrder?.(orderData);
          onClose?.();
        }
      } else if (selectedItem.action === "delete") {
        const response = await api.post("purchase-orders/delete", {
          id: selectedItem.id,
        });
        if (response.data.IsSuccess) {
          toast.success(response.data.message);
          setOpenDialog(false);
          fetchDrafts();
          onWorkUpdated?.();
        }
      }
    } catch (err) {
      console.error("Action failed", err);
    }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
          width: 420,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 420,
            padding: 2,
            backgroundColor: "#f9f9f9",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box sx={{ flex: 1, overflowY: "auto", paddingRight: 1 }}>
          <Box className="task-form">
            <Grid container>
              <Grid size={{ xs: 12 }}>
                <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
                  <IconButton onClick={onClose}>
                    <IconArrowLeft />
                  </IconButton>
                  <Typography variant="h6" color="inherit" fontWeight={700}>
                    Draft Purchase Orders
                  </Typography>
                </Box>

                {data.map((item, index) => (
                  <Box
                    key={index}
                    mt={2}
                    p={2}
                    position="relative"
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    onClick={() => openEditDrawer(item)}
                    sx={{
                      border: "1px solid #999999",
                      borderRadius: "15px",
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "#f0f4ff",
                        borderColor: "#1976d2",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      width="100%"
                    >
                      <Box display="flex" flexDirection="column" gap={0.5}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            Order ID:
                          </Typography>
                          <Typography
                            color="textSecondary"
                            variant="body1"
                            fontWeight={600}
                            className="f-14"
                            sx={{
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              lineHeight: 1.25,
                              maxWidth: 180,
                              wordBreak: "break-word",
                            }}
                          >
                            {item.order_id ?? ""}
                          </Typography>
                        </Box>
                        {item.ref && (
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2" fontWeight={500}>
                              Ref:
                            </Typography>
                            <Typography color="textSecondary" variant="body2">
                              {item.ref}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      <Box
                        display="flex"
                        fontSize="10px"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* <Tooltip title="Create Order">
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem({
                                id: item.id,
                                action: "create",
                              });
                              setOpenDialog(true);
                            }}
                          >
                            <IconCheck size={18} />
                          </IconButton>
                        </Tooltip> */}
                        <Tooltip title="Delete Draft">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem({
                                id: item.id,
                                action: "delete",
                              });
                              setOpenDialog(true);
                            }}
                          >
                            <IconTrash size={18} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Box>
                ))}

                {data.length === 0 && (
                  <Box mt={4} textAlign="center">
                    <Typography color="textSecondary">
                      No drafts found.
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        </Box>

        <Box mt={2}>
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

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>
            {selectedItem?.action === "create"
              ? "Create Order"
              : "Confirm Deletion"}
          </DialogTitle>
          <DialogContent>
            <Typography color="textSecondary">
              Are you sure you want to{" "}
              <strong>
                {selectedItem?.action === "create" ? "create" : "delete"}
              </strong>{" "}
              this draft order?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setOpenDialog(false)}
              variant="outlined"
              color="primary"
            >
              Cancel
            </Button>
            <Button
              color={selectedItem?.action === "create" ? "primary" : "error"}
              variant="contained"
              onClick={() => {
                handleConfirmAction();
                setOpenDialog(false);
              }}
            >
              {selectedItem?.action === "create" ? "Proceed" : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </Drawer>

      {/* Edit Draft Drawer */}
      <Drawer
        anchor="bottom"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 0,
            height: "97vh",
            boxShadow: "none",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            overflow: "hidden",
          },
        }}
      >
        <Box
          p={2}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={() => setEditOpen(false)}>
              <IconArrowLeft />
            </IconButton>
            <Typography variant="h6" fontWeight={600}>
              Edit Draft Order
            </Typography>
          </Box>
          <IconButton onClick={() => setEditOpen(false)}>
            <IconX />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", px: 4, pb: 2 }}>
          {/* Row 1: Order ID | Expected Delivery Date | Ref */}
          <Grid container spacing={2} mb={2} alignItems="flex-end">
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box className="form_inputs">
                <Typography variant="body2" gutterBottom>
                  Order ID
                </Typography>
                <CustomTextField
                  fullWidth
                  value={formData.order_id ?? ""}
                  onChange={(e: any) =>
                    setFormData((p: any) => ({
                      ...p,
                      order_id: e.target.value,
                    }))
                  }
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box className="form_inputs">
                <Typography variant="body2" gutterBottom>
                  Expected Delivery Date
                </Typography>
                <CustomTextField
                  type="date"
                  fullWidth
                  value={formData.expected_delivery_date ?? ""}
                  onChange={(e: any) =>
                    setFormData((p: any) => ({
                      ...p,
                      expected_delivery_date: e.target.value,
                    }))
                  }
                  onFocus={(e: any) => e.target.showPicker?.()}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box className="form_inputs">
                <Typography variant="body2" gutterBottom>
                  Ref
                </Typography>
                <CustomTextField
                  fullWidth
                  value={formData.ref ?? ""}
                  inputProps={{ maxLength: 50 }}
                  onChange={(e: any) =>
                    setFormData((p: any) => ({ ...p, ref: e.target.value }))
                  }
                />
              </Box>
            </Grid>
          </Grid>

          {/* Row 2: Store | Note */}
          <Grid container spacing={2} mb={2} alignItems="flex-start">
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box className="form_inputs">
                <Typography variant="body2" gutterBottom>
                  Store
                </Typography>
                <Autocomplete
                  fullWidth
                  options={stores}
                  value={stores.find((s) => s.id === formData.store_id) || null}
                  onChange={(_, v) =>
                    setFormData((p: any) => ({
                      ...p,
                      store_id: v ? v.id : null,
                    }))
                  }
                  getOptionLabel={(o) => o.name}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Select Store" />
                  )}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box className="form_inputs">
                <Typography variant="body2" gutterBottom>
                  Note
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  inputProps={{ maxLength: 50 }}
                  value={formData.note ?? ""}
                  onChange={(e) =>
                    setFormData((p: any) => ({ ...p, note: e.target.value }))
                  }
                />
              </Box>
            </Grid>
          </Grid>

          {/* Add item section */}
          <Box
            p={2}
            mb={2}
            sx={{
              border: "1px dashed #1976d2",
              borderRadius: 2,
              backgroundColor: "#f0f7ff",
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={600}
              mb={1}
              color="primary"
            >
              Add Item (Only showing products from the same supplier)
            </Typography>
            <Stack
              direction="row"
              gap={1}
              alignItems="flex-end"
              flexWrap="wrap"
            >
              <Box flex={2} minWidth={200}>
                <Typography variant="caption" gutterBottom>
                  Product
                </Typography>
                <Autocomplete
                  options={addableProducts}
                  filterOptions={(options, { inputValue }) => {
                    const search = inputValue.toLowerCase().trim();

                    return options.filter((option) =>
                      [
                        option.uuid,
                        option.name,
                        option.short_name,
                        option.supplier_code,
                        option.supplier_name,
                      ]
                        .filter(Boolean)
                        .some((field) =>
                          String(field).toLowerCase().includes(search),
                        ),
                    );
                  }}
                  value={addProduct}
                  onChange={(_, v) => {
                    setAddProduct(v);
                    setAddPrice(v ? String(v.price ?? "") : "");
                  }}
                  getOptionLabel={(o) => o.short_name || ""}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      size="small"
                      placeholder="Search product..."
                    />
                  )}
                />
              </Box>
              <Box width={80}>
                <Typography variant="caption" gutterBottom>
                  Qty
                </Typography>
                <CustomTextField
                  size="small"
                  type="text"
                  inputMode="numeric"
                  value={addQty}
                  onChange={(e: any) => {
                    if (!/^\d*$/.test(e.target.value)) return;
                    setAddQty(e.target.value);
                  }}
                />
              </Box>
              <Box width={90}>
                <Typography variant="caption" gutterBottom>
                  Price
                </Typography>
                <CustomTextField
                  size="small"
                  type="text"
                  inputMode="decimal"
                  value={addPrice}
                  onChange={(e: any) => {
                    if (!/^\d*\.?\d{0,2}$/.test(e.target.value)) return;
                    setAddPrice(e.target.value);
                  }}
                />
              </Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<IconPlus size={16} />}
                onClick={handleAddItem}
                disabled={!addProduct}
                sx={{ borderRadius: 2, height: 40 }}
              >
                Add
              </Button>
            </Stack>
          </Box>

          {/* Products table */}
          <TableContainer
            sx={{ border: 1, borderColor: "#eee", borderRadius: 2, mb: 2 }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ITEM</TableCell>
                  <TableCell>SUPPLIER</TableCell>
                  <TableCell>QTY</TableCell>
                  <TableCell>PRICE ({currency})</TableCell>
                  <TableCell>LINE TOTAL</TableCell>
                  <TableCell>REMOVE</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Image
                          src={row.image_url || "/images/products/product.svg"}
                          alt="product"
                          width={40}
                          height={40}
                        />
                        <Stack spacing={0.5}>
                          <Typography variant="body2">
                            {row.short_name}{" "}
                            <Chip
                              label={row.uuid}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Code: {row.supplier_code}
                          </Typography>
                        </Stack>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {row.supplier_name ?? "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <CustomTextField
                        size="small"
                        type="text"
                        inputMode="numeric"
                        value={row.qty}
                        sx={{ width: 80 }}
                        onChange={(e: any) => {
                          const val = e.target.value;
                          if (!/^\d*\.?\d*$/.test(val)) return;
                          setProducts((prev) =>
                            prev.map((p) =>
                              p.id === row.id
                                ? {
                                    ...p,
                                    qty: val,
                                    line_total:
                                      (Number(p.price) || 0) *
                                      (Number(val) || 0),
                                  }
                                : p,
                            ),
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={row.price}
                        sx={{ width: 90 }}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!/^\d*\.?\d{0,2}$/.test(val)) return;
                          setProducts((prev) =>
                            prev.map((p) =>
                              p.id === row.id
                                ? {
                                    ...p,
                                    price: val,
                                    line_total:
                                      (Number(val) || 0) * (Number(p.qty) || 0),
                                  }
                                : p,
                            ),
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {currency}
                      {Number(row.line_total || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => removeProduct(row.id)}
                      >
                        <IconTrash size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="textSecondary" variant="body2">
                        No items added yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Totals */}
          <Box display="flex" justifyContent="flex-end">
            <Box width={280}>
              <Stack spacing={1.5}>
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

        {/* Checkbox */}
        <Box display="flex" alignItems="center" pl={5}>
          <CustomCheckbox
            checked={formData.checked_product || false}
            onChange={(e: any) =>
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

        {/* Action buttons */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
            p: 2,
            mt: "auto",
          }}
        >
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              color="primary"
              variant="contained"
              size="large"
              onClick={() => handleSaveDraft(false)}
              disabled={isSaving}
              sx={{ borderRadius: 3, minWidth: 120 }}
            >
              {isSaving ? "Saving..." : "Create Order"}
            </Button>
            <Button
              color="inherit"
              variant="contained"
              size="large"
              onClick={() => setEditOpen(false)}
              sx={{
                backgroundColor: "transparent",
                borderRadius: 3,
                color: "GrayText",
              }}
            >
              Close
            </Button>
          </Box>
          <Button
            color="primary"
            variant="contained"
            size="large"
            onClick={() => handleSaveDraft(true)}
            disabled={isSaving}
            sx={{ borderRadius: 3 }}
          >
            {isSaving ? "Saving..." : "Update Draft"}
          </Button>
        </Box>
      </Drawer>
    </>
  );
};

export default DraftPurchaseOrder;
