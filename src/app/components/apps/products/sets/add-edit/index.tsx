"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  TextField,
  Chip,
  Stack,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import Image from "next/image";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { IconSearch } from "@tabler/icons-react";

interface AddEditSetProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
  companyId?: number | null;
  setId?: number | null;
}

const PAGE_LIMIT = 20;

const toPickerProduct = (p: any) => ({
  id: Number(p.product_id ?? p.id),
  name: p.name ?? null,
  short_name: p.short_name ?? null,
  uuid: p.uuid ?? null,
  supplier_code: p.supplier_code ?? null,
  image_url: p.image_url ?? null,
});

const AddEditSet: React.FC<AddEditSetProps> = ({
  open,
  onClose,
  onWorkUpdated,
  companyId,
  setId,
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [setName, setSetName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loadedFromApi, setLoadedFromApi] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const selectedIdsRef = useRef<number[]>([]);
  const selectedProductsRef = useRef<Map<number, any>>(new Map());
  const fetchedCatalogIdsRef = useRef<Set<number>>(new Set());
  const debouncedSearchRef = useRef("");
  const fetchRequestIdRef = useRef(0);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    debouncedSearchRef.current = debouncedSearch;
  }, [debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const rememberSelectedProducts = (items: any[]) => {
    const idSet = new Set(selectedIdsRef.current);
    items.forEach((item) => {
      if (idSet.has(item.id)) {
        selectedProductsRef.current.set(item.id, item);
      }
    });
  };

  const getPinnedSelectedProducts = () => {
    const selectedById = new Map<number, any>();
    Array.from(selectedProductsRef.current.values()).forEach((item) => {
      if (selectedIdsRef.current.includes(item.id)) {
        selectedById.set(item.id, item);
      }
    });
    return Array.from(selectedById.values());
  };

  const applyPageProducts = (
    pageProducts: any[],
    currentPage: number,
    search: string,
  ) => {
    const isSearching = Boolean(search);

    setProducts((prev) => {
      // While searching: show only API matches. Keep selection state, do not pin.
      if (isSearching) {
        rememberSelectedProducts(pageProducts);
        if (currentPage === 1) {
          return pageProducts;
        }
        const existingIds = new Set(prev.map((item) => item.id));
        const appended = pageProducts.filter(
          (item: any) => !existingIds.has(item.id),
        );
        return [...prev, ...appended];
      }

      // No search: keep selected products visible (edit restore / cross-page selection)
      const pinnedSelected = getPinnedSelectedProducts();
      const pinnedIds = new Set(pinnedSelected.map((item) => item.id));

      if (currentPage === 1) {
        const newItems = pageProducts.filter(
          (item: any) => !pinnedIds.has(item.id),
        );
        const merged = [...pinnedSelected, ...newItems];
        rememberSelectedProducts(merged);
        return merged;
      }

      const existingIds = new Set(prev.map((item) => item.id));
      const appended = pageProducts.filter(
        (item: any) => !existingIds.has(item.id),
      );
      const merged = [...prev, ...appended];
      rememberSelectedProducts(merged);
      return merged;
    });
  };

  const fetchProjects = useCallback(
    async (currentPage: number, search: string) => {
      if (!companyId) return;
      const requestId = ++fetchRequestIdRef.current;
      setLoadingProducts(true);
      try {
        let url = `products/get-for-sets?company_id=${companyId}&is_products=true&page=${currentPage}&limit=${PAGE_LIMIT}`;
        if (search) {
          url += `&search=${encodeURIComponent(search)}`;
        }
        const res = await api.get(url);
        if (requestId !== fetchRequestIdRef.current) {
          return;
        }

        const newProducts = (res.data?.info || []).map(toPickerProduct);
        const total = res.data?.data?.totalItems || 0;
        setTotalItems(total);

        if (currentPage === 1) {
          fetchedCatalogIdsRef.current = new Set();
        }
        newProducts.forEach((item: any) => {
          fetchedCatalogIdsRef.current.add(item.id);
        });
        setLoadedFromApi(fetchedCatalogIdsRef.current.size);

        applyPageProducts(newProducts, currentPage, search);
      } catch (err) {
        if (requestId === fetchRequestIdRef.current) {
          console.error("Failed to fetch projects", err);
        }
      } finally {
        if (requestId === fetchRequestIdRef.current) {
          setLoadingProducts(false);
        }
      }
    },
    [companyId],
  );

  const fetchSetData = useCallback(async () => {
    if (!companyId || !setId) return;
    try {
      const res = await api.get(
        `products/get-sets?company_id=${companyId}&id=${setId}`,
      );
      const setData = res.data?.info?.[0];
      if (!setData) return;

      setSetName(setData.name);
      const pinned = (setData.products || []).map(toPickerProduct);
      const preSelected = pinned.map((p: any) => p.id);
      setSelectedIds(preSelected);
      selectedIdsRef.current = preSelected;
      selectedProductsRef.current = new Map(pinned.map((p: any) => [p.id, p]));

      // Only pin into the list when not actively searching
      if (!debouncedSearchRef.current) {
        setProducts((prev) => {
          const pinnedIds = new Set(preSelected);
          const rest = prev.filter((item) => !pinnedIds.has(item.id));
          return [...pinned, ...rest];
        });
      }
    } catch (err) {
      console.error("Failed to fetch set data", err);
    }
  }, [companyId, setId]);

  useEffect(() => {
    if (!open) {
      fetchRequestIdRef.current += 1;
      setSearchTerm("");
      setDebouncedSearch("");
      debouncedSearchRef.current = "";
      setProducts([]);
      setPage(1);
      setTotalItems(0);
      setLoadedFromApi(0);
      selectedProductsRef.current = new Map();
      fetchedCatalogIdsRef.current = new Set();
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !companyId) return;
    setPage(1);
    fetchProjects(1, debouncedSearch);
  }, [open, companyId, debouncedSearch, fetchProjects]);

  useEffect(() => {
    if (!open || !setId) return;
    fetchSetData();
  }, [open, setId, fetchSetData]);

  useEffect(() => {
    if (open && !setId) {
      setSelectedIds([]);
      selectedIdsRef.current = [];
      selectedProductsRef.current = new Map();
      setSetName("");
      setSelectAll(false);
    }
  }, [open, setId]);

  useEffect(() => {
    if (!products.length) {
      setSelectAll(false);
      return;
    }
    const visibleIds = products.map((p) => p.id);
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.includes(id));
    setSelectAll(allVisibleSelected);
  }, [products, selectedIds]);

  const handleCheckboxChange = (id: number) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      selectedIdsRef.current = next;
      if (!next.includes(id)) {
        selectedProductsRef.current.delete(id);
      } else {
        const product = products.find((p) => p.id === id);
        if (product) {
          selectedProductsRef.current.set(id, product);
        }
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const visibleIds = products.map((p) => p.id);
    if (selectAll) {
      setSelectedIds((prev) => {
        const visibleSet = new Set(visibleIds);
        const next = prev.filter((id) => !visibleSet.has(id));
        selectedIdsRef.current = next;
        visibleIds.forEach((id) => selectedProductsRef.current.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        products.forEach((p) => {
          next.add(p.id);
          selectedProductsRef.current.set(p.id, p);
        });
        const nextArr = Array.from(next);
        selectedIdsRef.current = nextArr;
        return nextArr;
      });
    }
  };

  const handleSeeMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProjects(nextPage, debouncedSearch);
  };

  const hasMore = loadedFromApi < totalItems;

  const handleSave = async () => {
    if (!companyId) return;

    if (!setName.trim()) {
      toast.error("Set name is required");
      return;
    }

    if (selectedIds.length === 0) {
      toast.error("Please select at least one project");
      return;
    }

    setIsSaving(true);

    try {
      const payload: any = {
        company_id: companyId,
        name: setName,
        product_ids: selectedIds.join(","),
      };
      if (setId) payload.id = setId;

      const res = await api.post("products/manage-set", payload);

      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        onWorkUpdated?.();
        onClose();
        setSelectedIds([]);
        setSetName("");
      } else {
        toast.error(res.data?.message || "Failed to save set");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save set");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 550,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 550,
          padding: 2,
          backgroundColor: "#f9f9f9",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box sx={{ flex: 1, overflowY: "auto", paddingRight: 1 }}>
        <Box mb={2} display="flex" alignItems="center" gap={1}>
          <IconButton onClick={onClose}>
            <IconArrowLeft />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            {setId ? "Edit Product Set" : "Create Product Set"}
          </Typography>
        </Box>

        <Box mb={2}>
          <TextField
            label="Set Name"
            fullWidth
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
          />
        </Box>

        <Box
          display={"flex"}
          alignContent={"space-between"}
          alignItems={"center"}
          gap={2}
        >
          <TextField
            id="search"
            type="text"
            size="small"
            variant="outlined"
            placeholder="Search..."
            value={searchTerm}
            fullWidth
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconSearch size={"16"} />
                  </InputAdornment>
                ),
              },
            }}
          />
          {products.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleSelectAll}
              sx={{ width: "30%" }}
            >
              {selectAll ? "Deselect All" : "Select All"}
            </Button>
          )}
        </Box>

        {loadingProducts && products.length === 0 ? (
          <Box display="flex" justifyContent="center" mt={5}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {products.map((product) => (
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
                }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <CustomCheckbox
                    checked={selectedIds.includes(product.id)}
                    onChange={() => handleCheckboxChange(product.id)}
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
                      alt={"product"}
                      width={50}
                      height={50}
                      style={{ objectFit: "contain" }}
                    />
                  </Box>
                  <Stack mt={2} spacing={1}>
                    <Typography variant="body2" component="div">
                      {product.short_name ?? product.name}{" "}
                      <Chip label={product.uuid} size="small" sx={{ ml: 1 }} />
                    </Typography>
                    <Typography variant="body2">
                      Supplier Code: {product.supplier_code}
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            ))}

            {!loadingProducts && products.length === 0 && (
              <Typography textAlign="center" mt={3} color="text.secondary">
                No products found.
              </Typography>
            )}

            {hasMore && (
              <Box display="flex" justifyContent="center" my={2}>
                <Button
                  variant="outlined"
                  disabled={loadingProducts}
                  onClick={handleSeeMore}
                  startIcon={
                    loadingProducts ? <CircularProgress size={16} /> : undefined
                  }
                >
                  See More
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>

      <Box mt={2} display="flex" gap={2}>
        <Button
          color="primary"
          variant="contained"
          sx={{ borderRadius: 3 }}
          className="drawer_buttons"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save"}
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

export default AddEditSet;
