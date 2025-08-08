import React, { ChangeEvent } from "react";
import {
  Drawer,
  Box,
  Grid,
  IconButton,
  Typography,
  Switch,
  Button,
  Autocomplete,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

interface Trade {
  id: string | number | null;
  name: string;
}

interface FormData {
  name: string;
  trade_id: string | number | null;
  company_id: string | number;
  duration: number;
  rate: number;
  units: string;
  is_pricework: boolean;
  repeatable_job: boolean;
}

interface CreateTaskProps {
  open: boolean;
  onClose: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  trade: Trade[];
  isSaving: boolean;
}

const CreateTask: React.FC<CreateTaskProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  trade,
  isSaving,
}) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if ((name === "duration" || name === "rate") && !/^\d*$/.test(value)) {
      return;
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

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
          <form onSubmit={handleSubmit} className="address-form">
            {" "}
            <Grid container mt={3}>
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
                    Add Template
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
                <Typography
                  variant="h5"
                  mt={2}
                  display={"flex"}
                  justifyContent={"space-between"}
                  alignItems={"center"}
                >
                  Make it as repeatable job?
                  <Switch
                    color="success"
                    checked={formData.repeatable_job === true}
                    onChange={(e) => {
                      setFormData((prevData: any) => ({
                        ...prevData,
                        repeatable_job: e.target.checked ? true : false,
                        is_pricework: e.target.checked
                          ? false
                          : prevData.is_pricework,
                      }));
                    }}
                  />
                </Typography>
                <Typography variant="h5" mt={2}>
                  Units
                </Typography>
                <CustomTextField
                  id="units"
                  name="units"
                  placeholder="Enter units.."
                  value={formData.units}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                />
                <Typography variant="h5" mt={2}>
                  Recommended duration
                </Typography>
                <CustomTextField
                  id="duration"
                  name="duration"
                  type="text"
                  placeholder="Enter minutes.."
                  value={formData.duration === 0 ? "" : formData.duration}
                  onChange={handleChange}
                  inputProps={{
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                  }}
                  variant="outlined"
                  fullWidth
                />
                <Typography
                  variant="h5"
                  mt={2}
                  display={"flex"}
                  justifyContent={"space-between"}
                  alignItems={"center"}
                >
                  Does it have price work?
                  <Switch
                    color="success"
                    checked={formData.is_pricework === true}
                    onChange={(e) => {
                      setFormData((prevData: any) => ({
                        ...prevData,
                        is_pricework: e.target.checked ? true : false,
                        repeatable_job: e.target.checked
                          ? false
                          : prevData.repeatable_job,
                      }));
                    }}
                  />
                </Typography>
                <Typography variant="h5" mt={2}>
                  Rate
                </Typography>
                <CustomTextField
                  id="rate"
                  name="rate"
                  type="text"
                  placeholder="Enter rate.."
                  value={formData.rate === 0 ? "" : formData.rate}
                  onChange={handleChange}
                  variant="outlined"
                  inputProps={{
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                  }}
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
                    trade.find((user) => user.id === formData.trade_id) ??
                    null
                  }
                  onChange={(event, newValue) => {
                    setFormData({
                      ...formData,
                      trade_id: newValue ? newValue.id : null,
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
                <Typography variant="body1">
                  You can choose only one trade
                </Typography>
              </Grid>
            </Grid>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Button
                color="error"
                onClick={onClose}
                variant="contained"
                size="medium"
                fullWidth
              >
                Close
              </Button>
              <Button
                color="primary"
                variant="contained"
                size="medium"
                type="submit"
                disabled={isSaving}
                fullWidth
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </Box>
          </form>
        </Box>
      </Box>
    </Drawer>
  );
};

export default CreateTask;
