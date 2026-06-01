"use client";
import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  Avatar,
  Autocomplete,
  TextField,
  Fab,
  Dialog,
} from "@mui/material";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Grid, Stack } from "@mui/system";
import { IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useDropzone } from "react-dropzone";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import Image from "next/image";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import CreateCategory from "../../categories/create";
import toast from "react-hot-toast";
import CreateSupplier from "../../suppliers/create";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

export interface ProductFormData {
  id: number;
  company_id: any;
  uuid: string;
  short_name: string;
  name?: string;
  status?: boolean;
  description?: string;
  image?: File | null;
  supplier_code?: string;
  supplier_id?: number | null;
  barcode_text?: string;
  category_ids?: string;
  model_id?: number | null;
  manufacturer_id?: number | null;
  pack_off_qty?: string;
  pack_off_unit?: number | null;
  weight?: string;
  weight_unit?: number | null;
  length?: string;
  width?: string;
  height?: string;
  length_unit?: number | null;
  tax?: string;
  price?: string;
  market_price?: string;
  sort_id?: number | null;
  cutoff?: number;
  is_sub_qty?: boolean;
  store_ids?: string;
  remove_image?: boolean;
  max_stock?: number | null;
  manufacture?: number | null;
  model?: number | null;
  qty?: number | null;
}

interface Category {
  id: number;
  name: string;
}

interface ProductAddEditProps {
  open: boolean;
  companyId: number | null;
  onClose: () => void;
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  handleSubmit: (
    e: React.FormEvent,
    galleryFiles: File[],
    barcodes: string[],
    removedImageIds: number[],
  ) => void;
  isSaving: boolean;
  isEdit?: boolean;
  storeId?: number | null;
  productId?: number | null;
  isCategory?: boolean;
}

type GalleryImage = {
  id?: number;
  src: string;
  thumb?: string;
  isExisting?: boolean;
};

interface CategoryFormData {
  id: number;
  company_id: any;
  name: string;
  image?: File | null;
  parent_category_id?: number | null;
  parent_category_name?: string | null;
  status: boolean;
}
interface SupplierFormData {
  id: number;
  company_id: any;
  name: string;
  email?: string;
  company_name?: string;
  supplier_image?: File | null;
  account_number?: string;
  street?: string;
  location?: string;
  town?: string;
  postcode?: string;
  phone?: string;
  extension?: string;
  weight?: string;
  weight_unit?: string | null;
  status: boolean;
  contact_person_email?: string;
  contact_person_name?: string;
  contact_person_phone?: string;
  contact_person_extension?: string;
}

