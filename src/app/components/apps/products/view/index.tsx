"use client";
import React, { useEffect, useState } from "react";
import { Drawer, Box, IconButton, Typography, Tabs, Tab } from "@mui/material";
import { Grid, Stack } from "@mui/system";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import api from "@/utils/axios";
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
  qty?: number | null;
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
  const [attachments, setAttachments] = useState<any>([]);
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
        `products/detail?company_id=${companyId}&product_id=${productId}`,
      );
      if (res.data) {
        setProduct(res.data.info);
        setAttachments(res.data.info.attachments);
      }
    } catch (err) {
      console.error("Failed to fetch product", err);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProducts();
    }
    setValue(0);
  }, [open, productId,shouldRefresh]);

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
                  shouldRefresh={triggerRefresh}
                  companyId={companyId}
                  productId={productId}
                  formData={formData}
                  setFormData={setFormData}
                  isSaving={isSaving}
                />
              </TabPanel>
              <TabPanel value={value} index={1}>
                <ProductTechnicalInformation
                  companyId={companyId}
                  productId={productId}
                  attachments={attachments}
                  onWorkUpdated={fetchProducts}
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
    </Drawer>
  );
};

export default ProductView;
