import React, { useEffect, useState, useCallback } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  InputLabel,
  Autocomplete,
  Avatar,
  Dialog,
  DialogContent,
  Slider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import Cropper from "react-easy-crop";

interface CategoryFormData {
  id: number;
  company_id: any;
  name: string;
  image?: File | null;
  parent_category_id?: number | null;
  parent_category_name?: string | null;
  status: boolean;
}

interface CreateCategoryProps {
  open: boolean;
  companyId: number | null;
  onClose: () => void;
  formData: CategoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
}

const CreateCategory: React.FC<CreateCategoryProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  isSaving,
  companyId,
}) => {
  const [units, setUnits] = useState<any[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCrop, setShowCrop] = useState(false);

  // Create image helper
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get(`categories/get?company_id=${companyId}`);
      if (res.data) setUnits(res.data.info);
    } catch (err) {
      console.error("Failed to fetch units", err);
    }
  };

  useEffect(() => {
    fetchCategories();
    if (open) setPreview(null);
  }, [open]);

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
          width: 480,
          "& .MuiDrawer-paper": { width: 480, backgroundColor: "#f9f9f9" },
        }}
      >
        <Box display="flex" flexDirection="column" height="100%">
          <Box display="flex" alignItems="center" p={1}>
            <IconButton onClick={onClose}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={700}>
              Add Category
            </Typography>
          </Box>

          <Box height="100%" px={2}>
            <form
              onSubmit={handleSubmit}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            >
              <Box display="flex" justifyContent="end">
                <IOSSwitch
                  checked={Boolean(formData.status)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.checked,
                    }))
                  }
                  color="success"
                />
              </Box>

              <Typography>Name</Typography>
              <CustomTextField
                name="name"
                fullWidth
                value={formData.name}
                onChange={handleChange}
              />

              <Typography mt={2}>Parent Category</Typography>
              <Autocomplete
                fullWidth
                options={units}
                value={
                  units.find((t) => t.id === formData.parent_category_id) ??
                  null
                }
                onChange={(_, newValue: any) =>
                  setFormData((prev) => ({
                    ...prev,
                    parent_category_id: newValue?.id ?? null,
                  }))
                }
                getOptionLabel={(option: any) => option.name}
                renderInput={(params) => (
                  <CustomTextField
                    {...params}
                    placeholder="Select parent category"
                  />
                )}
              />

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

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "start",
                  gap: 2,
                  mt: "auto",
                  mb: 2,
                }}
              >
                <Button
                  color="primary"
                  variant="contained"
                  size="large"
                  type="submit"
                  disabled={isSaving}
                  sx={{ borderRadius: 3 }}
                  className="drawer_buttons"
                >
                  {isSaving ? "Saving..." : "Save"}
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
            </form>
          </Box>
        </Box>
      </Drawer>

      {/* Improved Crop Dialog */}
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
              minZoom={1}
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
              min={1}
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

export default CreateCategory;
