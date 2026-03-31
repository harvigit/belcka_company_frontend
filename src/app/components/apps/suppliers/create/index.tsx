import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  Stack,
  InputLabel,
  Autocomplete,
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

interface CreateSupplierProps {
  open: boolean;
  companyId: number | null;
  onClose: () => void;
  formData: SupplierFormData;
  setFormData: React.Dispatch<React.SetStateAction<SupplierFormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
}

const CreateSupplier: React.FC<CreateSupplierProps> = ({
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
      setPhone("");
      setPhone1("");
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
            Add Supplier
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
              <Typography variant="body2">Supplier Name</Typography>
              <CustomTextField
                inputProps={{ maxLength: 50 }}
                name="name"
                fullWidth
                value={formData.name}
                onChange={(e: any) => {
                  let value = e.target.value;

                  setFormData((prev: any) => ({
                    ...prev,
                    name: value,
                  }));
                }}
              />
              <Typography variant="body2" mt={2}>
                Email
              </Typography>
              <CustomTextField
                fullWidth
                name="email"
                value={formData.email || ""}
                onChange={handleChange}
              />

              <Typography variant="body2" mt={2}>
                Company Name
              </Typography>
              <CustomTextField
                fullWidth
                name="company_name"
                value={formData.company_name || ""}
                onChange={(e: any) => {
                  let value = e.target.value;

                  setFormData((prev: any) => ({
                    ...prev,
                    company_name: value,
                  }));
                }}
              />
              <Typography variant="body2" mt={2}>
                Account Number
              </Typography>

              <CustomTextField
                fullWidth
                name="account_number"
                value={formData.account_number || ""}
                onChange={(e: any) => {
                  let value = e.target.value;
                  setFormData((prev: any) => ({
                    ...prev,
                    account_number: value,
                  }));
                }}
              />

              <Typography variant="body2" mt={2}>
                Contact Person Name
              </Typography>

              <CustomTextField
                fullWidth
                name="contact_person_name"
                value={formData.contact_person_name || ""}
                onChange={(e: any) => {
                  let value = e.target.value;

                  setFormData((prev: any) => ({
                    ...prev,
                    contact_person_name: value,
                  }));
                }}
              />

              <Typography variant="body2" mt={2}>
                Contact Person Email
              </Typography>

              <CustomTextField
                fullWidth
                type="email"
                name="contact_person_email"
                value={formData.contact_person_email || ""}
                onChange={handleChange}
              />

              <Typography variant="body2" mt={2}>
                Contact Person Phone
              </Typography>
              <PhoneInput
                inputClass="contact_phone"
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
                  backgroundColor:"transparent"
                }}
                enableSearch
                inputProps={{ required: true }}
              />
              <Typography variant="body2" mt={2}>
                Street
              </Typography>
              <CustomTextField
                fullWidth
                name="street"
                value={formData.street || ""}
                onChange={handleChange}
              />
              <Typography variant="body2" mt={2}>
                Location
              </Typography>

              <CustomTextField
                fullWidth
                name="location"
                value={formData.location || ""}
                onChange={handleChange}
              />

              <Typography variant="body2" mt={2}>
                Town
              </Typography>
              <CustomTextField
                fullWidth
                name="town"
                value={formData.town || ""}
                onChange={handleChange}
              />

              <Typography variant="body2" mt={2}>
                Postcode
              </Typography>
              <CustomTextField
                fullWidth
                name="postcode"
                value={formData.postcode || ""}
                onChange={(e: any) => {
                  let value = e.target.value;
                  setFormData((prev: any) => ({
                    ...prev,
                    postcode: value,
                  }));
                }}
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
                  backgroundColor:"transparent"
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
            onClick={handleSubmit}
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

export default CreateSupplier;
