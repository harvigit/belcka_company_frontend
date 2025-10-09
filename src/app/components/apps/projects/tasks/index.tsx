import React, { useEffect, useState } from "react";
import {
  Drawer,
  Grid,
  IconButton,
  Typography,
  Button,
  Autocomplete,
  Box,
  Divider,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { width } from "@mui/system";
import { IconSearch } from "@tabler/icons-react";

interface Trade {
  id: string | number | null;
  name: string;
}

interface Address {
  id: number;
  name: string;
}

interface Location {
  id: number;
  name: string;
}

interface Task {
  id: number;
  name: string;
  duration: number;
  rate: number;
  is_pricework: boolean;
  repeatable_job: boolean;
}

interface SelectedTask {
  taskId: number;
  quantity: number;
  duration: number;
  rate: number;
  is_pricework: boolean;
  repeatable_job: boolean;
}

interface FormData {
  address_id: number | null;
  location_id: number | null;
  trade_id: string | number | null;
  company_id: string | number;
  is_attchment: boolean;
  tasks: SelectedTask[];
}

interface CreateProjectTaskProps {
  open: boolean;
  onClose: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleTaskSubmit: (e: React.FormEvent) => void;
  trade: Trade[];
  isSaving: boolean;
  projectId: number | null;
  address_id: number | null;
}

interface QuantityState {
  [taskId: number]: {
    quantity: number;
    rate: number;
    duration: number;
  };
}

const CreateProjectTask: React.FC<CreateProjectTaskProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  handleTaskSubmit,
  trade,
  projectId,
  isSaving,
  address_id,
}) => {
  const [address, setAddress] = useState<Address[]>([]);
  const [location, setLocation] = useState<Location[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskSearch, setTaskSearch] = useState("");

  const { data: session } = useSession();
  const userCompanyId = (session?.user as any)?.company_id || 0;

  const [selectedTasks, setSelectedTasks] = useState<SelectedTask[]>([]);
  const [quantities, setQuantities] = useState<QuantityState>({});

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      tasks: selectedTasks,
    }));
  }, [selectedTasks]);

  useEffect(() => {
    if (!open || !projectId) return;

    (async () => {
      try {
        const res = await api.get(`address/get?project_id=${projectId}`);
        if (res.data && Array.isArray(res.data.info)) {
          setAddress(res.data.info);

          if (address_id !== null && !formData.address_id) {
            const matched = res.data.info.find(
              (addr: Address) => addr.id === address_id
            );
            if (matched) {
              setFormData((prev) => ({
                ...prev,
                address_id: matched.id,
              }));
            }
          }
        }
      } catch (err) {
        console.error("Error fetching addresses", err);
      }
    })();
  }, [open, projectId, address_id]);

  useEffect(() => {
    if (!userCompanyId) return;
    (async () => {
      try {
        const res = await api.get(
          `company-locations/get?company_id=${userCompanyId}`
        );
        if (res.data && Array.isArray(res.data.info)) {
          setLocation(res.data.info);
        }
      } catch (err) {
        console.error("Error fetching locations", err);
      }
    })();
  }, [userCompanyId]);

  useEffect(() => {
    if (!formData.trade_id) {
      setTasks([]);
      setSelectedTasks([]);
      setQuantities({});
      return;
    }

    (async () => {
      try {
        const res = await api.get(
          `type-works/get-work-resources?trade_id=${formData.trade_id}`
        );
        if (res.data && Array.isArray(res.data.info)) {
          setTasks(res.data.info);

          const initialQuantities: QuantityState = {};
          res.data.info.forEach((task: Task) => {
            initialQuantities[task.id] = {
              quantity: task.is_pricework ? 1 : 0,
              rate: task.rate,
              duration: task.duration,
            };
          });

          setQuantities(initialQuantities);
          setSelectedTasks([]); // Reset selections
        }
      } catch (err) {
        console.error("Error fetching tasks", err);
      }
    })();
  }, [formData.trade_id]);

  const handleTaskCheckbox = (task: Task, checked: boolean) => {
    const qInfo = quantities[task.id] || {
      quantity: 0,
      rate: task.rate,
      duration: task.duration,
    };

    if (checked) {
      setSelectedTasks((prev) => [
        ...prev,
        {
          taskId: task.id,
          quantity: qInfo.quantity,
          name: task.name,
          duration: qInfo.duration,
          rate: qInfo.rate,
          is_pricework: task.is_pricework,
          repeatable_job: task.repeatable_job,
        },
      ]);
    } else {
      setSelectedTasks((prev) => prev.filter((t) => t.taskId !== task.id));
    }
  };

  const handleQuantityChange = (task: Task, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const quantity = val === "" ? 0 : Math.max(0, Number(val));

    setQuantities((prev) => ({
      ...prev,
      [task.id]: {
        quantity,
        rate: task.is_pricework
          ? quantity === 0
            ? task.rate
            : task.rate * quantity
          : task.rate,
        duration: task.is_pricework
          ? quantity === 0
            ? task.duration
            : task.duration * quantity
          : task.duration,
      },
    }));
  };

  const handleResetAndClose = () => {
    setFormData({
      address_id: null,
      location_id: null,
      trade_id: null,
      company_id: userCompanyId,
      is_attchment: false,
      tasks: [],
    });
    setSelectedTasks([]);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 500,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 500,
          padding: 2,
          boxSizing: "border-box",
        },
      }}
    >
      <Box display="flex" flexDirection="column" height="100%">
        <Box height={"100%"}>
          <form onSubmit={handleTaskSubmit} className="address-form">
            <Grid container spacing={2} mt={1}>
              {/* Trade Selection */}
              <Grid size={{ lg: 12, xs: 12 }}>
                <Box
                  display={"flex"}
                  alignContent={"center"}
                  alignItems={"center"}
                  flexWrap={"wrap"}
                  mb={1}
                >
                  <IconButton onClick={handleResetAndClose}>
                    <IconArrowLeft />
                  </IconButton>
                  <Autocomplete
                    fullWidth
                    className="trade-selection"
                    size="small"
                    options={trade}
                    value={
                      trade.find((t) => t.id === formData.trade_id) ?? null
                    }
                    onChange={(e, val) =>
                      setFormData((prev) => ({
                        ...prev,
                        trade_id: val ? val.id : null,
                      }))
                    }
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    renderInput={(params) => (
                      <CustomTextField {...params} placeholder="Search Trade" />
                    )}
                  />
                </Box>
                {formData.trade_id && (
                  <Box mt={1} mb={1} display={"flex"} justifyContent={"start"}>
                    <CustomTextField
                      size="small"
                      placeholder="Search task"
                      value={taskSearch}
                      onChange={(e: any) => setTaskSearch(e.target.value)}
                      fullWidth
                      sx={{ width: "90%", ml: 5 }}
                    />
                  </Box>
                )}

                {/* Task list */}
                <Box mt={2}>
                  {tasks
                    .filter((task) =>
                      task.name.toLowerCase().includes(taskSearch.toLowerCase())
                    )
                    .map((task) => {
                      const selected = selectedTasks.find(
                        (t) => t.taskId === task.id
                      );
                      const quantityInfo = quantities[task.id] || {
                        quantity: 0,
                        rate: task.is_pricework ? task.rate : 0,
                        duration: task.is_pricework ? task.duration : 0,
                      };
                      const quantity = quantityInfo.quantity;

                      return (
                        <Box
                          key={task.id}
                          mb={1}
                          sx={{
                            padding: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={2}
                            className="task_wrapper"
                          >
                            <CustomCheckbox
                              checked={!!selected}
                              onChange={(e) =>
                                handleTaskCheckbox(task, e.target.checked)
                              }
                            />

                            <CustomTextField
                              id="name"
                              name="name"
                              className="task-input"
                              disabled
                              value={task.name}
                            />

                            <CustomTextField
                              type="text"
                              inputProps={{
                                inputMode: "numeric",
                                pattern: "[0-9]*",
                              }}
                              value={quantity}
                              onChange={(e: any) =>
                                handleQuantityChange(task, e.target.value)
                              }
                              sx={{ width: 80 }}
                            />
                          </Box>

                          {task.is_pricework && (
                            <Box
                              display="flex"
                              justifyContent="start"
                              gap={10}
                              ml={8}
                            >
                              <Typography
                                variant="caption"
                                color="textSecondary"
                                fontWeight={500}
                              >
                                Duration: {quantityInfo.duration} min
                              </Typography>
                              <Typography
                                variant="caption"
                                color="textSecondary"
                                fontWeight={500}
                              >
                                Rate: £{quantityInfo.rate.toFixed(2)}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                </Box>
              </Grid>
            </Grid>

            {/* Submit buttons */}
            <Box>
              <Box className="task_wrapper">
                <Typography variant="h5" color="textSecondary" mt={2}>
                  Select Address
                </Typography>
                <Autocomplete
                  fullWidth
                  options={address}
                  value={
                    address.find((a) => a.id === formData.address_id) ?? null
                  }
                  onChange={(e, newVal) =>
                    setFormData((prev) => ({
                      ...prev,
                      address_id: newVal ? newVal.id : 0,
                    }))
                  }
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Address" />
                  )}
                />
                {/* Location Select */}
                <Typography variant="h5" color="textSecondary" mt={2}>
                  Select Location
                </Typography>
                <Autocomplete
                  fullWidth
                  options={location}
                  value={
                    location.find((l) => l.id === formData.location_id) ?? null
                  }
                  onChange={(e, newVal) =>
                    setFormData((prev) => ({
                      ...prev,
                      location_id: newVal ? newVal.id : null,
                    }))
                  }
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Location" />
                  )}
                />
                <Typography
                  variant="h5"
                  mt={2}
                  mb={2}
                  ml={"-8px"}
                  display="flex"
                  justifyContent="start"
                  flexDirection="row-reverse"
                  alignItems="center"
                  gap={1}
                >
                  Attachment Mandatory
                  <CustomCheckbox
                    name="is_attchment"
                    checked={formData.is_attchment}
                    onChange={(e) =>
                      setFormData((prevData) => ({
                        ...prevData,
                        is_attchment: e.target.checked,
                      }))
                    }
                  />
                </Typography>
              </Box>
              <Box mt={2} display="flex" justifyContent="start" gap={2}>
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
                  onClick={() => {
                    onClose();
                  }}
                  variant="contained"
                  size="large"
                  sx={{
                    backgroundColor: "transparent",
                    borderRadius: 3,
                    color: "GrayText",
                  }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          </form>
        </Box>
      </Box>
    </Drawer>
  );
};

export default CreateProjectTask;
