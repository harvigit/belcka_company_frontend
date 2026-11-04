import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Drawer,
  Fab,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { IconLock, IconPhoto, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import QuickAddCategory from "../shared/QuickAddCategory";
import { cleanUuidInput, useItemUuid } from "../shared/useItemUuid";
import toast from "react-hot-toast";
import {
  InventoryOption,
  InventoryOptions,
} from "../shared/useInventoryOptions";

export interface InternalItemForm {
  id?: number;
  // empty on add generates one (INT-0001)
  uuid: string;
  code: string;
  name: string;
  description: string;
  category_id: number | "";
  unit_id: number | "";
  market_price: string;
  is_sub_qty: boolean;
  issue_pack_qty: string;
  issue_pack_unit_id: number | "";
  base_price: number | null;
  image_file: File | null;
  image_url: string | null;
  remove_image: boolean;
}

export const emptyInternalItem: InternalItemForm = {
  uuid: "",
  code: "",
  name: "",
  description: "",
  category_id: "",
  unit_id: "",
  market_price: "",
  is_sub_qty: false,
  issue_pack_qty: "",
  issue_pack_unit_id: "",
  base_price: null,
  image_file: null,
  image_url: null,
  remove_image: false,
};

interface InternalItemDrawerProps {
  open: boolean;
  onClose: () => void;
  formData: InternalItemForm;
  setFormData: React.Dispatch<React.SetStateAction<InternalItemForm>>;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  options: InventoryOptions;
  companyId?: number | null;
  onOptionsChanged?: () => Promise<void> | void;
}

const InternalItemDrawer: React.FC<InternalItemDrawerProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isSaving,
  options,
  companyId,
  onOptionsChanged,
}) => {
  const isEdit = !!formData.id;
  const [quickCategoryOpen, setQuickCategoryOpen] = useState(false);
  const set = (name: keyof InternalItemForm, value: any) =>
    setFormData((prev) => ({ ...prev, [name]: value }));
  const { uuidError, uuidChecking } = useItemUuid(
    "internal",
    open,
    companyId,
    formData.id,
    formData.uuid,
    (uuid) => set("uuid", uuid),
  );
  const submit = (e: React.FormEvent) => {
    if (uuidError) {
      e.preventDefault();
      toast.error(uuidError);
      return;
    }
    onSubmit(e);
  };

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
          onSubmit={submit}
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
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" gutterBottom>
                    UUID
                  </Typography>
                  <CustomTextField
                    className="product_input"
                    placeholder="e.g. INT-0001"
                    inputProps={{ maxLength: 50 }}
                    fullWidth
                    value={formData.uuid}
                    error={!!uuidError}
                    onChange={(e: any) => set("uuid", cleanUuidInput(e.target.value))}
                  />
                  <Typography
                    variant="caption"
                    color={uuidError ? "error" : "textSecondary"}
                    display="block"
                    mt={0.5}
                  >
                    {uuidError ??
                      (isEdit
                        ? "Unique in the company."
                        : "Generated for you; you can change it. Must be unique in the company.")}
                  </Typography>
                </Grid>
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
                  <Box display="flex" alignItems="center" gap={1}>
                    <Autocomplete
                      className="product_selection"
                      fullWidth
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
                    <Tooltip title="Add category">
                      <Fab
                        color="primary"
                        size="small"
                        sx={{ flexShrink: 0 }}
                        onClick={() => setQuickCategoryOpen(true)}
                      >
                        <IconPlus size={14} />
                      </Fab>
                    </Tooltip>
                  </Box>
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
              disabled={isSaving || uuidChecking}
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

      <QuickAddCategory
        open={quickCategoryOpen}
        onClose={() => setQuickCategoryOpen(false)}
        companyId={companyId ?? null}
        onCreated={async (id) => {
          await onOptionsChanged?.();
          set("category_id", id);
        }}
      />
    </Drawer>
  );
};

export default InternalItemDrawer;
