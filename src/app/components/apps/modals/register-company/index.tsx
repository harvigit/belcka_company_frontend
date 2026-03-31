"use client";

import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  Button,
  Avatar,
  Grid,
  Paper,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CompanyRegistration({ open, onClose }: Props) {
  const { data: session } = useSession();
  const user = session?.user as User & { id: number; token: string };

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [businessFields, setBusinessFields] = useState<any[]>([]);
  const [teamSizes, setTeamSizes] = useState<any[]>([]);

  const [createData, setCreateData] = useState<any>({
    name: "",
    email: "",
    phone: "",
    nationalPhone: "",
    extension: "",
    team_size_id: "",
    business_field_id: "",
    company_image: null,
  });

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [businessRes, teamRes] = await Promise.all([
          api.get("get-company-resources?flag=industryList"),
          api.get("get-company-resources?flag=numberOfEmployeeList"),
        ]);
        setBusinessFields(businessRes.data.info || []);
        setTeamSizes(teamRes.data.info || []);
      } catch (error) {
        console.error(error);
      }
    };
    fetchDropdownData();
  }, []);

  const handleCompanyImageChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setCreateData({ ...createData, company_image: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    const {
      name,
      email,
      nationalPhone,
      extension,
      team_size_id,
      business_field_id,
      company_image,
    } = createData;

    if (!company_image) {
      return toast.error("Please upload company logo");
    }

    if (
      !name ||
      !email ||
      !nationalPhone ||
      !extension ||
      !createData.team_size_id ||
      !createData.business_field_id
    ) {
      return toast.error("Please fill all required fields!");
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("phone", nationalPhone);
      formData.append("extension", extension);
      formData.append("created_by", user.id);
      formData.append("team_size_id", team_size_id);
      formData.append("business_id", business_field_id);
      formData.append("is_web", "true");
      formData.append("company_image", company_image);

      const res = await api.post("company/company-app-registration", formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "multipart/form-data",
          is_web: "true",
        },
      });

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        onClose();
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "95vh",
        },
      }}
    >
      <Box height="100%" overflow="auto" display="flex" flexDirection="column">
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            paddingRight: 1,
          }}
          p={3}
          overflow="auto"
        >
          <Box display="flex" justifyContent="space-between">
            <Typography fontWeight={600}>Company Registration</Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>

          <form onSubmit={handleCreateCompany}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }} textAlign="center">
                <label htmlFor="upload-company-image">
                  <Avatar
                    src={preview || "/images/users/company.png"}
                    sx={{
                      width: 90,
                      height: 90,
                      mx: "auto",
                      cursor: "pointer",
                    }}
                  />
                </label>
                <input
                  hidden
                  id="upload-company-image"
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleCompanyImageChange}
                />
                <Typography variant="body2" gutterBottom display="block" mt={1}>
                  Upload company logo
                </Typography>
              </Grid>

              <Grid size={{ xs: 4 }}>
                <Typography mb={1} variant="body2" gutterBottom>
                  Company Name
                </Typography>
                <CustomTextField
                  fullWidth
                  value={createData.name}
                  onChange={(e: any) =>
                    setCreateData({ ...createData, name: e.target.value })
                  }
                />
              </Grid>

              <Grid size={{ xs: 4 }}>
                <Typography mb={1} variant="body2" gutterBottom>
                  Business Email
                </Typography>
                <CustomTextField
                  fullWidth
                  value={createData.email}
                  onChange={(e: any) =>
                    setCreateData({ ...createData, email: e.target.value })
                  }
                />
              </Grid>

              <Grid size={{ xs: 4 }}>
                <Typography mb={1} variant="body2" gutterBottom>
                  Mobile Number
                </Typography>
                <PhoneInput
                  country={"gb"}
                  value={createData.phone}
                  onChange={(phone, country: any) =>
                    setCreateData({
                      ...createData,
                      phone,
                      nationalPhone: phone.slice(country.dialCode.length),
                      extension: `+${country.dialCode}`,
                    })
                  }
                  inputStyle={{ width: "100%", height: "47px" ,backgroundColor:"transparent"}}
                  enableSearch
                  inputProps={{ required: true }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography
                  mb={1}
                  variant="body2"
                  gutterBottom
                  fontWeight={500}
                >
                  Team Size
                </Typography>
                <Grid container spacing={2}>
                  {teamSizes.map((item: any) => (
                    <Grid size={{ xs: 4 }} key={item.id}>
                      <Paper
                        onClick={() =>
                          setCreateData({
                            ...createData,
                            team_size_id: item.id,
                          })
                        }
                        sx={{
                          p: 2,
                          textAlign: "center",
                          cursor: "pointer",
                          border:
                            createData.team_size_id === item.id
                              ? "2px solid #1976d2"
                              : "1px solid #ddd",
                        }}
                      >
                        <Typography>{item.name}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography
                  mb={1}
                  variant="body2"
                  gutterBottom
                  fontWeight={500}
                >
                  Business Field
                </Typography>
                <Grid container spacing={2}>
                  {businessFields.map((item: any) => (
                    <Grid size={{ xs: 4 }} key={item.id}>
                      <Paper
                        key={item.id}
                        onClick={() =>
                          setCreateData({
                            ...createData,
                            business_field_id: item.id,
                          })
                        }
                        sx={{
                          p: 2,
                          cursor: "pointer",
                          border:
                            createData.business_field_id === item.id
                              ? "2px solid #1976d2"
                              : "1px solid #ddd",
                        }}
                      >
                        <Typography>{item.name}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </form>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "start",
            gap: 2,
            mt: 1,
            mb: 2,
            p: 2,
          }}
        >
          <Button
            color="primary"
            variant="contained"
            size="large"
            type="submit"
            onClick={handleCreateCompany}
            disabled={loading}
            sx={{ borderRadius: 3, width: "10%" }}
          >
            {loading ? "Saving..." : "Save"}
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
}
