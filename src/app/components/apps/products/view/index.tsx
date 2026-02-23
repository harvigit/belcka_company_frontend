"use client";
import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Dialog,
} from "@mui/material";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Grid, Stack } from "@mui/system";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import api from "@/utils/axios";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import Image from "next/image";
import toast from "react-hot-toast";
import ProductAddEdit from "../create";
import { IconX } from "@tabler/icons-react";

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
}

interface Category {
  id: number;
  name: string;
}

interface ProductViewProps {
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
  productId?: number | null;
}

type GalleryImage = {
  id?: number;
  src: string;
  thumb?: string;
  isExisting?: boolean;
};

const ProductView: React.FC<ProductViewProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  isSaving,
  companyId,
  isEdit,
  productId,
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
  const [product, setProduct] = useState<any>([]);
  const [totalQty, setTotalQty] = useState("");
  const [openPreview, setOpenPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await api.get(
        `products/get?company_id=${companyId}&product_id=${productId}`,
      );
      if (res.data) {
        setProduct(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch product", err);
    }
  };

  const editSupplier = async (
    e: React.FormEvent,
    galleryFiles: File[],
    barcodes: string[],
    removedImageIds: number[],
  ) => {
    e.preventDefault();

    try {
      const formPayload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (key === "image") return;

        if (Array.isArray(value)) {
          value.forEach((v) => {
            formPayload.append(`${key}[]`, String(v));
          });
          return;
        }

        if (typeof value === "boolean") {
          formPayload.append(key, value ? "1" : "0");
          return;
        }

        formPayload.append(key, String(value));
      });

      if (formData.image instanceof File) {
        formPayload.append("image", formData.image);
      }

      removedImageIds.forEach((id) =>
        formPayload.append("removed_image_ids[]", String(id)),
      );

      galleryFiles.forEach((file) => {
        formPayload.append("files", file);
      });

      formPayload.append("barcode_text", barcodes.join(","));

      const result = await api.post("products/update", formPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          id: 0,
          company_id: companyId,
          name: "",
          sort_id: 0,
          short_name: "",
          description: "",
          uuid: "",
          status: true,
        });
        setEditDrawerOpen(false);
        fetchProducts();
      } else {
        toast.error(result.data.message);
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
    }
  };

  useEffect(() => {
    if (productId) {
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

    if (product) {
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
        model_id: product?.model?.id ?? null,
        manufacturer_id: product?.manufacturer?.id ?? null,
        pack_off_qty: product.pack_off_qty ?? "",
        pack_off_unit: product.pack_off_unit ?? null,
        weight: product?.product_details?.[0]?.weight ?? "",
        weight_unit: product?.product_details?.[0]?.weightUnits?.name ?? null,
        length: product?.product_details?.[0]?.length ?? "",
        width: product?.product_details?.[0]?.width ?? "",
        height: product?.product_details?.[0]?.height ?? "",
        length_unit: product?.product_details?.[0]?.lengthtUnits?.name ?? null,
        tax: product?.product_details?.[0]?.tax ?? "",
        price: product.price ?? "",
        sort_id: product.sort_id ?? 0,
        cutoff: product.cutoff ?? 0,
        is_sub_qty: Boolean(product.is_sub_qty),
        store_ids: product.store_ids ?? "",
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
      }
    } else {
      setBarcodes([""]);
      setSelectedCategories([]);
      setSelectedRowIds(new Set());
      setMainPreview(null);
      setGalleryFiles([]);
      setGalleryPreview([]);
    }
  }, [open, product, categories]);

  const fetchResources = async () => {
    setFetchStore(true);

    try {
      let url = `get-inventory-resources?company_id=${companyId}`;
      if (isEdit && product) {
        url = `get-inventory-resources?company_id=${companyId}&product_id=${productId}`;
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

  const colorMap: Record<number, string> = {
    1: "success.main",
    2: "warning.main",
    3: "error.main",
    4: "error.main",
  };

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
          // overflow: "hidden",
          p: 4,
          backgroundColor: "#f9fafb",
        },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display={"flex"} alignItems={"center"}>
          <IconButton onClick={onClose} disabled={isSaving}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            {product?.short_name || "-"}
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button variant="contained" onClick={() => setEditDrawerOpen(true)}>
            Edit
          </Button>
        </Box>
      </Box>
      <Grid container spacing={4} mt={1} p={2}>
        {/* LEFT SIDE */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box
            display={"flex"}
            justifyContent={"space-between"}
            gap={3}
            width={"70%"}
          >
            <Typography fontWeight={600} mb={2}>
              Primary Details
            </Typography>
            {product?.stock_status_id !== 0 && (
              <Chip
                label={product?.stock_status || ""}
                size="small"
                sx={{
                  // width: 80,
                  height: 28,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  backgroundColor: "#fffcfcff",
                  color: colorMap[product?.stock_status_id] ?? "text.primary",
                  border: "1px solid #cbd5e1",
                  textTransform: "capitalize",
                }}
              />
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Product name
              </Typography>
              <Typography
                sx={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.25,
                  mr: 1,
                  wordBreak: "break-word",
                }}
              >
                {product?.short_name || "-"}
              </Typography>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">
                UUID
              </Typography>
              <Typography>{product?.uuid || "-"}</Typography>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Product category
              </Typography>
              <Typography>{product?.product_categories || "-"}</Typography>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Threshold Value
              </Typography>
              <Typography>{product?.cutoff || 0}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Buying Price
              </Typography>
              <Typography>{product?.price || "-"}</Typography>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Market Price
              </Typography>
              <Typography>{product?.market_price || 0}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Barcodes
              </Typography>
              <Typography>{product?.barcode_text || 0}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Quantity
              </Typography>
              <Typography>{product?.qty || 0}</Typography>
            </Grid>
            {product?.description && (
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Description
                </Typography>
                <Typography>{product?.description || ""}</Typography>
              </Grid>
            )}
          </Grid>

          <Box mt={4}>
            <Typography fontWeight={600} mb={2}>
              Supplier Details
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Supplier name
                </Typography>
                <Typography>{product?.supplier_name || "-"}</Typography>
              </Grid>

              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Supplier code
                </Typography>
                <Typography>{product?.supplier_code || "-"}</Typography>
              </Grid>
            </Grid>
          </Box>
          {/* 
          <Box mt={4} width={"70%"}>
            <Typography fontWeight={600} mb={2}>
              Stock Locations
            </Typography>

            <TableContainer
              sx={{
                backgroundColor: "#fff",
                borderRadius: 2,
                border: "1px solid #e5e7eb",
              }}
            >
              <Table>
                <TableHead sx={{ backgroundColor: "#f3f4f6" }}>
                  <TableRow>
                    <TableCell>Store Name</TableCell>
                    <TableCell align="right">Stock in hand</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell align="right">
                        <Typography color="primary">{row.qty}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box> */}
        </Grid>

        {/* RIGHT SIDE */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* PRODUCT IMAGE */}
          <Box
            sx={{
              border: "1px dashed #d1d5db",
              borderRadius: 2,
              p: 3,
              textAlign: "center",
              backgroundColor: "#fff",
            }}
          >
            {mainPreview ? (
              <Image
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewImage(mainPreview);
                  setOpenPreview(true);
                }}
                src={mainPreview}
                alt="product"
                width={180}
                height={180}
                style={{ objectFit: "contain", cursor: "pointer" }}
              />
            ) : (
              <Typography>No Image</Typography>
            )}
          </Box>
          {galleryPreview.length > 0 ? (
            <Grid
              container
              spacing={2}
              mt={2}
              sx={{
                border: "1px dashed #d1d5db",
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                backgroundColor: "#fff",
              }}
            >
              {galleryPreview.map((item, i) => (
                <Grid size={{ xs: 6, sm: 4, md: 4, lg: 3 }} key={item.id ?? i}>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(item.src);
                        setOpenPreview(true);
                      }}
                      src={item.src}
                      alt="Product image"
                      fill
                      style={{
                        objectFit: "cover",
                        cursor: "pointer",
                      }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <></>
          )}
        </Grid>
      </Grid>
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

      {/* Edit product */}
      <ProductAddEdit
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        isEdit={true}
        formData={formData}
        productId={productId}
        setFormData={setFormData}
        handleSubmit={editSupplier}
        isSaving={isSaving}
        companyId={companyId ?? null}
      />
    </Drawer>
  );
};

export default ProductView;
