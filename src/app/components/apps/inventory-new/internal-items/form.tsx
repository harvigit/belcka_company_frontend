import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Drawer,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { IconLock, IconPhoto, IconTrash, IconX } from "@tabler/icons-react";
import api from "@/utils/axios";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import {
  InventoryOption,
  InventoryOptions,
} from "../shared/useInventoryOptions";

export interface InternalItemForm {
  id?: number;
  code: string;
  name: string;
  description: string;
  category_id: number | "";
  unit_id: number | "";
  market_price: string;
  is_sub_qty: boolean;
  issue_pack_qty: string;
  issue_pack_unit_id: number | "";
  // Inventory 1 product this item replaces (migration link)
  legacy_product_id: number | null;
  legacy_product_label: string | null;
  // read-only, worked out from purchases and issues
  base_price: number | null;
  // photo: a newly picked file, the saved image url, or a request to remove it
  image_file: File | null;
  image_url: string | null;
  remove_image: boolean;
}

export const emptyInternalItem: InternalItemForm = {
  code: "",
  name: "",
  description: "",
  category_id: "",
  unit_id: "",
  market_price: "",
  is_sub_qty: false,
  issue_pack_qty: "",
  issue_pack_unit_id: "",
  legacy_product_id: null,
  legacy_product_label: null,
  base_price: null,
  image_file: null,
  image_url: null,
  remove_image: false,
};

interface LegacyProduct {
  id: number;
  uuid: string;
  name: string;
  market_price: number | null;
  image_url: string | null;
  is_sub_qty: boolean;
  issue_pack_qty: number | null;
  issue_pack_unit_id: number | null;
  category_id: number | null;
  linked_internal_item: { id: number; code: string } | null;
}

interface InternalItemDrawerProps {
  open: boolean;
  onClose: () => void;
  formData: InternalItemForm;
  setFormData: React.Dispatch<React.SetStateAction<InternalItemForm>>;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  options: InventoryOptions;
  companyId?: number | null;
}

const legacyLabel = (p: { uuid: string; name: string }) =>
  `${p.uuid} · ${p.name}`;

