import React, { useEffect, useState, useCallback } from "react";
import {
  Drawer,
  Box,
  Grid,
  IconButton,
  Typography,
  Button,
  CircularProgress,
  InputLabel,
  Avatar,
  Dialog,
  DialogContent,
  Slider,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import Cropper from "react-easy-crop";

interface FormData {
  id: number;
  name: string;
  company_id: string | number;
  is_transport_category: boolean;
  image?: File | null;
}

interface EditExpenseCategoryProps {
  id: number | null;
  open: boolean;
  onClose: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  EditExpenseCategory: (e: React.FormEvent) => void;
  isSaving: boolean;
}

const EditExpenseCategory: React.FC<EditExpenseCategoryProps> = ({
  id,
  open,
  onClose,
  formData,
  setFormData,
  EditExpenseCategory,
  isSaving,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCrop, setShowCrop] = useState(false);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = (error) => reject(error);
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any,
  ): Promise<File> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx?.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        resolve(new File([blob], "cropped.png", { type: "image/png" }));
      }, "image/png");
    });
  };

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCropSave = async () => {
    if (!preview || !croppedAreaPixels) return;

    const croppedFile = await getCroppedImg(preview, croppedAreaPixels);

    setFormData((prev) => ({ ...prev, image: croppedFile }));
    setPreview(URL.createObjectURL(croppedFile));
    setShowCrop(false);
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      const selectedFile = acceptedFiles[0];
      if (!selectedFile) return;

      setCrop({ x: 0, y: 0 });
      setZoom(1);

      setPreview(URL.createObjectURL(selectedFile));
      setShowCrop(true);
    },
    onDropRejected: () => {
      toast.error("Please upload a valid image file");
    },
  });

  // Fetch category data when drawer opens with a valid id
  const fetchCategory = useCallback(async () => {
    if (!id || !open) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`expense-categories/get?category_id=${id}`);

      if (res.data?.info?.[0]) {
        const task = res.data.info[0];

        setFormData({
          id: task.id,
          name: task.name || "",
          company_id: task.company_id || "",
          is_transport_category: task.is_transport_category ?? false,
          image: null,
        });

        if (task.image_url) {
          setPreview(task.image_url);
        } else {
          setPreview(null);
        }
      } else {
        setError("Category not found");
      }
    } catch (err: any) {
      console.error("Failed to fetch expense category", err);
      setError(err?.response?.data?.message || "Failed to load category");
    } finally {
      setLoading(false);
    }
  }, [id, open, setFormData]);

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleTransportToggle = () => {
    setFormData((prev) => ({
      ...prev,
      is_transport_category: !prev.is_transport_category,
    }));
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        sx={{
          width: 400,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 400,
            padding: 2,
            backgroundColor: "#f9f9f9",
          },
        }}
      >
        <Box display="flex" flexDirection="column" height="100%">
          <Box height={"100%"}>
            <form onSubmit={EditExpenseCategory} className="address-form">
              <Grid container>
                <Grid size={{ lg: 12, xs: 12 }}>
                  <Box
                    display={"flex"}
                    alignContent={"center"}
                    alignItems={"center"}
                    flexWrap={"wrap"}
                  >
                    <IconButton onClick={handleClose}>
                      <IconArrowLeft />
                    </IconButton>
                    <Typography variant="h6" fontWeight={700}>
                      Edit Expense Category
                    </Typography>
                  </Box>

                  {loading && (
                    <Box display="flex" justifyContent="center" my={4}>
                      <CircularProgress />
                    </Box>
                  )}

                  {error && (
                    <Typography color="error" sx={{ mt: 2 }}>
                      {error}
                    </Typography>
                  )}

                  {!loading && !error && (
                    <>
                      <Typography variant="body2" mt={2}>
                        Name
                      </Typography>
                      <CustomTextField
                        id="name"
                        name="name"
                        className="custom_input"
                        placeholder="Enter name.."
                        value={formData.name}
                        onChange={handleChange}
                        variant="outlined"
                        fullWidth
                      />

                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        mt={2}
                        px={1.5}
                        py={1.5}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          backgroundColor: "background.paper",
                        }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            Transport category
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Mark this as a transport expense
                          </Typography>
                        </Box>
                        <IOSSwitch
                          checked={formData.is_transport_category}
                          onChange={handleTransportToggle}
                        />
                      </Box>

                      <InputLabel sx={{ mt: 2 }}>Upload Image</InputLabel>
                      <Box mt={2} mb={2} textAlign="center">
                        <Box
                          {...getRootProps()}
                          sx={{
                            width: 180,
                            height: 180,
                            mx: "auto",
                            border: "2px dashed",
                            borderColor: "primary.main",
                            borderRadius: 3,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          <input {...getInputProps()} />
                          {preview ? (
                            <Avatar
                              src={preview}
                              sx={{ width: "100%", height: "100%" }}
                              variant="square"
                            />
                          ) : (
                            <Typography fontSize="12px" color="primary.main">
                              Click or Drag Image
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </>
                  )}
                </Grid>
              </Grid>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "start",
                  gap: 2,
                  mt: 2,
                }}
              >
                <Button
                  color="primary"
                  variant="contained"
                  size="large"
                  type="submit"
                  disabled={isSaving || loading}
                  sx={{ borderRadius: 3 }}
                  className="drawer_buttons"
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  color="inherit"
                  onClick={handleClose}
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
            </form>
          </Box>
        </Box>
      </Drawer>
      <Dialog open={showCrop} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box position="relative" width="100%" height={400}>
            <Cropper
              image={preview!}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid={true}
              objectFit="cover"
              restrictPosition={true}
              minZoom={0.5}
              maxZoom={3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </Box>

          <Box mt={2}>
            <Typography gutterBottom>Zoom</Typography>
            <Slider
              value={zoom}
              min={0.5}
              max={3}
              step={0.1}
              onChange={(_, value) => setZoom(value as number)}
            />
          </Box>

          <Box mt={2} display="flex" justifyContent="space-between">
            <Button onClick={() => setShowCrop(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleCropSave}>
              Crop & Save
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditExpenseCategory;
