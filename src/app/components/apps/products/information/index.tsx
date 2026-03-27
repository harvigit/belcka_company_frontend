"use client";
import React, { useEffect, useState } from "react";
import { Box, IconButton, Typography, Chip, Dialog } from "@mui/material";
import { Grid, Stack } from "@mui/system";
import api from "@/utils/axios";
import Image from "next/image";
import { IconX } from "@tabler/icons-react";

interface ProductInformationProps {
  companyId: number | null;
  productId?: number | null;
  shouldRefresh: boolean;
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
}) => {
  const [mainPreview, setMainPreview] = useState<string | null>(null);
  const [galleryPreview, setGalleryPreview] = useState<GalleryImage[]>([]);
  const [product, setProduct] = useState<any>([]);
  const [openPreview, setOpenPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await api.get(
        `products/get?company_id=${companyId}&product_id=${productId}`,
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
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProducts();
    }
  }, [productId,shouldRefresh]);

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
    </Stack>
  );
};

export default ProductInformation;
