"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  IconButton,
  Typography,
  Chip,
  Dialog,
  Button,
} from "@mui/material";
import { Grid, Stack } from "@mui/system";
import api from "@/utils/axios";
import Image from "next/image";
import { IconX } from "@tabler/icons-react";
import ProductAddEdit from "../create";
import toast from "react-hot-toast";

interface ProductInformationProps {
  companyId: number | null;
  productId?: number | null;
  shouldRefresh: () => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isSaving: boolean;
}

type GalleryImage = {
  id?: number;
  src: string;
  thumb?: string;
  isExisting?: boolean;
};

const ProductInformation: React.FC<ProductInformationProps> = ({
  companyId,
  productId,
  shouldRefresh,
  formData,
  setFormData,
  isSaving,
}) => {
  const [mainPreview, setMainPreview] = useState<string | null>(null);
  const [galleryPreview, setGalleryPreview] = useState<GalleryImage[]>([]);
  const [product, setProduct] = useState<any>([]);
  const [fetching, setFetching] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);

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
          qty: 0,
        });
        setEditDrawerOpen(false);
      } else {
        toast.error(result.data.message);
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
    }
  };

  const fetchProducts = async () => {
    if (!productId || fetching) return;

    setFetching(true);
    try {
      const res = await api.get(
        `products/get?company_id=${companyId}&product_id=${productId}&is_products=true&is_web=true`,
      );
      if (res.data.info) {
        setProduct(res.data.info);
        setMainPreview(res.data.info?.image_url);

        if (res.data.info?.product_images?.length) {
          setGalleryPreview(
            res.data.info?.product_images.map((img: any) => ({
              id: img.id,
              src: img.image_url,
              isExisting: true,
            })),
          );
        }
      }
    } catch (err) {
      console.error("Failed to fetch product", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProducts();
    }
  }, [productId, shouldRefresh]);

  const colorMap: Record<number, string> = {
    1: "success.main",
    2: "warning.main",
    3: "error.main",
    4: "error.main",
    5: "success.main",
  };

  return (
    <Stack p={2}>
      <Grid container spacing={4} p={2}>
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
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Max Stock limit
              </Typography>
              <Typography>{product?.max_stock || 0}</Typography>
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

          <Box mt={2}>
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

          <Box mt={2}>
            <Typography fontWeight={600} mb={2}>
              Other Info
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Height
                </Typography>
                <Typography>{product?.height || "-"}</Typography>
              </Grid>

              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Weight
                </Typography>
                <Typography>{product?.weight || "-"}</Typography>
              </Grid>

              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Model
                </Typography>
                <Typography>{product?.model_name || "-"}</Typography>
              </Grid>

              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Manufacture
                </Typography>
                <Typography>{product?.manufacturer_name || "-"}</Typography>
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* RIGHT SIDE */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* PRODUCT IMAGE */}
          <Box display="flex" justifyContent={"flex-end"} mb={1}>
            <Button variant="contained" onClick={() => setEditDrawerOpen(true)}>
              Edit
            </Button>
          </Box>
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
    </Stack>
  );
};

export default ProductInformation;
