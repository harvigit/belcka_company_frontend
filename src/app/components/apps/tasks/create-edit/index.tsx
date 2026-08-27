"use client";
import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  Autocomplete,
  TextField,
  Dialog,
} from "@mui/material";
import { Grid } from "@mui/system";
import { IconTrash, IconX } from "@tabler/icons-react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useDropzone } from "react-dropzone";
import api from "@/utils/axios";
import Image from "next/image";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import toast from "react-hot-toast";

export interface TaskFormData {
  id: number;
  company_id: any;
  trade_id?: number | null;
  category_id?: number | string | null;
  sub_category_id?: number | string | null;
  shift_id?: number | null;
  duration?: string;
  project?: string;
  project_ids?: any[];
  note?: string;
  is_show?: boolean;
}

interface TaskAddEditProps {
  open: boolean;
  companyId: number | null;
  onClose: () => void;
  formData: TaskFormData;
  setFormData: React.Dispatch<React.SetStateAction<TaskFormData>>;
  handleSubmit: (
    e: React.FormEvent,
    galleryFiles: File[],
    removedImageIds: number[],
  ) => void;
  isSaving: boolean;
  isEdit?: boolean;
  taskId?: number | null;
}

type GalleryImage = {
  id?: number;
  src: string;
  thumb?: string;
  isExisting?: boolean;
  type?: string;
};