const ProductAddEdit: React.FC<ProductAddEditProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  isSaving,
  companyId,
  isEdit,
  storeId,
  productId,
  isCategory,
}) => {
  const [barcodes, setBarcodes] = useState<string[]>([""]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [weights, setWeights] = useState<any[]>([]);
  const [lengths, setLengths] = useState<any[]>([]);
  const [packOffs, setPackOffs] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [manufactures, setManufactures] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [fetchStore, setFetchStore] = useState<boolean>(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [mainPreview, setMainPreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreview, setGalleryPreview] = useState<GalleryImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [openSupplierModal, setOpenSupplierModal] = useState(false);
  const [product, setProduct] = useState<any>([]);
  const [totalQty, setTotalQty] = useState("");
  const [openPreview, setOpenPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [fetching, setFetching] = useState(false);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null } & {
    user_role_id: number;
  };

  const [supplierFormData, setSupplierFormData] = useState<SupplierFormData>({
    id: 0,
    company_id: companyId,
    name: "",
    status: true,
  });
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    id: 0,
    company_id: companyId,
    name: "",
    status: true,
  });

  const fetchProducts = async () => {
    if (!productId || fetching) return;

    setFetching(true);
    try {
      const res = await api.get(
        `products/get?company_id=${companyId}&product_id=${productId}&is_products=true&is_web=true`,
      );
      if (res.data) {
        setProduct(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch product", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (productId && open == true) {
      fetchProducts();
    }
  }, [open, productId]);

  useEffect(() => {
    if (open) {
      setFormData({
        id: 0,
        company_id: companyId,
        uuid: "",
        short_name: "",
        name: "",
        description: "",
        supplier_code: "",
        supplier_id: null,
        category_ids: "",
        model_id: null,
        manufacturer_id: null,
        pack_off_qty: "",
        pack_off_unit: null,
        weight: "",
        weight_unit: null,
        length: "",
        width: "",
        height: "",
        length_unit: null,
        tax: "",
        price: "",
        market_price: "",
        sort_id: 0,
        is_sub_qty: false,
        remove_image: false,
        max_stock: 0,
        model: null,
        manufacture: null,
        qty: 0,
      });
      setBarcodes([""]);
      setSelectedCategories([]);
      setMainPreview(null);
      setGalleryFiles([]);
      setGalleryPreview([]);
      setSelectedRowIds(new Set());
      fetchResources();
    }
  }, [open, companyId]);

  useEffect(() => {
    if (!open) return;

    if (isEdit && product) {
      setFormData({
        id: product.id,
        company_id: companyId,
        uuid: product.uuid ?? "",
        short_name: product.short_name ?? "",
        name: product.name ?? "",
        description: product.description ?? "",
        supplier_code: product.supplier_code ?? "",
        supplier_id: product.supplier_id ?? null,
        category_ids: product.category_ids ?? "",
        model_id: product?.model_id ?? null,
        manufacturer_id: product?.manufacturer_id ?? null,
        pack_off_qty: product.pack_off_qty ?? "",
        pack_off_unit: product.pack_off_unit ?? null,
        weight: product?.weight ?? "",
        weight_unit: product?.weight_unit ?? null,
        length: product?.length ?? "",
        width: product?.width ?? "",
        height: product?.height ?? "",
        length_unit: product?.length_unit ?? null,
        tax: product?.tax ?? "",
        price: product.price ?? "",
        market_price: product.market_price ?? "",
        sort_id: product.sort_id ?? 0,
        cutoff: product.cutoff ?? 0,
        is_sub_qty: Boolean(product.is_sub_qty),
        store_ids: product.store_ids ?? "",
        max_stock: product.max_stock ?? 0,
        model: product.model ?? null,
        manufacture: product.manufacture ?? null,
        qty: 0,
      });

      setBarcodes(
        product.barcode_text ? product.barcode_text.split(",") : [""],
      );

      if (product.category_ids) {
        const ids = product.category_ids.split(",").map(Number);
        setSelectedCategories(categories.filter((c) => ids.includes(c.id)));
      }

      if (product.store_ids) {
        const storeIds = product.store_ids.split(",").map(Number);
        setSelectedRowIds(new Set(storeIds));
      }

      if (product.image_url) {
        setMainPreview(product.image_url);
      }

      if (product.product_images?.length) {
        setGalleryPreview(
          product.product_images.map((img: any) => ({
            id: img.id,
            src: img.image_url,
            isExisting: true,
          })),
        );
        setGalleryFiles([]);
        setRemovedImageIds([]);
      }
    } else {
      setBarcodes([""]);
      setSelectedCategories([]);
      setSelectedRowIds(new Set());
      setMainPreview(null);
      setGalleryFiles([]);
      setGalleryPreview([]);
    }
  }, [open, isEdit, product, categories]);

  const handleRemoveGalleryImage = (item: GalleryImage, index: number) => {
    setGalleryPreview((prev) => prev.filter((_, i) => i !== index));

    if (item.isExisting && item.id) {
      setRemovedImageIds((prev: any) => [...prev, item.id]);
    } else {
      setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...categoryFormData,
      };

      const result = await api.post("categories/create", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setCategoryFormData({
          id: 0,
          name: "",
          status: true,
          company_id: companyId,
        });
        setOpenCategoryModal(false);
        fetchResources();
      } else {
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
    }
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...supplierFormData,
      };

      const result = await api.post("suppliers/create", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setSupplierFormData({
          id: 0,
          name: "",
          status: true,
          company_id: companyId,
          phone: "",
          contact_person_phone: "",
          contact_person_email: "",
          contact_person_name: "",
          email: "",
          postcode: "",
          street: "",
          location: "",
        });
        setOpenSupplierModal(false);
        fetchResources();
      } else {
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
    }
  };

  const fetchResources = async () => {
    setFetchStore(true);

    try {
      let url = `get-inventory-resources?company_id=${companyId}`;

      if (isCategory !== undefined) {
        url += `&is_tool_category=${isCategory}`;
      }

      if (isEdit && product) {
        url = `get-inventory-resources?company_id=${companyId}&product_id=${productId}`;
        if (isCategory !== undefined) {
          url += `&is_tool_category=${isCategory}`;
        }
      }
      const res = await api.get(url);
      if (res.data) {
        setSuppliers(res.data.suppliers);
        setCategories(res.data.categories);
        setWeights(res.data.weight_units);
        setLengths(res.data.length_units);
        setPackOffs(res.data.pack_off_units);
        setModels(res.data.models);
        setManufactures(res.data.manufactures);
        setData(res.data.stores);
        setTotalQty(res.data.totalQty);
      }
    } catch (err) {
      console.error("Failed to fetch inventory resources", err);
    }
    setFetchStore(false);
  };

  useEffect(() => {
    fetchResources();
  }, [api]);
  const mainDropzone = useDropzone({
    accept: {
      "image/*": [".jpg", ".jpeg", ".png"],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setFormData((p) => ({ ...p, image: file }));
      setMainFile(file);
      setMainPreview(URL.createObjectURL(file));
    },
  });

  const galleryDropzone = useDropzone({
    accept: { "image/*": [] },
    multiple: true,
    onDrop: (files) => {
      setGalleryFiles((p) => [...p, ...files]);
      setGalleryPreview((p) => [
        ...p,
        ...files.map((file) => ({
          src: URL.createObjectURL(file),
          isExisting: false,
        })),
      ]);
    },
  });

  // Barcode handlers
  const addBarcode = () => setBarcodes((prev) => [...prev, ""]);
  const updateBarcode = (index: number, val: string) => {
    const copy = [...barcodes];
    copy[index] = val;
    setBarcodes(copy);
  };
  const removeBarcode = (index: number) => {
    const copy = [...barcodes];
    copy.splice(index, 1);
    setBarcodes(copy);
  };

  useEffect(() => {
    setFormData((p) => ({
      ...p,
      category_ids: selectedCategories.map((c) => c.id).join(","),
    }));
  }, [selectedCategories]);

  const columnHelper = createColumnHelper<any>();
  const columns = [
    columnHelper.accessor("name", {
      id: "name",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <CustomCheckbox
            className="header-checkbox"
            checked={selectedRowIds.size === data.length && data.length > 0}
            indeterminate={
              selectedRowIds.size > 0 && selectedRowIds.size < data.length
            }
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const isChecked = e.target.checked;

              if (isChecked) {
                setSelectedRowIds(new Set(data.map((row) => row.id)));
              } else {
                setSelectedRowIds(new Set());
              }
            }}
          />
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        const isChecked = selectedRowIds.has(item.id);
        const showCheckbox = isChecked || hoveredRow === item.id;

        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={4}
            sx={{ pl: 1 }}
            onMouseEnter={() => setHoveredRow(item.id)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <CustomCheckbox
              checked={isChecked}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const newSelected = new Set(selectedRowIds);
                if (isChecked) {
                  newSelected.delete(item.id);
                } else {
                  newSelected.add(item.id);
                }
                setSelectedRowIds(newSelected);
                const ids = Array.from(newSelected);
                setFormData({
                  ...formData,
                  store_ids: ids.join(","),
                });
              }}
              sx={{
                opacity: showCheckbox ? 1 : 0,
                pointerEvents: showCheckbox ? "auto" : "none",
                transition: "opacity 0.2s ease",
              }}
            />
            <Typography textTransform="capitalize" className="f-14">
              {item.name ? item.name : "-"}
            </Typography>
          </Stack>
        );
      },
    }),
    columnHelper.accessor((row) => row?.qty, {
      id: "qty",
      header: () => `Total Qty (${totalQty})`,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.qty ?? "-"}
            </Typography>
          </Stack>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: data,
    columns,
    state: { columnFilters, sorting },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  // Reset to first page when search term changes
  useEffect(() => {
    table.setPageIndex(0);
  }, [table]);

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

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
      ModalProps={{
        disableEscapeKeyDown: isSaving,
      }}
    >
      <Box
        p={3}
        pt={2}
        height="100%"
        overflow="auto"
        display="flex"
        flexDirection="column"
      >
        {/* Header */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent={"space-between"}
          ml={-2}
          mb={1}
        >
          <Box display={"flex"} alignItems={"center"}>
            <IconButton onClick={onClose} disabled={isSaving}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={700}>
              {isEdit ? "Edit Product" : "Add Product"}
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
          }}
        >
          <form
            style={{ flex: 1 }}
            className="product-form"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
          >
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Box display={"flex"} justifyItems={"center"} gap={5}>
                  {/* Main Image Upload */}
                  <Box
                    {...mainDropzone.getRootProps()}
                    sx={{
                      width: 160,
                      height: 140,
                      border: "2px dashed",
                      borderColor: "primary.main",
                      borderRadius: 2,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      mb: 2,
                      position: "relative",
                      "&:hover": { backgroundColor: "rgba(0,0,0,0.05)" },
                    }}
                  >
                    <input
                      {...mainDropzone.getInputProps()}
                      accept=".jpg,.png,.jpeg"
                    />

                    {mainPreview ? (
                      <>
                        <Image
                          src={mainPreview}
                          alt="product"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(mainPreview);
                            setOpenPreview(true);
                          }}
                          height={150}
                          width={150}
                        />

                        <IconButton
                          size="small"
                          color="error"
                          sx={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            backgroundColor: "#fff",
                            zIndex: 2,
                            "&:hover": {
                              backgroundColor: "#fff",
                              color: "red",
                            },
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMainPreview(null);
                            setMainFile(null);
                            setFormData((p) => ({ ...p, remove_image: true }));
                          }}
                        >
                          <IconTrash size={16} />
                        </IconButton>
                      </>
                    ) : (
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        align="center"
                      >
                        Click or Drag to upload
                      </Typography>
                    )}
                  </Box>

                  <Box width={"30%"}>
                    <Typography variant="body2" gutterBottom>
                      Name
                    </Typography>
                    <CustomTextField
                      className="product_input"
                      placeholder="Name"
                      inputProps={{ maxLength: 50 }}
                      fullWidth
                      value={formData.short_name}
                      onChange={(e: any) => {
                        const value = e.target.value;
                        if (!/^[a-zA-Z0-9 .()]*$/.test(value)) return;
                        setFormData((p) => ({
                          ...p,
                          short_name: value,
                        }));
                      }}
                      sx={{ mb: 2 }}
                    />
                  </Box>
                  {storeId && (
                    <Box width={"30%"}>
                      <Typography variant="body2" gutterBottom>
                        Qty
                      </Typography>
                      <CustomTextField
                        className="product_input"
                        placeholder="Qty"
                        fullWidth
                        value={formData.qty || ""}
                        onChange={(e: any) => {
                          const value = e.target.value;

                          if (/^\d*(\.\d{0,2})?$/.test(value)) {
                            if (value === "" || Number(value) <= 999) {
                              setFormData((p) => ({
                                ...p,
                                qty: value,
                              }));
                            }
                          }
                        }}
                        sx={{ mb: 2 }}
                      />
                    </Box>
                  )}
                </Box>
                <Box display={"flex"} justifyItems={"center"} gap={3}>
                  <Box width={"100%"}>
                    <Typography variant="body2" gutterBottom>
                      UUID
                    </Typography>

                    <CustomTextField
                      className="product_input"
                      placeholder="UUID"
                      fullWidth
                      value={formData.uuid || ""}
                      onChange={(e: any) =>
                        setFormData((p) => ({
                          ...p,
                          uuid: e.target.value || 0,
                        }))
                      }
                      sx={{ mb: 2 }}
                    />
                  </Box>
                  <Box
                    width={"100%"}
                    display={"flex"}
                    justifyContent={"center"}
                    alignItems={"center"}
                    gap={1}
                  >
                    <Box width={"100%"}>
                      {/* Category */}
                      <Typography variant="body2" gutterBottom>
                        Category
                      </Typography>

                      <Autocomplete
                        className="product_selection"
                        multiple
                        options={categories}
                        getOptionLabel={(option) => option.name}
                        value={selectedCategories}
                        onChange={(_, newValue) =>
                          setSelectedCategories(newValue)
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            placeholder={
                              selectedCategories.length === 0
                                ? "Select category"
                                : ""
                            }
                          />
                        )}
                        sx={{ mb: 2 }}
                      />
                    </Box>
                    <Fab
                      color="primary"
                      size="small"
                      onClick={() => setOpenCategoryModal(true)}
                    >
                      <IconPlus size={14} />
                    </Fab>
                  </Box>
                  <Box width={"100%"}>
                    {/* Supplier Code */}
                    <Typography variant="body2" gutterBottom>
                      Supplier Code
                    </Typography>

                    <CustomTextField
                      className="product_input"
                      fullWidth
                      placeholder="Supplier code"
                      value={formData.supplier_code || ""}
                      onChange={(e: any) =>
                        setFormData((p) => ({
                          ...p,
                          supplier_code: e.target.value,
                        }))
                      }
                      sx={{ mb: 2 }}
                    />
                  </Box>
                  <Box
                    width={"100%"}
                    display={"flex"}
                    justifyContent={"center"}
                    alignItems={"center"}
                    gap={1}
                  >
                    <Box width={"100%"}>
                      <Typography variant="body2" gutterBottom>
                        Supplier
                      </Typography>

                      <Autocomplete
                        className="product_input"
                        fullWidth
                        options={suppliers}
                        value={
                          suppliers.find(
                            (s) => s.id === formData.supplier_id,
                          ) ?? null
                        }
                        onChange={(_, newValue) => {
                          setFormData((prev) => ({
                            ...prev,
                            supplier_id: newValue ? newValue.id : null,
                          }));
                        }}
                        getOptionLabel={(option) => option.name || ""}
                        renderInput={(params) => (
                          <CustomTextField
                            {...params}
                            placeholder="Select supplier"
                          />
                        )}
                        sx={{ mb: 2 }}
                      />
                    </Box>
                    <Fab
                      color="primary"
                      size="small"
                      onClick={() => setOpenSupplierModal(true)}
                    >
                      <IconPlus size={14} />
                    </Fab>
                  </Box>
                </Box>
                {/* Dimensions (Length, Width, Height, Unit) */}
                <Typography variant="body2" gutterBottom>
                  Dimensions (Length * Width * Height)
                </Typography>
                <Grid container sx={{ mb: 2 }} spacing={3}>
                  <Grid size={{ xs: 3 }}>
                    <CustomTextField
                      className="product_input"
                      placeholder="Length"
                      fullWidth
                      value={formData.length || ""}
                      onChange={(e: any) => {
                        const value = e.target.value;
                        if (!/^\d*\.?\d*$/.test(value)) return;
                        setFormData((p) => ({ ...p, length: value }));
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 3 }}>
                    <CustomTextField
                      className="product_input"
                      placeholder="Width"
                      fullWidth
                      value={formData.width || ""}
                      onChange={(e: any) => {
                        const value = e.target.value;
                        if (!/^\d*\.?\d*$/.test(value)) return;
                        setFormData((p) => ({ ...p, width: value }));
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 3 }}>
                    <CustomTextField
                      className="product_input"
                      placeholder="Height"
                      fullWidth
                      value={formData.height || ""}
                      onChange={(e: any) => {
                        const value = e.target.value;
                        if (!/^\d*\.?\d*$/.test(value)) return;
                        setFormData((p) => ({ ...p, height: value }));
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 3 }}>
                    <Autocomplete
                      className="product_input"
                      fullWidth
                      freeSolo
                      options={lengths}
                      value={formData.length_unit || null}
                      onChange={(_, newValue) => {
                        const value =
                          typeof newValue === "string"
                            ? newValue
                            : newValue?.name || "";

                        if (value && !lengths.some((u) => u.name === value)) {
                          setLengths((prev) => [
                            ...prev,
                            { id: Date.now(), name: value },
                          ]);
                        }

                        setFormData((prev) => ({
                          ...prev,
                          length_unit: value,
                        }));
                      }}
                      getOptionLabel={(option) =>
                        typeof option === "string" ? option : option.name
                      }
                      renderInput={(params) => (
                        <CustomTextField
                          {...params}
                          placeholder="Select or add unit"
                        />
                      )}
                    />
                  </Grid>
                </Grid>

                {/* Weight & Unit */}
                <Grid container spacing={3} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 3 }}>
                    <Typography variant="body2" gutterBottom>
                      Weight
                    </Typography>
                    <CustomTextField
                      className="product_input"
                      fullWidth
                      placeholder="Weight"
                      value={formData.weight || ""}
                      onChange={(e: any) => {
                        const value = e.target.value;
                        if (!/^\d*\.?\d*$/.test(value)) return;
                        setFormData((p) => ({ ...p, weight: value }));
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 3 }}>
                    <Typography variant="body2" gutterBottom>
                      Weight Unit
                    </Typography>

                    <Autocomplete
                      className="product_input"
                      fullWidth
                      freeSolo
                      options={weights}
                      value={formData.weight_unit || null}
                      onChange={(_, newValue) => {
                        const value =
                          typeof newValue === "string"
                            ? newValue
                            : newValue?.name || "";

                        if (value && !weights.some((u) => u.name === value)) {
                          setWeights((prev) => [
                            ...prev,
                            { id: Date.now(), name: value },
                          ]);
                        }

                        setFormData((prev) => ({
                          ...prev,
                          weight_unit: value,
                        }));
                      }}
                      getOptionLabel={(option) =>
                        typeof option === "string" ? option : option.name
                      }
                      renderInput={(params) => (
                        <CustomTextField
                          {...params}
                          placeholder="Select or add unit"
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 3 }}>
                    {/* Manufacture */}
                    <Typography variant="body2" gutterBottom>
                      Manufacture
                    </Typography>
                    <Autocomplete
                      className="product_input"
                      freeSolo
                      fullWidth
                      options={manufactures}
                      value={formData.manufacture || null}
                      onChange={(_, newValue) => {
                        if (newValue) {
                          setFormData((prev) => ({
                            ...prev,
                            manufacture: newValue.value,
                          }));
                        }
                      }}
                      getOptionLabel={(option) =>
                        typeof option === "string" ? option : option.name
                      }
                      renderInput={(params) => (
                        <CustomTextField
                          {...params}
                          onBlur={(e: any) => {
                            const value = e.target.value.trim();
                            if (!value) return;
                            if (!/^[a-zA-Z0-9 ]*$/.test(value)) return;

                            setFormData((prev) => ({
                              ...prev,
                              manufacture: value,
                            }));
                          }}
                          placeholder="Select manufacture"
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 3 }}>
                    {/* Model */}
                    <Typography variant="body2" gutterBottom>
                      Model
                    </Typography>
                    <Autocomplete
                      className="product_input"
                      freeSolo
                      fullWidth
                      options={models}
                      value={formData.model || null}
                      onChange={(_, newValue) => {
                        if (newValue) {
                          setFormData((prev) => ({
                            ...prev,
                            model: newValue.name,
                          }));
                        }
                      }}
                      getOptionLabel={(option) =>
                        typeof option === "string" ? option : option.name
                      }
                      renderInput={(params) => (
                        <CustomTextField
                          {...params}
                          onBlur={(e: any) => {
                            const value = e.target.value.trim();
                            if (!value) return;
                            if (!/^[a-zA-Z0-9 ]*$/.test(value)) return;

                            setFormData((prev) => ({
                              ...prev,
                              model: value,
                            }));
                          }}
                          placeholder="Select model"
                        />
                      )}
                    />
                  </Grid>
                </Grid>

                <Box display={"flex"} justifyItems={"center"} gap={3}>
                  <Box width={"100%"}>
                    {/* Price */}
                    <Typography variant="body2" gutterBottom>
                      Buying Price
                    </Typography>

                    <CustomTextField
                      className="product_input"
                      fullWidth
                      value={formData.price || ""}
                      placeholder="Buying price"
                      onChange={(e: any) => {
                        const value = e.target.value;
                        if (!/^\d*\.?\d{0,2}$/.test(value)) return;
                        setFormData((p) => ({ ...p, price: value }));
                      }}
                      sx={{ mb: 2 }}
                    />
                  </Box>
                  <Box width={"100%"}>
                    {/* Price */}
                    <Typography variant="body2" gutterBottom>
                      Market Price
                    </Typography>

                    <CustomTextField
                      className="product_input"
                      fullWidth
                      placeholder="Market price"
                      value={formData.market_price || ""}
                      onChange={(e: any) => {
                        const value = e.target.value;
                        if (!/^\d*\.?\d{0,2}$/.test(value)) return;
                        setFormData((p) => ({
                          ...p,
                          market_price: value,
                        }));
                      }}
                      sx={{ mb: 2 }}
                    />
                  </Box>

                  <Box width={"100%"}>
                    {/* Tax */}
                    <Typography variant="body2" gutterBottom>
                      Tax (%)
                    </Typography>
                    <CustomTextField
                      className="product_input"
                      fullWidth
                      placeholder="Tax"
                      value={formData.tax || ""}
                      onChange={(e: any) => {
                        const value = e.target.value;
                        if (!/^\d*$/.test(value)) return;
                        if (Number(value) > 100) return;
                        setFormData((p) => ({ ...p, tax: value }));
                      }}
                      sx={{ mb: 2 }}
                    />
                  </Box>
                  <Box width={"100%"}>
                    <Typography variant="body2" gutterBottom>
                      Low Stock Indicator
                    </Typography>

                    <CustomTextField
                      className="product_input"
                      fullWidth
                      placeholder="Cutoff"
                      value={formData.cutoff || ""}
                      onChange={(e: any) =>
                        setFormData((p) => ({
                          ...p,
                          cutoff: e.target.value || 0,
                        }))
                      }
                      sx={{ mb: 2 }}
                    />
                  </Box>
                </Box>

                {/* Pack off */}
                <Grid container spacing={3}>
                  <Grid size={{ xs: 3 }}>
                    <Typography variant="body2" gutterBottom mb={1}>
                      Max Stock Limit
                    </Typography>
                    <CustomTextField
                      className="product_input"
                      fullWidth
                      placeholder="Max Stock"
                      value={formData.max_stock || ""}
                      onChange={(e: any) => {
                        const value = e.target.value;

                        if (/^\d*$/.test(value)) {
                          if (value === "" || Number(value) <= 9999) {
                            setFormData((p) => ({
                              ...p,
                              max_stock: e.target.value,
                            }));
                          }
                        }
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 3 }}>
                    <Typography variant="body2" gutterBottom mb={1}>
                      Pack Off
                    </Typography>
                    <CustomTextField
                      className="product_input"
                      fullWidth
                      placeholder="Pack off"
                      value={formData.pack_off_qty || ""}
                      disabled={!formData.is_sub_qty}
                      onChange={(e: any) => {
                        const value = e.target.value;
                        if (!/^\d*\.?\d*$/.test(value)) return;
                        setFormData((p) => ({
                          ...p,
                          pack_off_qty: value,
                        }));
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 3 }}>
                    <Typography variant="body2" gutterBottom mb={1}>
                      Pack off unit
                    </Typography>
                    <Autocomplete
                      className="product_input"
                      fullWidth
                      freeSolo
                      options={packOffs}
                      disabled={!formData.is_sub_qty}
                      value={formData.pack_off_unit || null}
                      onChange={(_, newValue) => {
                        const value =
                          typeof newValue === "string"
                            ? newValue
                            : newValue?.name || "";

                        if (value && !packOffs.some((u) => u.name === value)) {
                          setPackOffs((prev) => [
                            ...prev,
                            { id: Date.now(), name: value },
                          ]);
                        }

                        setFormData((prev) => ({
                          ...prev,
                          pack_off_unit: value,
                        }));
                      }}
                      getOptionLabel={(option) =>
                        typeof option === "string" ? option : option.name
                      }
                      renderInput={(params) => (
                        <CustomTextField
                          {...params}
                          placeholder="Select or add unit"
                          onBlur={(e: any) => {
                            const value = e.target.value.trim();
                            if (!value) return;

                            if (!packOffs.some((u) => u.name === value)) {
                              setPackOffs((prev) => [
                                ...prev,
                                { id: Date.now(), name: value },
                              ]);
                            }

                            setFormData((prev) => ({
                              ...prev,
                              pack_off_unit: value,
                            }));
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid
                    size={{ xs: 3 }}
                    mt={4}
                    display={"flex"}
                    justifyContent={"start"}
                  >
                    {/* sub quantity */}
                    <IOSSwitch
                      checked={formData.is_sub_qty}
                      onChange={(e, value) =>
                        setFormData({
                          ...formData,
                          is_sub_qty: value,
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 3 }}></Grid>
                </Grid>
                <Grid spacing={3} container mt={2}>
                  <Grid size={{ xs: 3 }}>
                    {/* short_id */}
                    <Typography variant="body2" gutterBottom>
                      Sort ID
                    </Typography>

                    <TextField
                      className="product_input"
                      fullWidth
                      placeholder="Sort ID"
                      value={formData.sort_id || ""}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          sort_id: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 3 }}>
                    <Typography variant="body2" gutterBottom mb={1}>
                      Barcode texts
                    </Typography>
                    {barcodes.map((code, i) => (
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        mb={1}
                        key={i}
                      >
                        <TextField
                          className="product_input"
                          placeholder="Barcode"
                          value={code}
                          onChange={(e) => updateBarcode(i, e.target.value)}
                          fullWidth
                        />
                        <Button
                          color="error"
                          onClick={() => removeBarcode(i)}
                          disabled={barcodes.length === 1}
                        >
                          &times;
                        </Button>
                        <Button color="primary" onClick={addBarcode}>
                          +
                        </Button>
                      </Stack>
                    ))}
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" gutterBottom>
                      Description
                    </Typography>

                    <TextField
                      className="product_input"
                      multiline
                      placeholder="Enter description..."
                      fullWidth
                      rows={3}
                      inputProps={{ maxLength: 150 }}
                      value={formData.description || ""}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    {/* Gallery Images Upload */}
                    <Typography variant="body2" gutterBottom mb={1}>
                      Gallery Images
                    </Typography>
                    <Box
                      {...galleryDropzone.getRootProps()}
                      sx={{
                        width: "100%",
                        minHeight: 140,
                        border: "2px dashed",
                        borderColor: "primary.main",
                        borderRadius: 2,
                        cursor: "pointer",
                        p: 2,
                        mb: 2,
                      }}
                    >
                      <input
                        {...galleryDropzone.getInputProps()}
                        accept=".jpg,.png,.jpeg"
                      />

                      {galleryPreview.length > 0 ? (
                        <Grid container spacing={2}>
                          {galleryPreview.map((item, i) => (
                            <Grid
                              size={{ xs: 6, sm: 4, md: 3, lg: 2 }}
                              key={item.id ?? i}
                            >
                              <Box
                                sx={{
                                  position: "relative",
                                  width: "100%",
                                  aspectRatio: "1 / 1",
                                  overflow: "hidden",
                                  borderRadius: 1,
                                }}
                              >
                                <Image
                                  src={
                                    item.src || "/images/products/product.svg"
                                  }
                                  alt="Product image"
                                  fill
                                  style={{
                                    objectFit: "cover",
                                    cursor: "zoom-in",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage(item.src);
                                    setOpenPreview(true);
                                  }}
                                />

                                <IconButton
                                  color="error"
                                  size="small"
                                  sx={{
                                    position: "absolute",
                                    top: 4,
                                    right: 4,
                                    backgroundColor: "#fff",
                                    zIndex: 2,
                                    "&:hover": {
                                      backgroundColor: "#fff",
                                      color: "red",
                                    },
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveGalleryImage(item, i);
                                  }}
                                >
                                  <IconTrash size={16} />
                                </IconButton>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      ) : (
                        <Box
                          sx={{
                            height: 140,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography variant="body2" color="textSecondary">
                            Click or Drag to upload multiple images
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                  {/* <Grid
                    size={{ xs: 6 }}
                    height="calc(50vh - 100px)"
                    display="flex"
                    flexDirection="column"
                    // size={{ xs: 12, md: 8 }}
                    sx={{
                      overflowY: "auto",
                      pl: 1,
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: "auto",
                      }}
                    >
                      <TableContainer>
                        <Table stickyHeader aria-label="sticky table">
                          <TableHead>
                            {table.getHeaderGroups().map((headerGroup) => (
                              <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                  const isActive = header.column.getIsSorted();
                                  const isAsc =
                                    header.column.getIsSorted() === "asc";
                                  const isSortable = header.column.getCanSort();

                                  return (
                                    <TableCell
                                      key={header.id}
                                      align="center"
                                      sx={{
                                        paddingTop: "10px",
                                        paddingBottom: "10px",
                                        width:
                                          header.column.id === "actions"
                                            ? 210
                                            : "auto",
                                      }}
                                    >
                                      <Box
                                        onClick={header.column.getToggleSortingHandler()}
                                        p={0}
                                        sx={{
                                          cursor: isSortable
                                            ? "pointer"
                                            : "default",
                                          border: "2px solid transparent",
                                          borderRadius: "6px",
                                          display: "flex",
                                          justifyContent: "flex-start",
                                          "&:hover": { color: "#888" },
                                          "&:hover .hoverIcon": { opacity: 1 },
                                        }}
                                      >
                                        <Typography variant="subtitle2">
                                          {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext(),
                                          )}
                                        </Typography>
                                        {isSortable && (
                                          <Box
                                            component="span"
                                            className="hoverIcon"
                                            ml={0.5}
                                            sx={{
                                              transition: "opacity 0.2s",
                                              opacity: isActive ? 1 : 0,
                                              fontSize: "0.9rem",
                                              color: isActive ? "#000" : "#888",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "space-between",
                                            }}
                                          >
                                            {isActive
                                              ? isAsc
                                                ? "↑"
                                                : "↓"
                                              : "↑"}
                                          </Box>
                                        )}
                                      </Box>
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                          </TableHead>
                          <TableBody>
                            {fetchStore ? (
                              <SkeletonLoader
                                columns={simpleColumns}
                                rowCount={simpleColumns.length}
                              />
                            ) : data.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={columns.length}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      height: "calc(50vh - 100px)",
                                    }}
                                  >
                                    <Image
                                      src="/images/no-data.png"
                                      alt="No data"
                                      style={{
                                        maxWidth: "100%",
                                        maxHeight: "100%",
                                      }}
                                      width={200}
                                      height={200}
                                    />
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ) : (
                              table.getRowModel().rows.map((row) => (
                                <TableRow
                                  key={row.id}
                                  hover
                                  sx={{ cursor: "pointer" }}
                                >
                                  {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                      key={cell.id}
                                      sx={{ padding: "10px" }}
                                    >
                                      {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext(),
                                      )}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {data.length ? <Divider /> : <></>}
                    </Box>
                    <Divider />
                    <Stack
                      gap={1}
                      pr={3}
                      pl={3}
                      pb={3}
                      alignItems="center"
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography color="textSecondary" className="f-14">
                          {table.getPrePaginationRowModel().rows.length} Rows
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: {
                            xs: "block",
                            sm: "flex",
                          },
                        }}
                        alignItems="center"
                      >
                        <Stack direction="row" alignItems="center">
                          <Typography color="textSecondary" className="f-14">
                            Page
                          </Typography>
                          <Typography
                            color="textSecondary"
                            className="f-14"
                            fontWeight={600}
                            ml={1}
                          >
                            {table.getState().pagination.pageIndex + 1} of{" "}
                            {table.getPageCount()}
                          </Typography>
                          <Typography
                            color="textSecondary"
                            ml={"3px"}
                            className="f-14"
                          >
                            {" "}
                            | Entries :{" "}
                          </Typography>
                        </Stack>
                        <Stack
                          ml={"5px"}
                          direction="row"
                          alignItems="center"
                          color="textSecondary"
                        >
                          <CustomSelect
                            className="custom-select"
                            value={table.getState().pagination.pageSize}
                            onChange={(e: { target: { value: any } }) => {
                              table.setPageSize(Number(e.target.value));
                            }}
                          >
                            {[50, 100, 250, 500].map((pageSize) => (
                              <MenuItem key={pageSize} value={pageSize}>
                                {pageSize}
                              </MenuItem>
                            ))}
                          </CustomSelect>
                          <IconButton
                            size="small"
                            sx={{ width: "30px" }}
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                          >
                            <IconChevronLeft />
                          </IconButton>
                          <IconButton
                            size="small"
                            sx={{ width: "30px" }}
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                          >
                            <IconChevronRight />
                          </IconButton>
                        </Stack>
                      </Box>
                    </Stack>
                  </Grid> */}
                </Grid>
              </Grid>
            </Grid>
          </form>
        </Box>

        <Dialog
          open={openPreview}
          onClose={() => setOpenPreview(false)}
          fullScreen
          PaperProps={{
            sx: {
              backgroundColor: "transparent",
              boxShadow: "none",
            },
          }}
        >
          <IconButton
            onClick={() => setOpenPreview(false)}
            color="primary"
            sx={{
              position: "fixed",
              top: 16,
              right: 16,
              zIndex: 1301,
              backgroundColor: "#fff",
              "&:hover": {
                backgroundColor: "#eee",
                color: "#1e4db7",
              },
            }}
          >
            <IconX />
          </IconButton>

          <Box
            sx={{
              width: "100vw",
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setOpenPreview(false)}
          >
            <img
              src={previewImage || ""}
              alt="Preview"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "90% !important",
                height: "50%",
                objectFit: "contain",
              }}
            />
          </Box>
        </Dialog>

        {/* Action Buttons */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "start",
            gap: 2,
            marginTop: 1,
          }}
        >
          <Button
            color="primary"
            variant="contained"
            size="large"
            type="submit"
            onClick={(e) =>
              handleSubmit(e, galleryFiles, barcodes, removedImageIds)
            }
            disabled={isSaving}
            sx={{ borderRadius: 3, width: "10%" }}
          >
            {isSaving
              ? isEdit
                ? "Updating..."
                : "Saving..."
              : isEdit
                ? "Update"
                : "Save"}
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

        {/* Add category */}
        <CreateCategory
          open={openCategoryModal}
          onClose={() => setOpenCategoryModal(false)}
          formData={categoryFormData}
          setFormData={setCategoryFormData}
          handleSubmit={handleCategorySubmit}
          isSaving={isSaving}
          companyId={companyId ?? null}
        />

        {/* Add supplier */}
        <CreateSupplier
          open={openSupplierModal}
          onClose={() => setOpenSupplierModal(false)}
          formData={supplierFormData}
          setFormData={setSupplierFormData}
          handleSubmit={handleSupplierSubmit}
          isSaving={isSaving}
          companyId={companyId ?? null}
        />
      </Box>
    </Drawer>
  );
};

export default ProductAddEdit;
