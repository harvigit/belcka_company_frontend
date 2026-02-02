import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  InputLabel,
  Autocomplete,
  Avatar,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import IOSSwitch from "@/app/components/common/IOSSwitch";

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
  const [file, setFile] = useState<File | null>(null);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      const selectedFile = acceptedFiles[0];
      if (!selectedFile) return;

      setFile(selectedFile);
      setFormData((prev) => ({ ...prev, image: selectedFile }));
      setPreview(URL.createObjectURL(selectedFile));
    },
    onDropRejected: () => {
      toast.error("Please upload a valid image file");
    },
  });

  const fetchCategories = async () => {
    try {
      const res = await api.get(`categories/get?company_id=${companyId}`);
      if (res.data) {
        setUnits(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch units", err);
    }
  };

  // Fetch supplier record
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

        if (data.category_image) {
          setPreview(`${data.category_image}`);
        }
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    }
  };

  useEffect(() => {
    if (open) {
      setPreview(null)
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
          <form
            onSubmit={EditCategory}
            className="category-form"
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          >
            <Box display={"flex"} justifyContent={"end"}>
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
            <Box className="form_inputs">
              <Typography variant="body1">Name</Typography>
              <CustomTextField
                name="name"
                fullWidth
                value={formData.name}
                onChange={handleChange}
              />

              <Typography variant="body1" mt={2}>
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
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <CustomTextField {...params} placeholder="Select category" />
                )}
              />

              {/* File Upload */}
              <InputLabel htmlFor="file-upload" sx={{ mt: 2 }}>
                Upload file
              </InputLabel>
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
                    position: "relative",
                    overflow: "hidden",
                    "&:hover": {
                      backgroundColor: "primary.light",
                    },
                  }}
                >
                  <input {...getInputProps()} accept=".jpg,.png,.jpeg" />
                  {preview ? (
                    <Avatar
                      src={preview}
                      alt="Preview"
                      sx={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <Typography fontSize="12px" color="primary.main">
                      Click or Drag <br />
                      Image
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
  );
};

export default EditCategory;
