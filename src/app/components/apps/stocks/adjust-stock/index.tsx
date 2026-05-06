"use client";

import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  IconClock,
  IconEdit,
  IconNotes,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import Image from "next/image";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { useSession } from "next-auth/react";
import Cookies from "js-cookie";
import { User } from "next-auth";

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: number | null;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  onChange: ({ id }: any) => void;
  onProductChange: ({ id }: any) => void;
  onUpdate: () => void;
  isSaving: boolean;
  editData?: any;
  is_product?: boolean;
}

const AdjustStock: React.FC<Props> = ({
  open,
  onClose,
  companyId,
  formData,
  setFormData,
  onUpdate,
  onChange,
  onProductChange,
  editData,
  is_product,
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [mode, setMode] = useState<"note" | "user">("note");
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState("");
  const [product, setProduct] = useState<any>([]);

  const [adjustQty, setAdjustQty] = useState<number | string>("");
  const [loading, setLoading] = useState(false);

  const [isSubQty, setIsSubQty] = useState(false);
  const [showAddPackField, setShowAddPackField] = useState(false);

  const [packOffUnit, setPackOffUnit] = useState("");
  const [packOffQty, setPackOffQty] = useState(1);
  const session = useSession();

  const user = session.data?.user as User & { company_id?: number | null };
  const storedStore = Cookies.get(`user_store_${user.id}_${user.company_id}`);

  const store = storedStore ? JSON.parse(storedStore) : null;
  const toggleMode = () => {
    setMode((prev) => (prev === "note" ? "user" : "note"));
  };

  const togglePackField = () => {
    setShowAddPackField((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    setProductId("");
    fetchResources();

    if (editData) {
      setFormData((prev: any) => ({
        ...prev,
        cutoff: editData.cutoff,
        user_id: null,
        note: "",
      }));

      setIsSubQty(editData.is_sub_qty);
      setPackOffQty(editData.pack_off_qty || 1);
      setPackOffUnit(editData.pack_off_unit || "");
    }
  }, [open]);

  const fetchProducts = async () => {
    try {
      const res = await api.get(
        `products/get?company_id=${companyId}&product_id=${productId}&is_products=true`,
      );
      if (res.data.info) {
        setProduct(res.data.info);
        setIsSubQty(res.data.info.is_sub_qty);
        setPackOffQty(res.data.info.pack_off_qty || 1);
        setPackOffUnit(res.data.info.pack_off_unit || "");
      }
    } catch (err) {
      console.error("Failed to fetch product", err);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProducts();
    }
  }, [productId]);
  const fetchResources = async () => {
    try {
      const res = await api.get(
        `get-inventory-resources?company_id=${companyId}`,
      );

      setUsers(res.data.users);
      setProducts(res.data.products);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (adjustQty === "" || adjustQty === null) return;

    const value = Number(adjustQty);

    if (isNaN(value)) return;

    let newValue = value;
    if (value > 10000) newValue = 10000;
    if (value < -10000) newValue = -10000;

    if (newValue !== value) {
      setAdjustQty(newValue);
    }
  }, [adjustQty]);

  const handleCutoff = async () => {
    try {
      const payload = {
        id: Number(editData?.id),
        cutoff: formData.cutoff,
      };

      const res = await api.post("products/update-cutoff", payload);

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        onUpdate?.();
        onClose?.();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const callHistory = (id: number) => {
    onChange?.(id);
  };

  const handleProductEdit = (id: number) => {
    onProductChange?.(id);
  };

  const submitStock = async (type: "add" | "deduct") => {
    if (!adjustQty) {
      toast.error("Quantity required!");
      return;
    }

    if (is_product && !productId) {
      toast.error("Please select product!");
      return;
    }

    try {
      setLoading(true);

      let qty = Number(adjustQty);

      if (type === "deduct") {
        qty = -Math.abs(qty);
      } else {
        qty = Math.abs(qty);
      }
      const payload: any = {
        store_id: Number(store?.id),
        product_id: is_product ? Number(productId) : editData?.product_id,
        qty: qty,
        reference: formData.note,
        user_id: formData.user_id,
        price: editData?.price,
        mode: "edit",
        is_sub_qty: isSubQty ? 1 : 0,
      };

      if (isSubQty) {
        payload.source = !showAddPackField ? "subQty" : "packSizeQty";
      }

      const res = await api.post("purchase-orders/edit-stock", payload);

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        onUpdate?.();
        onClose?.();
        setAdjustQty("");
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 500,
          borderRadius: 0,
          overflow: "hidden",
        },
      }}
    >
      <Box p={2} display="flex" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>

          <Typography variant="h6" fontWeight={600}>
            {is_product ? "Add Stock" : "Edit Stock"}
          </Typography>
        </Box>

        <Box display="flex" gap={1}>
          {editData && (
            <Box>
              <IconButton onClick={() => callHistory(editData.id)}>
                <IconClock size={18} />
              </IconButton>

              <IconButton onClick={() => handleProductEdit(editData.id)}>
                <IconEdit size={18} />
              </IconButton>
            </Box>
          )}

          <IconButton onClick={onClose}>
            <IconX />
          </IconButton>
        </Box>
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {!is_product && (
          <>
            <Box p={3} display="flex" justifyContent="space-between">
              <Box display="flex" gap={2}>
                <Image
                  src={editData?.image_url || "/images/products/product.svg"}
                  alt="product"
                  width={110}
                  height={110}
                />

                <Box>
                  <Typography fontWeight={700}>
                    {editData?.short_name}
                  </Typography>

                  <Typography fontSize={13}>
                    {editData?.supplier_code}
                  </Typography>

                  <Typography fontSize={13}>
                    {editData?.supplier_name}
                  </Typography>
                </Box>
              </Box>

              <Typography fontWeight="bold" variant="h3">
                {editData?.qty}
              </Typography>
            </Box>

            <Divider />
          </>
        )}

        {is_product && (
          <Box p={3}>
            <Typography variant="body2" fontWeight={600} mb={1}>
              Select Product
            </Typography>
            <Autocomplete
              fullWidth
              size="small"
              options={products}
              value={
                products.find((t: any) => t.id === Number(productId)) ?? null
              }
              onChange={(e, val) => setProductId(val?.id || "")}
              getOptionLabel={(option) => option.short_name ?? option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <CustomTextField {...params} placeholder="Select Product" />
              )}
            />
          </Box>
        )}

        {/* LOW STOCK */}
        <Box p={3}>
          <Typography variant="body2" fontWeight={600} mb={1}>
            Low Stock Indicator
          </Typography>

          <Box display="flex" gap={2} className="form_inputs">
            <TextField
              fullWidth
              value={formData.cutoff || ""}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  cutoff: e.target.value,
                }))
              }
            />

            <Button variant="outlined" onClick={handleCutoff}>
              Save
            </Button>
          </Box>
        </Box>

        <Divider />

        {/* NOTE / USER */}
        <Box p={3}>
          <Typography variant="body2" fontWeight={600} mb={1}>
            {mode === "note" ? "Note / Reference" : "Select User"}
          </Typography>

          <Box display="flex" gap={2} className="form_inputs">
            {mode === "note" ? (
              <TextField
                fullWidth
                value={formData.note || ""}
                onChange={(e) =>
                  setFormData((p: any) => ({
                    ...p,
                    note: e.target.value,
                  }))
                }
              />
            ) : (
              <Autocomplete
                fullWidth
                options={users}
                value={users.find((t) => t.id === formData.user_id) ?? null}
                onChange={(_, newValue) => {
                  setFormData((prev: any) => ({
                    ...prev,
                    user_id: newValue?.id ?? null, // handle null case
                  }));
                }}
                getOptionLabel={(option) => option.name || ""}
                renderInput={(params) => (
                  <CustomTextField {...params} placeholder="Select User" />
                )}
              />
            )}

            <Button variant="outlined" onClick={toggleMode}>
              {mode === "note" ? (
                <IconNotes size={18} />
              ) : (
                <IconUsers size={18} />
              )}
            </Button>
          </Box>
        </Box>

        <Divider />

        {/* STOCK ADJUST */}
        <Box p={3}>
          <Typography variant="body2" mb={2}>
            Adjust Stock
          </Typography>

          <Box display="flex" gap={2} alignContent={"center"}>
            <Button
              color="error"
              variant="outlined"
              onClick={() => submitStock("deduct")}
            >
              Deduct
            </Button>

            <Box className="input-with-unit">
              <TextField
                fullWidth
                id="packOffQty"
                type="text"
                placeholder="Quantity"
                value={adjustQty}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) {
                    setAdjustQty(val);
                  }
                }}
              />
              {!showAddPackField && packOffUnit && (
                <span className="unit">{packOffUnit}</span>
              )}
            </Box>
            <Button
              color="success"
              variant="outlined"
              onClick={() => submitStock("add")}
            >
              Add
            </Button>
          </Box>

          {isSubQty && packOffUnit && (
            <Box mt={2} display="flex" justifyContent="end">
              <Typography
                variant="caption"
                fontWeight={600}
                sx={{ cursor: "pointer", textAlign: "end" }}
                color="primary"
                onClick={togglePackField}
              >
                {showAddPackField ? "Deduct from Pack" : "Add a Pack"}
              </Typography>
            </Box>
          )}
        </Box>
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

export default AdjustStock;
