import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  InputLabel,
  Avatar,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import "react-phone-input-2/lib/material.css";
import PhoneInput from "react-phone-input-2";
import IOSSwitch from "@/app/components/common/IOSSwitch";

interface SupplierFormData {
  id: number;
  company_id: number | string;
  name: string;
  email?: string;
  company_name?: string;
  supplier_image?: File | null;
  account_number?: string;
  street?: string;
  location?: string;
  town?: string;
  postcode?: string;
  phone?: string;
  extension?: string;
  weight?: string;
  weight_unit?: string | null;
  status: boolean;
  contact_person_email?: string;
  contact_person_name?: string;
  contact_person_phone?: string;
  contact_person_extension?: string;
}

interface EditSupplierProps {
  open: boolean;
  companyId: number | null;
  onClose: () => void;
  formData: SupplierFormData;
  setFormData: React.Dispatch<React.SetStateAction<SupplierFormData>>;
  EditSupplier: (e: React.FormEvent) => void;
  isSaving: boolean;
  supplierId: number | null;
}

const EditSupplier: React.FC<EditSupplierProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  EditSupplier,
  isSaving,
  companyId,
  supplierId,
}) => {
  const [units, setUnits] = useState<any[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phone, setPhone] = useState("");
  const [extension, setExtension] = useState("+44");
  const [nationalPhone, setNationalPhone] = useState("");
  const [phone1, setPhone1] = useState("");
  const [extension1, setExtension1] = useState("+44");
  const [nationalPhone1, setNationalPhone1] = useState("");
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
      setFormData((prev) => ({ ...prev, supplier_image: selectedFile }));
      setPreview(URL.createObjectURL(selectedFile));
    },
    onDropRejected: () => {
      toast.error("Please upload a valid image file");
    },
  });

  const fetchSupplier = async () => {
    if (!supplierId || !companyId) return;

    try {
      const res = await api.get(
        `suppliers/get?company_id=${companyId}&id=${supplierId}`,
      );

      if (res.data && res.data.info) {
        const supplier = res.data.info[0];

        setFormData({
          id: supplier.id,
          company_id: supplier.company_id,
          name: supplier.name,
          email: supplier.email || "",
          company_name: supplier.company_name || "",
          supplier_image: null,
          account_number: supplier.account_number || "",
          street: supplier.street || "",
          location: supplier.location || "",
          town: supplier.town || "",
          postcode: supplier.postcode || "",
          phone: supplier.phone || "",
          extension: supplier.extension || "+44",
          weight: supplier.weight || "",
          weight_unit: supplier.unit_name || "",
          status: supplier.status ?? true,
          contact_person_email: supplier.contact_person_email || "",
          contact_person_name: supplier.contact_person_name || "",
          contact_person_extension: supplier.contact_person_extension || "+44",
          contact_person_phone: supplier.contact_person_phone || "",
        });

        // Prefill image preview
        if (supplier.image_url) {
          setPreview(supplier.image_url);
        }
      }
    } catch (error) {
      console.error("Failed to fetch supplier", error);
      toast.error("Failed to load supplier data");
    }
  };

  useEffect(() => {
    if (open) {
      fetchSupplier();
    }
  }, [open, supplierId, companyId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchUnits = async () => {
    try {
      const res = await api.get(`units/get?company_id=${companyId}&type=2`);
      if (res.data) {
        setUnits(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch units", err);
    }
  };

  useEffect(() => {
    fetchUnits();
    if (open == true) {
      setPreview(null);
    }
  }, [open == true]);
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
        <Box display="flex" alignItems="center" p={1} pb={0}>
          <IconButton onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            Edit Supplier
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            paddingRight: 1,
            px: 2,
          }}
        >
          <form
            className="address-form"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
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
              <Typography variant="body1">Supplier Name</Typography>
              <CustomTextField
                name="name"
                className="f-14"
                fullWidth
                value={formData.name}
                onChange={handleChange}
              />
              <Typography variant="body1" mt={2}>
                Email
              </Typography>
              <CustomTextField
                fullWidth
                name="email"
                value={formData.email || ""}
                onChange={handleChange}
              />

              <Typography variant="body1" mt={2}>
                Company Name
              </Typography>
              <CustomTextField
                fullWidth
                name="company_name"
                value={formData.company_name || ""}
                onChange={handleChange}
              />
              <Typography variant="body1" mt={2}>
                Account Number
              </Typography>

              <CustomTextField
                fullWidth
                name="account_number"
                value={formData.account_number || ""}
                onChange={handleChange}
              />

              <Typography variant="body1" mt={2}>
                Contact Person Name
              </Typography>

              <CustomTextField
                fullWidth
                name="contact_person_name"
                value={formData.contact_person_name || ""}
                onChange={handleChange}
              />

              <Typography variant="body1" mt={2}>
                Contact Person Email
              </Typography>

              <CustomTextField
                fullWidth
                type="email"
                name="contact_person_email"
                value={formData.contact_person_email || ""}
                onChange={handleChange}
              />

              <Typography variant="body1" mt={2}>
                Contact Person Phone
              </Typography>
              <PhoneInput
                country={"gb"}
                value={phone1}
                onChange={(value, country: any) => {
                  setPhone1(value);
                  setExtension1("+" + country.dialCode);

                  const numberOnly = value.replace(country.dialCode, "");
                  setNationalPhone1(numberOnly);
                  setFormData({
                    ...formData,
                    contact_person_phone: nationalPhone1,
                    contact_person_extension: extension1,
                  });
                }}
                inputStyle={{
                  width: "100%",
                  height: "47px",
                  borderColor: "#c0d1dc9c",
                }}
                enableSearch
                inputProps={{ required: true }}
              />

              <Typography variant="body1" mt={2}>
                Street
              </Typography>
              <CustomTextField
                fullWidth
                name="street"
                value={formData.street || ""}
                onChange={handleChange}
              />
              <Typography variant="body1" mt={2}>
                Location
              </Typography>

              <CustomTextField
                fullWidth
                name="location"
                value={formData.location || ""}
                onChange={handleChange}
              />

              <Typography variant="body1" mt={2}>
                Town
              </Typography>
              <CustomTextField
                fullWidth
                name="town"
                value={formData.town || ""}
                onChange={handleChange}
              />

              <Typography variant="body1" mt={2}>
                Postcode
              </Typography>
              <CustomTextField
                fullWidth
                name="postcode"
                value={formData.postcode || ""}
                onChange={handleChange}
                sx={{ mb: 2 }}
              />

              <PhoneInput
                country={"gb"}
                value={phone}
                onChange={(value, country: any) => {
                  setPhone(value);
                  setExtension("+" + country.dialCode);

                  const numberOnly = value.replace(country.dialCode, "");
                  setNationalPhone(numberOnly);
                  setFormData({
                    ...formData,
                    phone: nationalPhone,
                    extension: extension,
                  });
                }}
                inputStyle={{
                  width: "100%",
                  height: "47px",
                  borderColor: "#c0d1dc9c",
                }}
                enableSearch
                inputProps={{ required: true }}
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
                      Click or Drag
                      <br />
                      Image
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </form>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "start",
            gap: 2,
            p: 2,
            mt: "auto",
          }}
        >
          <Button
            color="primary"
            variant="contained"
            size="large"
            type="submit"
            onClick={EditSupplier}
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
      </Box>
    </Drawer>
  );
};

export default EditSupplier;
