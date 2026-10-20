"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { IconSearch, IconX } from "@tabler/icons-react";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import Image from "next/image";
import { Grid } from "@mui/system";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

const PRODUCT_LIMIT = 50;

type FavoriteProductsDrawerProps = {
  open: boolean;
  projectId: number | null;
  companyId?: number | null;
  onClose: () => void;
};

const FavoriteProductsDrawer = ({
  open,
  projectId,
  companyId,
  onClose,
}: FavoriteProductsDrawerProps) => {
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isFetchingFavorites, setIsFetchingFavorites] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [productPage, setProductPage] = useState(1);

  const handleClose = () => {
    setSearchProduct("");
    setProductPage(1);
    onClose();
  };

  useEffect(() => {
    if (!open || !companyId) return;
    let cancelled = false;

    const loadProducts = async () => {
      try {
        const res = await api.get(
          `get-inventory-resources?company_id=${companyId}&is_web=true`,
        );
        if (!cancelled && res.data) {
          setProducts(res.data.products || []);
        }
      } catch (err) {
        console.error("Failed to fetch inventory resource", err);
      }
    };

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [open, companyId]);

  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;

    const loadFavorites = async () => {
      setIsFetchingFavorites(true);
      setSelectedProducts([]);
      try {
        const response = await api.get(
          `project/get-favorite?company_id=${companyId}&project_id=${projectId}`,
        );
        if (cancelled) return;
        if (response.data?.IsSuccess) {
          const savedIds =
            response.data?.info?.[0]?.products?.map(
              (item: any) => item.product_id,
            ) || [];
          setSelectedProducts(savedIds);
        }
      } catch (error) {
        console.error("Failed to fetch favorite products:", error);
      } finally {
        if (!cancelled) setIsFetchingFavorites(false);
      }
    };

    loadFavorites();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, companyId]);

  const handleSaveProducts = async () => {
    if (!projectId || isFetchingFavorites) return;
    try {
      setIsSaving(true);
      const response = await api.post("project/favorite-products", {
        id: projectId,
        product_ids: selectedProducts.join(","),
      });
      if (response.data.IsSuccess) {
        toast.success(response.data.message || "Favorites saved.");
        handleClose();
      } else {
        toast.error(response.data.message || "Failed to save favorites.");
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save favorites.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProductToggle = (id: number) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const filteredData = useMemo(() => {
    const search = searchProduct.toLowerCase();
    const result = products.filter((item) => {
      if (!search) return true;
      return (
        item.short_name?.toLowerCase().includes(search) ||
        item.supplier_code?.toLowerCase().includes(search) ||
        item.supplier_name?.toLowerCase().includes(search) ||
        item.uuid?.toLowerCase().includes(search) ||
        item.name?.toLowerCase().includes(search)
      );
    });

    result.sort((a, b) => {
      const aSelected = selectedProducts.includes(a.id);
      const bSelected = selectedProducts.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

    return result;
  }, [products, searchProduct, selectedProducts]);

  const paginatedProduct = filteredData.slice(0, productPage * PRODUCT_LIMIT);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          width: 550,
          maxWidth: "100%",
          "& .MuiDrawer-paper": {
            width: 550,
            padding: 2,
            backgroundColor: "#f9f9f9",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      <Box
        display="flex"
        alignContent="center"
        alignItems="center"
        flexWrap="wrap"
        p={2}
        pb={0}
      >
        <Box display="flex" alignContent="center" alignItems="center">
          <IconButton onClick={handleClose}>
            <IconArrowLeft />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            Favorite products{" "}
            {selectedProducts.length > 0 ? `(${selectedProducts.length})` : ""}
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          size="small"
          sx={{
            position: "absolute",
            right: 0,
            top: 8,
            color: (theme) => theme.palette.grey[900],
            backgroundColor: "transparent",
            zIndex: 10,
            width: 50,
            height: 50,
          }}
        >
          <IconX size={18} />
        </IconButton>
      </Box>

      <Grid display="flex" alignItems="center" mr={1}>
        <TextField
          id="favorite-product-search"
          type="text"
          size="small"
          variant="outlined"
          placeholder="Search..."
          value={searchProduct}
          fullWidth
          sx={{ width: "90%", ml: 2 }}
          onChange={(e) => setSearchProduct(e.target.value)}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconSearch size="16" />
                </InputAdornment>
              ),
            },
          }}
        />
        {products.length > 0 && (
          <FormControlLabel
            control={
              <CustomCheckbox
                checked={
                  filteredData.length > 0 &&
                  filteredData.every((product) =>
                    selectedProducts.includes(product.id),
                  )
                }
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  if (isChecked) {
                    setSelectedProducts((prev) => {
                      const next = [...prev];
                      filteredData.forEach((product) => {
                        if (!next.includes(product.id)) next.push(product.id);
                      });
                      return next;
                    });
                  } else {
                    const visibleIds = filteredData.map((product) => product.id);
                    setSelectedProducts((prev) =>
                      prev.filter((id) => !visibleIds.includes(id)),
                    );
                  }
                }}
              />
            }
            label="Select All"
            sx={{ width: "30%", m: 0 }}
          />
        )}
      </Grid>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        <Grid container spacing={2} display="block" mt={1}>
          {isFetchingFavorites ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              my={5}
            >
              <CircularProgress />
            </Box>
          ) : filteredData.length > 0 ? (
            <Box>
              {paginatedProduct.map((product) => (
                <Box
                  key={product.id}
                  mt={1}
                  p={1}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    border: "1px solid #e7e3e3ff",
                    borderRadius: "10px",
                    background: "#fff",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <CustomCheckbox
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleProductToggle(product.id)}
                    />
                    <Box
                      sx={{
                        border: "1px dashed #d1d5db",
                        borderRadius: 2,
                        p: 1,
                        textAlign: "center",
                      }}
                    >
                      <Image
                        src={product.image_url || "/images/products/product.svg"}
                        alt="product"
                        width={50}
                        height={50}
                        style={{ objectFit: "contain" }}
                      />
                    </Box>
                    <Stack mt={2} spacing={1}>
                      <Typography
                        variant="body2"
                        sx={{
                          minWidth: "150px",
                          width: "100%",
                          maxWidth: "500px",
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: 1.25,
                          wordBreak: "break-word",
                        }}
                      >
                        {product.short_name ?? product.name}{" "}
                        {product.uuid && (
                          <Chip label={product.uuid} size="small" sx={{ ml: 1 }} />
                        )}
                        <br />
                        Supplier Code: {product.supplier_code}
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
              ))}
              {paginatedProduct.length < filteredData.length && (
                <Box display="flex" justifyContent="center" my={2}>
                  <Button
                    variant="outlined"
                    onClick={() => setProductPage((prev) => prev + 1)}
                  >
                    See More
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            <Typography mt={2} textAlign="center">
              No products found
            </Typography>
          )}
        </Grid>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "start",
          gap: 2,
          m: 2,
          pl: 2,
        }}
      >
        <Button
          color="primary"
          onClick={handleSaveProducts}
          variant="contained"
          size="large"
          disabled={isSaving || isFetchingFavorites || !projectId}
          sx={{ borderRadius: 3 }}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button
          color="inherit"
          onClick={handleClose}
          variant="contained"
          size="large"
          sx={{
            backgroundColor: "transparent",
            borderRadius: 3,
            color: "GrayText",
          }}
        >
          Cancel
        </Button>
      </Box>
    </Drawer>
  );
};

export default FavoriteProductsDrawer;
