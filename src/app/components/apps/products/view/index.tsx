"use client";
import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  Tabs,
  Tab,
} from "@mui/material";
import { Grid, Stack } from "@mui/system";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import ProductAddEdit from "../create";
import BlankCard from "@/app/components/shared/BlankCard";
import ProductInformation from "../information";
import ProductSets from "../product-sets";
import ProductTechnicalInformation from "../technical-information";
import ProductTrades from "../sets/trades";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 1 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `vertical-tab-${index}`,
    "aria-controls": `vertical-tabpanel-${index}`,
  };
}

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
  max_stock?: number | null;
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

const ProductView: React.FC<ProductViewProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  isSaving,
  companyId,
  productId,
}) => {
  const [product, setProduct] = useState<any>([]);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [value, setValue] = React.useState(0);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  const triggerRefresh = () => {
    setShouldRefresh((prev) => !prev);
  };

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get(
        `products/get?company_id=${companyId}&product_id=${productId}&is_products=true`,
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
        triggerRefresh();
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
    setValue(0);
  }, [open, productId]);

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
          pt: 2,
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
      <Grid container spacing={2} mt={2} height={"100%"}>
        <Grid
          container
          display={"flex"}
          size={{
            xs: 12,
            lg: 12,
          }}
        >
          <Grid
            size={{
              xs: 12,
              lg: 2,
            }}
          >
            <BlankCard className="tab-balnkcard">
              <Stack direction="row" mt={1} ml={2} mb={3} mr={2}>
                <Tabs
                  className="admin-settings-tabs"
                  orientation="vertical"
                  variant="scrollable"
                  value={value}
                  onChange={handleChange}
                >
                  <Tab
                    className="admin-settings"
                    color="textSecondary"
                    iconPosition="start"
                    label="Product Information"
                    {...a11yProps(0)}
                  />
                  <Tab
                    className="admin-settings"
                    iconPosition="start"
                    label="Technical Information"
                    {...a11yProps(1)}
                  />
                  <Tab
                    className="admin-settings"
                    iconPosition="start"
                    label="Product Set"
                    {...a11yProps(2)}
                  />
                  <Tab
                    className="admin-settings"
                    iconPosition="start"
                    label="Trades"
                    {...a11yProps(2)}
                  />
                </Tabs>
              </Stack>
            </BlankCard>
          </Grid>
          <Grid
            display={"flex"}
            size={{
              xs: 12,
              lg: 10,
            }}
          >
            <BlankCard>
              <TabPanel value={value} index={0}>
                <ProductInformation
                  shouldRefresh={shouldRefresh}
                  companyId={companyId}
                  productId={productId}
                />
              </TabPanel>
              <TabPanel value={value} index={1}>
                <ProductTechnicalInformation
                  companyId={companyId}
                  productId={productId}
                />
              </TabPanel>
              <TabPanel value={value} index={2}>
                <ProductSets companyId={companyId} productId={productId} />
              </TabPanel>
              <TabPanel value={value} index={3}>
                <ProductTrades companyId={companyId} productId={productId} />
              </TabPanel>
            </BlankCard>
          </Grid>
        </Grid>
      </Grid>
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