// Add / edit an internal item, laid out like the Add Product drawer.
const InternalItemDrawer: React.FC<InternalItemDrawerProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isSaving,
  options,
  companyId,
}) => {
  const isEdit = !!formData.id;
  const set = (name: keyof InternalItemForm, value: any) =>
    setFormData((prev) => ({ ...prev, [name]: value }));

  // ---- image (same dropzone as the product form) ----
  const [filePreview, setFilePreview] = useState<string | null>(null);
  useEffect(() => {
    if (!formData.image_file) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(formData.image_file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [formData.image_file]);
  const preview = filePreview ?? formData.image_url;
  const dropzone = useDropzone({
    accept: { "image/*": [".jpg", ".jpeg", ".png"] },
    multiple: false,
    onDrop: (files) => {
      if (files[0])
        setFormData((prev) => ({
          ...prev,
          image_file: files[0],
          remove_image: false,
        }));
    },
  });

  // ---- Inventory 1 product search ----
  const [legacySearch, setLegacySearch] = useState("");
  const [legacyOptions, setLegacyOptions] = useState<LegacyProduct[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(false);
  useEffect(() => {
    if (!open || !companyId) return;
    const timer = setTimeout(async () => {
      setLegacyLoading(true);
      try {
        const res = await api.get(
          `inventory-new/internal-items/legacy-products?company_id=${companyId}&search=${encodeURIComponent(legacySearch)}`,
        );
        setLegacyOptions(res.data?.info ?? []);
      } catch (err) {
        setLegacyOptions([]);
      }
      setLegacyLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [open, companyId, legacySearch]);

  const selectedLegacy = useMemo<LegacyProduct | null>(() => {
    if (!formData.legacy_product_id) return null;
    return (
      legacyOptions.find((p) => p.id === formData.legacy_product_id) ?? {
        id: formData.legacy_product_id,
        uuid: "",
        name: formData.legacy_product_label ?? "",
        market_price: null,
        image_url: null,
        is_sub_qty: false,
        issue_pack_qty: null,
        issue_pack_unit_id: null,
        category_id: null,
        linked_internal_item: null,
      }
    );
  }, [
    formData.legacy_product_id,
    formData.legacy_product_label,
    legacyOptions,
  ]);

  // Picking an Inventory 1 product fills the fields that are still empty.
  const pickLegacy = (p: LegacyProduct | null) =>
    setFormData((prev) => {
      if (!p)
        return { ...prev, legacy_product_id: null, legacy_product_label: null };
      const fillSubQty = !prev.is_sub_qty && p.is_sub_qty;
      return {
        ...prev,
        legacy_product_id: p.id,
        legacy_product_label: legacyLabel(p),
        name: prev.name || p.name,
        market_price:
          prev.market_price ||
          (p.market_price !== null ? String(p.market_price) : ""),
        category_id:
          prev.category_id ||
          (p.category_id &&
          options.categories.some((c) => c.id === p.category_id)
            ? p.category_id
            : ""),
        ...(fillSubQty && {
          is_sub_qty: true,
          issue_pack_qty: String(p.issue_pack_qty ?? ""),
          issue_pack_unit_id:
            p.issue_pack_unit_id &&
            options.units.some((u) => u.id === p.issue_pack_unit_id)
              ? p.issue_pack_unit_id
              : "",
        }),
      };
    });

  const optionById = (list: InventoryOption[], id: number | "") =>
    list.find((o) => o.id === id) ?? null;
  const baseUnit = optionById(options.units, formData.unit_id)?.name ?? "unit";
  const packUnit =
    optionById(options.units, formData.issue_pack_unit_id)?.name ?? "pack";

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
      ModalProps={{ disableEscapeKeyDown: isSaving }}
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
          justifyContent="space-between"
          ml={-2}
          mb={1}
        >
          <Box display="flex" alignItems="center">
            <IconButton onClick={onClose} disabled={isSaving}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={700}>
              {isEdit ? "Edit Internal Item" : "Add Internal Item"}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <IconX />
          </IconButton>
        </Box>

        <Box
          component="form"
          onSubmit={onSubmit}
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Box sx={{ flex: 1, overflowY: "auto", pr: 1, pb: 2 }}>
            <Box
              display="flex"
              flexDirection={{ xs: "column", md: "row" }}
              gap={3}
            >
              {/* Image */}
              <Box
                {...dropzone.getRootProps()}
                sx={{
                  width: { xs: "100%", md: 160 },
                  minWidth: { md: 160 },
                  height: 160,
                  border: "2px dashed",
                  borderColor: dropzone.isDragActive
                    ? "primary.dark"
                    : "primary.main",
                  borderRadius: 2,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative",
                  bgcolor: dropzone.isDragActive
                    ? "action.hover"
                    : "transparent",
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <input {...dropzone.getInputProps()} accept=".jpg,.png,.jpeg" />
                {preview ? (
                  <>
                    <Image
                      src={preview}
                      alt="Internal item"
                      height={156}
                      width={156}
                      unoptimized={!!formData.image_file}
                      style={{ objectFit: "contain" }}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      sx={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        backgroundColor: "#fff",
                        boxShadow: 1,
                        zIndex: 2,
                        "&:hover": { backgroundColor: "#fff", color: "red" },
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData((prev) => ({
                          ...prev,
                          image_file: null,
                          image_url: null,
                          remove_image: true,
                        }));
                      }}
                    >
                      <IconTrash size={16} />
                    </IconButton>
                  </>
                ) : (
                  <Stack alignItems="center" spacing={0.5} px={1}>
                    <IconPhoto size={28} color="#9aa4b2" />
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      align="center"
                    >
                      Click or drag to upload
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      JPG or PNG
                    </Typography>
                  </Stack>
                )}
              </Box>

              <Grid container spacing={2.5} flex={1} alignContent="flex-start">
                <Grid size={{ xs: 12, md: 8 }}>
                  <Typography variant="body2" gutterBottom>
                    Select Product
                  </Typography>
                  <Autocomplete
                    className="product_input"
                    options={legacyOptions}
                    loading={legacyLoading}
                    value={selectedLegacy}
                    onChange={(_, value) => pickLegacy(value)}
                    onInputChange={(_, value, reason) => {
                      if (reason === "input") setLegacySearch(value);
                      if (reason === "clear") setLegacySearch("");
                    }}
                    filterOptions={(x) => x}
                    getOptionLabel={(o) => (o.uuid ? legacyLabel(o) : o.name)}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    getOptionDisabled={(o) =>
                      !!o.linked_internal_item &&
                      o.linked_internal_item.id !== formData.id
                    }
                    renderOption={(props, o) => (
                      <li {...props} key={o.id}>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                          width="100%"
                        >
                          <Image
                            src={o.image_url || "/images/products/product.svg"}
                            alt={o.name}
                            width={32}
                            height={32}
                            style={{ objectFit: "cover", borderRadius: 4 }}
                          />
                          <Box flex={1} minWidth={0}>
                            <Typography variant="body2" noWrap>
                              {o.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {o.uuid}
                              {o.is_sub_qty &&
                                ` · ${o.issue_pack_qty} per pack`}
                              {o.linked_internal_item &&
                                o.linked_internal_item.id !== formData.id &&
                                ` · linked to ${o.linked_internal_item.code}`}
                            </Typography>
                          </Box>
                        </Stack>
                      </li>
                    )}
                    renderInput={(params) => (
                      <CustomTextField
                        {...params}
                        placeholder="Search by name or UUID (optional)"
                      />
                    )}
                  />
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    display="block"
                    mt={0.5}
                  >
                    The old product this item replaces. Picking one fills the
                    empty fields from it.
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}></Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" gutterBottom>
                    Name
                  </Typography>
                  <CustomTextField
                    className="product_input"
                    placeholder="Name"
                    inputProps={{ maxLength: 50 }}
                    fullWidth
                    value={formData.name}
                    onChange={(e: any) => set("name", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" gutterBottom>
                    Code
                  </Typography>
                  <CustomTextField
                    className="product_input"
                    placeholder="e.g. COM-0001"
                    inputProps={{ maxLength: 50 }}
                    fullWidth
                    value={formData.code}
                    onChange={(e: any) => set("code", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant="body2" gutterBottom>
                    Category
                  </Typography>
                  <Autocomplete
                    className="product_selection"
                    options={options.categories}
                    value={optionById(options.categories, formData.category_id)}
                    onChange={(_, value) => set("category_id", value?.id ?? "")}
                    getOptionLabel={(o) => o.name}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    renderInput={(params) => (
                      <CustomTextField
                        {...params}
                        placeholder="Select category"
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md:4 }}>
                  <Typography variant="body2" gutterBottom>
                    Base Unit
                  </Typography>
                  <Autocomplete
                    className="product_input"
                    options={options.units}
                    value={optionById(options.units, formData.unit_id)}
                    onChange={(_, value) => set("unit_id", value?.id ?? "")}
                    getOptionLabel={(o) => o.name}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    renderInput={(params) => (
                      <CustomTextField
                        {...params}
                        placeholder="Smallest unit, e.g. each"
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant="body2" gutterBottom>
                    Market Price (£)
                  </Typography>
                  <CustomTextField
                    className="product_input"
                    placeholder="0.00"
                    fullWidth
                    value={formData.market_price}
                    onChange={(e: any) => {
                      const value = e.target.value;
                      // Numbers only, max 99999999.99 (2 decimal places)
                      if (!/^\d{0,8}(\.\d{0,2})?$/.test(value)) return;
                      set("market_price", value);
                    }}
                  />
                </Grid>
                {/* {isEdit && (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="body2" gutterBottom>
                      Base Price
                    </Typography>
                    <Tooltip title="Worked out from purchases and issues; it can't be edited">
                      <CustomTextField
                        className="product_input"
                        fullWidth
                        disabled
                        value={
                          formData.base_price === null
                            ? "-"
                            : `£${formData.base_price.toFixed(4)}`
                        }
                        InputProps={{ endAdornment: <IconLock size={16} /> }}
                      />
                    </Tooltip>
                  </Grid>
                )} */}
              </Grid>
            </Box>

            {/* Sub qty, like the product Pack Off fields */}
            <Box
              mt={3}
              p={2}
              border="1px solid"
              borderColor="divider"
              borderRadius={2}
              bgcolor={formData.is_sub_qty ? "transparent" : "action.hover"}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <IOSSwitch
                  checked={formData.is_sub_qty}
                  onChange={(_, value) => set("is_sub_qty", value)}
                />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Sub Qty
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Issue this item in packs as well as single {baseUnit}.
                  </Typography>
                </Box>
              </Stack>
              {formData.is_sub_qty && (
                <Grid container spacing={2.5} mt={0.5}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="body2" gutterBottom>
                      {baseUnit} per Pack
                    </Typography>
                    <CustomTextField
                      className="product_input"
                      fullWidth
                      placeholder="e.g. 12"
                      value={formData.issue_pack_qty}
                      onChange={(e: any) => {
                        const value = e.target.value;
                        if (!/^\d{0,6}$/.test(value)) return;
                        set("issue_pack_qty", value);
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="body2" gutterBottom>
                      Pack Unit
                    </Typography>
                    <Autocomplete
                      className="product_input"
                      options={options.units}
                      value={optionById(
                        options.units,
                        formData.issue_pack_unit_id,
                      )}
                      onChange={(_, value) =>
                        set("issue_pack_unit_id", value?.id ?? "")
                      }
                      getOptionLabel={(o) => o.name}
                      isOptionEqualToValue={(o, v) => o.id === v.id}
                      renderInput={(params) => (
                        <CustomTextField {...params} placeholder="e.g. box" />
                      )}
                    />
                  </Grid>
                  {Number(formData.issue_pack_qty) > 1 && (
                    <Grid
                      size={{ xs: 12, md: 6 }}
                      display="flex"
                      alignItems="flex-end"
                    >
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{
                          px: 1.5,
                          py: 1,
                          width: "100%",
                        }}
                      >
                        1 {packUnit} = {formData.issue_pack_qty} {baseUnit}.
                        Orders can be &quot;2 {packUnit} + 5 {baseUnit}&quot;.
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
            </Box>

            <Box mt={3}>
              <Typography variant="body2" gutterBottom>
                Description
              </Typography>
              <CustomTextField
                className="product_input"
                placeholder="Description"
                fullWidth
                multiline
                minRows={3}
                value={formData.description}
                onChange={(e: any) => set("description", e.target.value)}
              />
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "start",
              gap: 2,
              pt: 2,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Button
              color="primary"
              variant="contained"
              size="large"
              type="submit"
              disabled={isSaving}
              sx={{ borderRadius: 3, minWidth: 120 }}
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
        </Box>
      </Box>
    </Drawer>
  );
};

export default InternalItemDrawer;
