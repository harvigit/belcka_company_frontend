import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Grid,
  IconButton,
  Typography,
  Button,
  Autocomplete,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import IOSSwitch from "@/app/components/common/IOSSwitch";

interface FormData {
  id: number;
  name: string;
  trade_category_id: string | number | null;
  company_id: number | null;
  status: boolean;
}

interface EditTradeProps {
  id: number | null;
  open: boolean;
  onClose: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  EditTrade: (e: React.FormEvent) => void;
  companyId: number | null;
  isSaving: boolean;
  data: any;
}

const EditTrade: React.FC<EditTradeProps> = ({
  id,
  open,
  onClose,
  formData,
  setFormData,
  EditTrade,
  companyId,
  isSaving,
  data,
}) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };
  const [trade, setTrade] = useState<any[]>([]);
  useEffect(() => {
    if (!id || !open || !data) return;

    const record = data.find((item: any) => item.id === id);

    if (record) {
      setFormData({
        id: record.id,
        name: record.name || "",
        trade_category_id: record.category_id ?? null,
        company_id: companyId ?? null,
        status: record.status,
      });
    }
  }, [id, open, data,companyId,setFormData]);

  // Fetch data
  const fetchCategories = async () => {
    try {
      const res = await api.get(
        `trade/get-company-trades?company_id=${companyId}`
      );
      if (res.data) {
        setTrade(res.data.company_trades);
      }
    } catch (err) {
      console.error("Failed to fetch trades", err);
    }
  };

  useEffect(() => {
    if (open == true) {
      fetchCategories();
    }
  }, [open,fetchCategories]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 350,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 350,
          padding: 2,
          backgroundColor: "#f9f9f9",
        },
      }}
    >
      <Box display="flex" flexDirection="column" height="100%">
        <Box height={"100%"}>
          <form onSubmit={EditTrade} className="address-form">
            <Grid container>
              <Grid size={{ lg: 12, xs: 12 }}>
                <Box
                  display={"flex"}
                  alignContent={"center"}
                  alignItems={"center"}
                  flexWrap={"wrap"}
                >
                  <IconButton onClick={onClose}>
                    <IconArrowLeft />
                  </IconButton>
                  <Typography variant="h5" fontWeight={700}>
                    Edit Trade
                  </Typography>
                </Box>

                <Typography variant="h5" mt={2}>
                  Name
                </Typography>
                <CustomTextField
                  id="name"
                  name="name"
                  placeholder="Enter address name.."
                  value={formData.name}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                />

                <Typography variant="h5" mt={2}>
                  Select Trade
                </Typography>
                <Autocomplete
                  fullWidth
                  id="trade_id"
                  options={trade}
                  value={
                    trade.find(
                      (trade) => trade.id === formData.trade_category_id
                    ) ?? null
                  }
                  onChange={(event, newValue) => {
                    setFormData({
                      ...formData,
                      trade_category_id: newValue ? newValue.id : null,
                    });
                  }}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Trades" />
                  )}
                />
                <Typography variant="h5" mt={2}>
                  Status
                </Typography>
                <IOSSwitch
                  checked={formData.status}
                  onChange={(e, value) =>
                    setFormData({
                      ...formData,
                      status: value,
                    })
                  }
                />
              </Grid>
            </Grid>

            <Box
              sx={{
                display: "flex",
                justifyContent: "start",
                gap: 2,
                mt: 3,
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

export default EditTrade;
