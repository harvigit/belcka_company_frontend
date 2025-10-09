import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Grid,
  IconButton,
  Typography,
  Button,
  Autocomplete,
  Tabs,
  Tab,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { TaskList } from "../list";

interface Trade {
  id: string | number | null;
  name: string;
  trade_id: number;
}

interface FormData {
  id: number;
  name: string;
  trade_id: string | number | null;
  company_id: string | number;
  duration: number;
  rate: number;
  units: string;
  is_pricework: boolean;
  repeatable_job: boolean;
}

interface EditTaskProps {
  id: number | null;
  open: boolean;
  onClose: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  EditTask: (e: React.FormEvent) => void;
  trade: Trade[];
  isSaving: boolean;
}

const EditTask: React.FC<EditTaskProps> = ({
  id,
  open,
  onClose,
  formData,
  setFormData,
  EditTask,
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

  const [data, setData] = useState<TaskList[]>([]);

  const activeTab = formData.is_pricework ? 1 : 0;

  useEffect(() => {
    if (id) {
      const fetchTasks = async () => {
        try {
          const res = await api.get(`type-works/get-task-detail?id=${id}`);
          if (res.data && res.data.info) {
            const task = res.data.info;
            setData(task);
            setFormData({
              id: task.id,
              name: task.name || "",
              trade_id: task.trade_id || null,
              company_id: task.company_id || "",
              duration: task.duration || 0,
              rate: task.is_pricework ? task.rate : 0,
              units: task.is_pricework ? task.units : null,
              is_pricework: task.is_pricework || false,
              repeatable_job: task.repeatable_job || false,
            });
          }
        } catch (err) {
          console.error("Failed to fetch task", err);
        }
      };
      fetchTasks();
    }
  }, [id]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (newValue === 0) {
      setFormData((prev) => ({
        ...prev,
        repeatable_job: true,
        is_pricework: false,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        is_pricework: true,
        repeatable_job: false,
      }));
    }
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
          <form onSubmit={EditTask} className="address-form">
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
                    Edit Template
                  </Typography>
                </Box>

                <Tabs
                  className="address-sidebar-tabs"
                  value={activeTab}
                  onChange={handleTabChange}
                  aria-label="Sidebar Tabs"
                  variant="fullWidth"
                  TabIndicatorProps={{ style: { display: "none" } }}
                  sx={{
                    backgroundColor: "#E0E0E0",
                    borderRadius: "12px",
                    minHeight: "40px",
                    padding: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                    mt: 1,
                  }}
                >
                  {["Daywork", "Pricework"].map((label, index) => (
                    <Tab
                      key={label}
                      label={label}
                      sx={{
                        textTransform: "none",
                        borderRadius: "10px",
                        minHeight: "32px",
                        minWidth: "auto",
                        px: 3,
                        py: 0.5,
                        fontSize: "14px",
                        fontWeight: activeTab === index ? "600" : "400",
                        color: activeTab === index ? "#000 !important" : "#888",
                        backgroundColor:
                          activeTab === index ? "#fff" : "transparent",
                        boxShadow:
                          activeTab === index
                            ? "0px 2px 4px rgba(0,0,0,0.1)"
                            : "none",
                        transition: "all 0.3s ease",
                      }}
                    />
                  ))}
                </Tabs>

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

                {activeTab === 1 && (
                  <>
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
                  </>
                )}
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
                  variant="outlined"
                  inputProps={{
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                  }}
                  fullWidth
                />

                {/* Show rate field only if Pricework tab */}
                {activeTab === 1 && (
                  <>
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
                  </>
                )}

                <Typography variant="h5" mt={2}>
                  Select Trade
                </Typography>
                <Autocomplete
                  fullWidth
                  id="trade_id"
                  options={trade}
                  value={
                    trade.find((trade) => trade.id === formData.trade_id) ??
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

                <Typography variant="body1" mt={1}>
                  You can choose only one trade
                </Typography>
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

export default EditTask;
