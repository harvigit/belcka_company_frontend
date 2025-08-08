import React, { useEffect, useState } from "react";
import {
  Drawer,
  Grid,
  IconButton,
  Typography,
  Button,
  Autocomplete,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { Box } from "@mui/system";

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

interface FormData {
  address_id: number | null;
  type_of_work_id: number | null;
  location_id: number | null;
  trade_id: string | number | null;
  company_id: string | number;
  duration: number;
  rate: number;
  is_attchment: boolean;
  is_pricework: boolean;
  repeatable_job: boolean;
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
}) => {
  const [address, setAddress] = useState<Address[]>([]);
  const [location, setLocation] = useState<Location[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [quantityInput, setQuantityInput] = useState<string>("");

  const [baseRate, setBaseRate] = useState<number>(formData.rate);
  const [baseDuration, setBaseDuration] = useState<number>(formData.duration);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const initialFormData: FormData = {
    address_id: null,
    type_of_work_id: null,
    location_id: null,
    trade_id: null,
    company_id: user?.company_id || 0,
    duration: 0,
    rate: 0,
    is_attchment: false,
    is_pricework: false,
    repeatable_job: false,
  };

  // Fetch addresses
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const res = await api.get(`address/get?project_id=${projectId}`);
        if (res.data) setAddress(res.data.info);
      } catch (err) {
        console.error("Failed to fetch addresses", err);
      }
    })();
  }, [projectId]);

  // Fetch locations
  useEffect(() => {
    if (!user?.company_id) return;
    (async () => {
      try {
        const res = await api.get(
          `company-locations/get?company_id=${user.company_id}`
        );
        if (res.data) setLocation(res.data.info);
      } catch (err) {
        console.error("Failed to fetch locations", err);
      }
    })();
  }, [user?.company_id]);

  // Fetch tasks when trade changes
  useEffect(() => {
    if (!formData.trade_id) {
      setTasks([]);
      setSelectedTask(null);
      return;
    }

    (async () => {
      try {
        const res = await api.get(
          `type-works/get-work-resources?trade_id=${formData.trade_id}`
        );

        if (res.data && Array.isArray(res.data.info)) {
          const fetchedTasks = res.data.info;
          setTasks(fetchedTasks);

          if (fetchedTasks.length > 0) {
            const firstTask = fetchedTasks[0];

            const rate = firstTask.rate > 0 ? firstTask.rate : 0;
            const duration = firstTask.duration > 0 ? firstTask.duration : 0;

            setSelectedTask(firstTask);
            setFormData((prev) => ({
              ...prev,
              rate,
              duration,
              type_of_work_id: firstTask.id,
              is_pricework: firstTask.is_pricework,
              repeatable_job: firstTask.repeatable_job
            }));

            setBaseRate(rate);
            setBaseDuration(duration);
          } else {
            setSelectedTask(null);
            setFormData((prev) => ({
              ...prev,
              rate: 0,
              duration: 0,
              type_of_work_id: 0,
              is_pricework: false,
              repeatable_job: false
            }));

            setBaseRate(0);
            setBaseDuration(0);
          }
        }
      } catch (err) {
        console.error("Failed to fetch tasks", err);
        setTasks([]);
        setSelectedTask(null);
      }
    })();
  }, [formData.trade_id]);

  useEffect(() => {
    setBaseRate(formData.rate);
    setBaseDuration(formData.duration);
  }, []);

  useEffect(() => {
    const quantity = Number(quantityInput);

    const safeBaseRate = isNaN(baseRate) || baseRate == null ? 0 : baseRate;
    const safeBaseDuration =
      isNaN(baseDuration) || baseDuration == null ? 0 : baseDuration;

    if (!formData.is_pricework) {
      if (!isNaN(quantity) && quantity > 0) {
        if (selectedTask) {
          const effectiveRate =
            selectedTask.rate > 0 ? selectedTask.rate : safeBaseRate;
          const effectiveDuration =
            selectedTask.duration > 0
              ? selectedTask.duration
              : safeBaseDuration;

          setFormData((prev) => ({
            ...prev,
            rate: effectiveRate * quantity,
            duration: effectiveDuration * quantity,
          }));
        }
      } else {
        if (selectedTask) {
          const effectiveRate =
            selectedTask.rate > 0 ? selectedTask.rate : safeBaseRate;
          const effectiveDuration =
            selectedTask.duration > 0
              ? selectedTask.duration
              : safeBaseDuration;

          setFormData((prev) => ({
            ...prev,
            rate: effectiveRate,
            duration: effectiveDuration,
          }));
        }
      }
    } else {
      // If repeatable_job, just keep base values
      setFormData((prev) => ({
        ...prev,
        rate: baseRate,
        duration: baseDuration,
      }));
    }
  }, [
    quantityInput,
    selectedTask,
    baseRate,
    baseDuration,
    formData.is_pricework,
  ]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;
    setQuantityInput(value);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if ((name === "duration" || name === "rate") && !/^\d*$/.test(value)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "duration" || name === "rate" ? Number(value) || 0 : value,
    }));
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
          backgroundColor: "#f9f9f9",
          boxSizing: "border-box",
        },
      }}
    >
      <Box display="flex" flexDirection="column" height="100%">
        <Box height={"100%"}>
          <form onSubmit={handleTaskSubmit} className="address-form">
            <Grid container spacing={2} mt={1}>
              <Grid size={{ lg: 12, xs: 12 }}>
                <Box
                  display={"flex"}
                  alignContent={"center"}
                  alignItems={"center"}
                  flexWrap={"wrap"}
                >
                  <IconButton
                    onClick={() => {
                      setFormData(initialFormData);
                      setSelectedTask(null);
                      setQuantityInput("");
                      onClose();
                    }}
                  >
                    <IconArrowLeft />
                  </IconButton>
                  <Typography variant="h5" fontWeight={700}>
                    Add Task
                  </Typography>
                </Box>

                {/* Trade Select */}
                <Typography variant="h5" mt={2}>
                  Select Trade
                </Typography>
                <Autocomplete
                  fullWidth
                  options={trade}
                  value={trade.find((t) => t.id === formData.trade_id) ?? null}
                  onChange={(e, newVal) =>
                    setFormData((prev) => ({
                      ...prev,
                      trade_id: newVal ? newVal.id : null,
                    }))
                  }
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

                {/* Address Select */}
                <Typography variant="h5" mt={2}>
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

                {/* Task Select */}
                <Typography variant="h5" mt={2}>
                  Select Task
                </Typography>
                <Autocomplete
                  fullWidth
                  options={tasks}
                  value={selectedTask}
                  onChange={(e, newVal) => {
                    setSelectedTask(newVal);
                    if (newVal) {
                      const rate = newVal.rate > 0 ? newVal.rate : 0;
                      const duration =
                        newVal.duration > 0 ? newVal.duration : 0;

                      setFormData((prev) => ({
                        ...prev,
                        rate,
                        duration,
                        type_of_work_id: newVal.id,
                        is_pricework: newVal.is_pricework,
                        repeatable_job: newVal.repeatable_job,
                      }));

                      setBaseRate(rate);
                      setBaseDuration(duration);
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        rate: 0,
                        duration: 0,
                        type_of_work_id: null,
                        is_pricework: false,
                        repeatable_job: false
                      }));
                      setBaseRate(0);
                      setBaseDuration(0);
                    }
                  }}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Task" />
                  )}
                />

                {/* Location Select */}
                <Typography variant="h5" mt={2}>
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

                {/* Duration Display */}
                {selectedTask && !formData.is_pricework && (
                  <Typography variant="h5" color="textSecondary" mt={2}>
                    Recommended duration: {formData.duration} min
                  </Typography>
                )}

                {/* Rate Display (Only if not pricework) */}
                {selectedTask && !formData.is_pricework && (
                  <Typography variant="h4" color="textSecondary" mt={2}>
                    Amount: £{formData.rate}
                  </Typography>
                )}
              </Grid>
            </Grid>

            {/* Attachment Checkbox */}
            <Box>
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

              {/* Quantity Input (disabled if pricework) */}
              <CustomTextField
                id="quantity"
                name="quantity"
                type="text"
                placeholder="Enter quantity.."
                disabled={
                  formData.type_of_work_id == 0 ||
                  formData.is_pricework === true
                }
                value={quantityInput}
                onChange={handleQuantityChange}
                variant="outlined"
                inputProps={{
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                }}
                fullWidth
              />
              <Box mt={2} display="flex" justifyContent="space-between" gap={2}>
                <Button
                  color="error"
                  onClick={() => {
                    setFormData(initialFormData);
                    setSelectedTask(null);
                    setQuantityInput("");
                    onClose();
                  }}
                  variant="contained"
                  size="medium"
                  fullWidth
                >
                  Cancel
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
            </Box>
          </form>
        </Box>
      </Box>
    </Drawer>
  );
};

export default CreateProjectTask;
