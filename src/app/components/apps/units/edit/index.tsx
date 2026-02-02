import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { Stack } from "@mui/system";

const typeMap: Record<string, string> = {
  1: "Length",
  2: "Weight",
  3: "Pack off",
};

interface FormData {
  id: number;
  name: string;
  company_id: string | number;
  type: string;
}

interface EditUnitProps {
  id: number | null;
  companyId: number | null;
  open: boolean;
  onClose: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  EditUnit: (e: React.FormEvent) => void;
  isSaving: boolean;
}

const EditUnit: React.FC<EditUnitProps> = ({
  id,
  companyId,
  open,
  onClose,
  formData,
  setFormData,
  EditUnit,
  isSaving,
}) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Fetch data
  useEffect(() => {
    if (id) {
      const fetchTasks = async () => {
        try {
          const res = await api.get(
            `units/get?id=${id}&company_id=${companyId}`,
          );
          if (res.data && res.data.info) {
            const task = res.data.info[0];
            setFormData({
              id: task.id,
              name: task.name || "",
              company_id: task.company_id || "",
              type: task.type || "",
            });
          }
        } catch (err) {
          console.error("Failed to fetch unit", err);
        }
      };
      fetchTasks();
    }
  }, [id, setFormData]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 450,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 450,
          backgroundColor: "#f9f9f9",
        },
      }}
    >
      <Box display="flex" flexDirection="column" height="100%">
        <Box display="flex" alignItems="center" flexWrap="wrap" p={1}>
          <IconButton onClick={onClose} aria-label="close drawer">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            Edit Unit
          </Typography>
        </Box>

        <Box height="100%" p={2}>
          <form onSubmit={EditUnit} className="address-form">
            <Box>
              <Typography>Name</Typography>
              <CustomTextField
                id="name"
                name="name"
                placeholder="Enter name..."
                className="custom_font"
                value={formData.name}
                onChange={handleChange}
                variant="outlined"
                fullWidth
              />
              <Stack mt={2}>
                <Typography>Unit Type</Typography>
                <FormControl fullWidth>
                  <Select
                    id="type"
                    name="type"
                    value={formData.type || ""}
                    onChange={handleSelectChange}
                    displayEmpty
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#e0e0e0",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#bdbdbd",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#50ABFF",
                      },
                    }}
                    renderValue={(value) =>
                      value ? (
                        <Typography sx={{ fontSize: "14px" }} component="span">
                          {typeMap[value] || "Select unit type"}
                        </Typography>
                      ) : (
                        <Typography color="#999" component="span">
                          Select unit type
                        </Typography>
                      )
                    }
                  >
                    {Object.entries(typeMap).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "start",
                gap: 2,
                mt: "auto",
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
  );
};

export default EditUnit;