const TaskAddEdit: React.FC<TaskAddEditProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  isSaving,
  companyId,
  isEdit,
  taskId,
}) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [fetchStore, setFetchStore] = useState<boolean>(false);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreview, setGalleryPreview] = useState<GalleryImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [task, setTask] = useState<any>([]);
  const [openPreview, setOpenPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [tradeError, setTradeError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [shiftError, setShiftError] = useState("");

  const isRequiredEmpty = (value: number | string | null | undefined) =>
    value === undefined ||
    value === null ||
    value === 0 ||
    String(value).trim() === "";

  const isCategoryEmpty = (value: TaskFormData["category_id"]) =>
    isRequiredEmpty(value);

  const getTradeValidationError = (value: TaskFormData["trade_id"]) =>
    isRequiredEmpty(value) ? "Trade is required" : "";

  const getShiftValidationError = (value: TaskFormData["shift_id"]) =>
    isRequiredEmpty(value) ? "Shift is required" : "";

    const getCategoryValidationError = (value: TaskFormData["category_id"]) => {
        if (isCategoryEmpty(value)) return "Category is required";

        const isExistingId = categories.some(
            (category) => String(category.id) === String(value),
        );
        const isFreeTypedName =
            typeof value === "string" && value.trim() !== "" && isNaN(Number(value));

        return isExistingId || isFreeTypedName ? "" : "Category not exists!";
    };

  const fetchTask = async () => {
    if (!taskId || fetching) return;

    setFetching(true);
    try {
      const res = await api.get(
        `tasks/get?company_id=${companyId}&id=${taskId}`,
      );
      if (res.data) {
        setTask(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch task", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (taskId && open == true) {
      fetchTask();
    }
  }, [open, taskId]);

  useEffect(() => {
    if (open) {
      setFormData({
        id: 0,
        company_id: companyId,
        trade_id: null,
        category_id: null,
        sub_category_id: null,
        shift_id: null,
        duration: "",
        project: "All",
        project_ids: [],
        note: "",
        is_show: false,
      });

      setGalleryFiles([]);
      setGalleryPreview([]);
      setRemovedImageIds([]);
      setTradeError("");
      setCategoryError("");
      setShiftError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isEdit) return;

    setFormData({
      id: task.id,
      company_id: companyId,

      trade_id: task.trade_id ?? null,
      category_id: task.category_id ?? null,
      sub_category_id: task.sub_category_id ?? null,
      shift_id: task.shift_id ?? null,

      duration: task.duration ?? "",
      project: task.project ?? "All",
      project_ids: task.project_ids ?? [],
      note: task.note ?? "",
      is_show: Boolean(task.is_show),
    });

    setGalleryPreview(
      (task.task_images ?? []).map((img: any) => ({
        id: img.id,
        src: img.image_url,
        isExisting: true,
        type: img.image_url?.toLowerCase().endsWith(".pdf")
          ? "application/pdf"
          : "image/jpeg",
      })),
    );

    setGalleryFiles([]);
    setRemovedImageIds([]);
  }, [open, isEdit, task]);

  const handleRemoveGalleryImage = (item: GalleryImage, index: number) => {
    setGalleryPreview((prev) => prev.filter((_, i) => i !== index));

    if (item.isExisting && item.id) {
      setRemovedImageIds((prev: any) => [...prev, item.id]);
    } else {
      setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const fetchResources = async () => {
    setFetchStore(true);

    try {
      let url = `tasks/get-resources?company_id=${companyId}`;
      const res = await api.get(url);
      if (res.data) {
        setCategories(res.data.categories);
        setSubCategories(res.data.subCategories);
        setShifts(res.data.shifts);
        setTrades(res.data.trades);
        setProjects(res.data.projects || []);
      }
    } catch (err) {
      console.error("Failed to fetch inventory resources", err);
    }
    setFetchStore(false);
  };

  useEffect(() => {
    fetchResources();
  }, [open]);

  const galleryDropzone = useDropzone({
    accept: { "image/*": [], "application/pdf": [".pdf"] },
    multiple: true,
    onDrop: (files) => {
      setGalleryFiles((p) => [...p, ...files]);
      setGalleryPreview((p) => [
        ...p,
        ...files.map((file) => ({
          src: URL.createObjectURL(file),
          isExisting: false,
          type: file.type,
        })),
      ]);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    const tradeValidationError = getTradeValidationError(formData.trade_id);
    const categoryValidationError = getCategoryValidationError(
      formData.category_id,
    );
    const shiftValidationError = getShiftValidationError(formData.shift_id);

    setTradeError(tradeValidationError);
    setCategoryError(categoryValidationError);
    setShiftError(shiftValidationError);

    const error =
      tradeValidationError || categoryValidationError || shiftValidationError;

    if (error) {
      e.preventDefault();
      toast.error(error);
      return;
    }

    handleSubmit(e, galleryFiles, removedImageIds);
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 0,
          height: "90vh",
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
              {isEdit ? "Edit Task" : "Add Task"}
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
              <Grid size={{ xs: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Show
                </Typography>

                <Box display="flex" alignItems="center">
                  <IOSSwitch
                    checked={Boolean(formData.is_show)}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_show: e.target.checked,
                      }))
                    }
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box display={"flex"} justifyItems={"center"} gap={3}>
                  <Box
                    width={"100%"}
                    display={"flex"}
                    justifyContent={"center"}
                    alignItems={"center"}
                    gap={1}
                  >
                    <Box width={"100%"}>
                      {/* Trade */}
                      <Typography variant="body2" gutterBottom>
                        Trade
                      </Typography>

                      <Autocomplete
                        options={trades}
                        getOptionLabel={(option) => option.name}
                        value={
                          trades.find(
                            (item) => item.id === formData.trade_id,
                          ) ?? null
                        }
                        onChange={(_, value) => {
                          setTradeError("");
                          setFormData((prev) => ({
                            ...prev,
                            trade_id: value?.id ?? null,
                          }));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select Trade"
                            required
                            error={Boolean(tradeError)}
                            helperText={tradeError}
                          />
                        )}
                      />
                    </Box>
                  </Box>
                  <Box width={"100%"}>
                    {/* Category */}
                    <Typography variant="body2" gutterBottom>
                      Category
                    </Typography>

                    <Autocomplete
                      freeSolo
                      options={categories}
                      getOptionLabel={(option) => typeof option === "string" ? option : option.name}
                      value={
                        categories.find(
                          (item) => item.id === formData.category_id,
                        ) ?? (formData.category_id || null)
                      }
                      onChange={(_, value) => {
                        const val = typeof value === "string" ? value : (value?.id ?? null);
                        setCategoryError("");
                        setFormData((prev) => ({
                          ...prev,
                          category_id: val,
                          sub_category_id: null, // Reset sub category when category changes
                        }));
                      }}
                      onInputChange={(_, newInputValue, reason) => {
                        if (reason === "input" || reason === "clear") {
                          setCategoryError("");
                          setFormData((prev) => ({
                            ...prev,
                            category_id: newInputValue || null,
                            sub_category_id: null,
                          }));
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Select Category"
                          required
                          error={Boolean(categoryError)}
                          helperText={categoryError}
                        />
                      )}
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
                        Sub Category
                      </Typography>

                      <Autocomplete
                        freeSolo
                        options={subCategories.filter((sc) => sc.category_id === formData.category_id)}
                        getOptionLabel={(option) => typeof option === "string" ? option : option.name}
                        value={
                          subCategories.find(
                            (item) => item.id === formData.sub_category_id,
                          ) ?? (formData.sub_category_id || null)
                        }
                        onChange={(_, value) => {
                          const val = typeof value === "string" ? value : (value?.id ?? null);
                          setFormData((prev) => ({
                            ...prev,
                            sub_category_id: val,
                          }));
                        }}
                        onInputChange={(_, newInputValue, reason) => {
                          if (reason === "input" || reason === "clear") {
                            setFormData((prev) => ({
                              ...prev,
                              sub_category_id: newInputValue || null,
                            }));
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select Sub Category"
                          />
                        )}
                      />
                    </Box>
                  </Box>
                  <Box width={"100%"}>
                    {/* Category */}
                    <Typography variant="body2" gutterBottom>
                      Shift
                    </Typography>

                    <Autocomplete
                      options={shifts}
                      getOptionLabel={(option) => option.name}
                      value={
                        shifts.find((item) => item.id === formData.shift_id) ??
                        null
                      }
                      onChange={(_, value) => {
                        setShiftError("");
                        setFormData((prev) => ({
                          ...prev,
                          shift_id: value?.id ?? null,
                        }));
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Select Shift"
                          required
                          error={Boolean(shiftError)}
                          helperText={shiftError}
                        />
                      )}
                    />
                  </Box>
                </Box>

                {/* Weight & Unit */}
                <Grid container spacing={3} mt={2}>
                  <Grid size={{ xs: 3 }}>
                    {/* Manufacture */}
                    <Typography variant="body2" gutterBottom>
                      Project
                    </Typography>
                    <Autocomplete
                      multiple
                      options={[
                        { id: "ALL", name: "All Projects" },
                        ...projects,
                      ]}
                      getOptionLabel={(option) => option.name}
                      value={
                        formData.project_ids && formData.project_ids.length > 0
                          ? projects.filter((p) =>
                            formData.project_ids?.includes(p.id),
                          )
                          : [{ id: "ALL", name: "All Projects" }]
                      }
                      onChange={(_, value, reason, details) => {
                        if (details?.option?.id === "ALL") {
                          setFormData((prev) => ({
                            ...prev,
                            project: "All",
                            project_ids: [],
                          }));
                        } else {
                          const filtered = value.filter((v) => v.id !== "ALL");
                          if (filtered.length === 0) {
                            setFormData((prev) => ({
                              ...prev,
                              project: "All",
                              project_ids: [],
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              project: "Part",
                              project_ids: filtered.map((v) => v.id),
                            }));
                          }
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          className="product_input"
                          placeholder="Select"
                          fullWidth
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 3 }}>
                    <Typography variant="body2" gutterBottom>
                      Duration (m)
                    </Typography>

                    <TextField
                      className="product_input"
                      placeholder="Enter duration..."
                      fullWidth
                      inputProps={{ maxLength: 150 }}
                      value={formData.duration || ""}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 11);

                        setFormData((prev) => ({
                          ...prev,
                          duration: value,
                        }));
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" gutterBottom>
                      Note
                    </Typography>

                    <TextField
                      className="product_input"
                      placeholder="Enter note..."
                      fullWidth
                      rows={1}
                      inputProps={{ maxLength: 150 }}
                      value={formData.note || ""}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          note: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                </Grid>

                <Grid spacing={3} container>
                  <Grid size={{ xs: 6 }}>
                    {/* Images Upload */}
                    <Typography variant="body2" gutterBottom mb={1}>
                      Images
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
                        accept=".jpg,.png,.jpeg,.pdf"
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
                                  cursor: "pointer",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const isPdf =
                                    item.type === "application/pdf" ||
                                    item.src?.toLowerCase().endsWith(".pdf");
                                  if (isPdf) {
                                    window.open(item.src, "_blank");
                                  } else {
                                    setPreviewImage(item.src);
                                    setOpenPreview(true);
                                  }
                                }}
                              >
                                {item.type === "application/pdf" ||
                                  item.src?.toLowerCase().endsWith(".pdf") ? (
                                  <Box
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    height="100%"
                                    bgcolor="#f5f5f5"
                                  >
                                    <Typography
                                      variant="body2"
                                      fontWeight={600}
                                      color="textSecondary"
                                    >
                                      PDF
                                    </Typography>
                                  </Box>
                                ) : (
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
                                  />
                                )}

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
            onClick={handleSave}
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
      </Box>
    </Drawer>
  );
};

export default TaskAddEdit;
