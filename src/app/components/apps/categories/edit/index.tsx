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

interface EditCategoryProps {
  open: boolean;
  companyId: number | null;
  supplierId: number | null;
  onClose: () => void;
  isSaving: boolean;
  formData: CategoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  EditCategory: (e: React.FormEvent) => void;
}

const EditCategory: React.FC<EditCategoryProps> = ({
  open,
  onClose,
  companyId,
  supplierId,
  isSaving,
  EditCategory,
  formData,
  setFormData,
}) => {
  const [units, setUnits] = useState<any[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  // Crop states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCrop, setShowCrop] = useState(false);

  // Image helper
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous"; // important for backend images
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

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    if (!preview || !croppedAreaPixels) return;

    const croppedFile = await getCroppedImg(preview, croppedAreaPixels);
    setFormData((prev) => ({ ...prev, image: croppedFile }));
    setPreview(URL.createObjectURL(croppedFile));
    setShowCrop(false);
  };
  // Dropzone
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

  const fetchCategories = async () => {
    try {
      const res = await api.get(`categories/get?company_id=${companyId}`);
      if (res.data) setUnits(res.data.info);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  const fetchSupplier = async () => {
    if (!supplierId || !companyId) return;
    try {
      const res = await api.get(
        `categories/get?company_id=${companyId}&id=${supplierId}`,
      );
      if (res.data?.info) {
        const data = res.data.info[0];

        setFormData({
          id: data.id,
          company_id: data.company_id,
          name: data.name,
          image: null,
          parent_category_id: data.parent_category_id,
          parent_category_name: data.parent_category_name,
          status: data.status,
        });

        if (data.thumb_url) {
          setPreview(data.thumb_url);
        }
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    }
  };

  useEffect(() => {
    if (open) {
      setPreview(null);
      fetchCategories();
      fetchSupplier();
    }
  }, [open, supplierId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
              Edit Category
            </Typography>
          </Box>

          <Box height="100%" px={2}>
            <form onSubmit={EditCategory} className="category-form">
              <Box display="flex" justifyContent="end">
                <IOSSwitch
                  checked={Boolean(formData.status)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.checked,
                    }))
                  }
                />
              </Box>

              <Box className="form_inputs">
                <Typography variant="body2">Name</Typography>
                <CustomTextField
                  name="name"
                  fullWidth
                  value={formData.name}
                  onChange={handleChange}
                />

                <Typography variant="body2" mt={2}>
                  Parent Category
                </Typography>
                <Autocomplete
                  fullWidth
                  options={units}
                  value={
                    units.find((t) => t.id === formData.parent_category_id) ??
                    null
                  }
                  onChange={(e, val) =>
                    setFormData((prev) => ({
                      ...prev,
                      parent_category_id: val ? val.id : null,
                    }))
                  }
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      placeholder="Select category"
                    />
                  )}
                />

                {/* Image Upload */}
                <InputLabel sx={{ mt: 2 }}>Upload file</InputLabel>
                <Box mt={2} textAlign="center">
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

      {/* Crop Dialog */}
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

export default EditCategory;
