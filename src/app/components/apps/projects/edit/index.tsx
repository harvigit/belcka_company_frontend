import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Grid,
  IconButton,
  Typography,
  Button,
  Autocomplete,
  TextField,
  Stack,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { IconPlus, IconSettings, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";

interface FormData {
  id?: number;
  name: string;
  address: string;
  budget: string;
  description?: string;
  code: number;
  shift_ids: string;
  team_ids: string;
  company_id: number;
  workzone_ids?: string;
}

interface Shift {
  id: number | null;
  name: string;
}

interface Team {
  id: number | null;
  name: string;
}

interface Geofence {
  id: number;
  name: string;
}

interface BudgetSettingRow {
  id?: number;
  localId: string;
  type: string;
  budget_amount: string;
}

interface EditProjectProps {
  open: boolean;
  onClose: () => void;
  onBudgetSaved?: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  project: any;
}

const EditProject: React.FC<EditProjectProps> = ({
  open,
  onClose,
  onBudgetSaved,
  formData,
  setFormData,
  handleSubmit,
  project,
  isSaving,
}) => {
  const normalizeBudgetValue = (value: unknown) =>
    String(value ?? "").replace(/[^0-9.]/g, "");
  
  const getBudgetFieldValue = (value: unknown) =>
    normalizeBudgetValue(value) || "0";
  
  const defaultBudgetTypes = ["Labor", "Material", "Others"];
 
  const createDefaultBudgetSettings = (): BudgetSettingRow[] =>
    defaultBudgetTypes.map((type) => ({
      localId: `${type}-${Date.now()}-${Math.random()}`,
      type,
      budget_amount: "0",
    }));

  const normalizeBudgetSettings = (settings: any[]): BudgetSettingRow[] => {
    if (!settings.length) {
      return createDefaultBudgetSettings();
    }

    const normalizedSettings = settings.map((setting) => ({
      id: setting.id,
      localId: String(setting.id ?? `${Date.now()}-${Math.random()}`),
      type: setting.type ?? "",
      budget_amount: getBudgetFieldValue(setting.budget_amount),
    }));

    const defaultRows = defaultBudgetTypes.map((type) => {
      const savedDefault = normalizedSettings.find(
        (setting) => setting.type.toLowerCase() === type.toLowerCase()
      );

      return (
        savedDefault || {
          localId: `${type}-${Date.now()}-${Math.random()}`,
          type,
          budget_amount: "0",
        }
      );
    });

    const customRows = normalizedSettings.filter(
      (setting) =>
        !defaultBudgetTypes.some(
          (type) => type.toLowerCase() === setting.type.toLowerCase()
        )
    );

    return [...defaultRows, ...customRows];
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "budget" && !/^\d*$/.test(value)) {
      return;
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  useEffect(() => {
    if (project) {
      setFormData({
        id: project.id,
        name: project.name || "",
        address: project.address || "",
        budget: String(project.budget || ""),
        description: project.description || "",
        code: project.code || "",
        company_id: project.company_id || 0,
        shift_ids: (project.shifts || []).map((s: any) => s.id).join(","),
        team_ids: (project.teams || []).map((t: any) => t.id).join(","),
        workzone_ids: (project.project_address || [])
          .map((g: any) => g.workzone_id)
          .join(","),
      });
      const defaultSettings = createDefaultBudgetSettings();
      setBudgetSettings(defaultSettings);
      setSavedBudgetSettings(defaultSettings);
    }
  }, [project]);

  const [shift, setShift] = useState<Shift[]>([]);
  const [team, setTeam] = useState<Team[]>([]);
  const [geofence, setGeofence] = useState<Geofence[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currency, setCurrency] = useState("");
  
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettingRow[]>([...createDefaultBudgetSettings()]);
  const [savedBudgetSettings, setSavedBudgetSettings] = useState<BudgetSettingRow[]>(createDefaultBudgetSettings());
  
  const [isBudgetSaving, setIsBudgetSaving] = useState(false);
  const [isBudgetLoading, setIsBudgetLoading] = useState(false);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  
  const usedBudget = budgetSettings.reduce(
    (total, row) => total + Number(normalizeBudgetValue(row.budget_amount) || 0),
    0
  );
  const formatCurrency = (value: number) =>
    `${currency}${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

  const fetchBudgetSettings = async () => {
    if (!project?.id) {
      const defaultSettings = createDefaultBudgetSettings();
      setBudgetSettings(defaultSettings);
      setSavedBudgetSettings(defaultSettings);
      return;
    }

    try {
      setIsBudgetLoading(true);
      const res = await api.get(`project/get-budget-settings?project_id=${project.id}`);
      const nextSettings = normalizeBudgetSettings(res.data?.info || []);
      if(res.data.IsSuccess) {
        setCurrency(res.data.currency);
      }
      setBudgetSettings(nextSettings);
      setSavedBudgetSettings(nextSettings);
    } catch (error) {
      console.error("Failed to fetch project budget settings", error);
      const defaultSettings = createDefaultBudgetSettings();
      setBudgetSettings(defaultSettings);
      setSavedBudgetSettings(defaultSettings);
    } finally {
      setIsBudgetLoading(false);
    }
  };

  const handleBudgetSettingChange = (
    localId: string,
    field: "type" | "budget_amount",
    value: string
  ) => {
    if (field === "budget_amount" && !/^\d*\.?\d{0,2}$/.test(value)) {
      return;
    }

    setBudgetSettings((prev) =>
      prev.map((row) =>
        row.localId === localId
          ? {
              ...row,
              [field]: field === "budget_amount" && value === "" ? "0" : value,
            }
          : row
      )
    );
  };

  const isBudgetTypeReadOnly = (row: BudgetSettingRow) =>
    Boolean(row.id) ||
    defaultBudgetTypes.some(
      (type) => type.toLowerCase() === row.type.toLowerCase()
    );

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const settingsToSave = budgetSettings
      .map((row) => ({
        id: row.id,
        type: row.type.trim(),
        budget_amount: getBudgetFieldValue(row.budget_amount),
      }))
      .filter((row) => row.type || Number(row.budget_amount) > 0);

    if (settingsToSave.some((row) => !row.type)) {
      toast.error("Budget type is required when amount is greater than 0");
      return;
    }

    setIsBudgetSaving(true);

    try {
      const payload = {
        project_id: project?.id || formData.id,
        settings: settingsToSave,
      };

      const result = await api.post("project/store-budget-settings", payload);

      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        const nextSettings = normalizeBudgetSettings(result.data?.info || []);
        setBudgetSettings(nextSettings);
        setSavedBudgetSettings(nextSettings);
        onBudgetSaved?.();
        setSettingsOpen(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsBudgetSaving(false);
    }
  };

  const handleBudgetClose = () => {
    setBudgetSettings(savedBudgetSettings.map((row) => ({ ...row })));
    setSettingsOpen(false);
  };

  useEffect(() => {
    if (!open || !user?.company_id) return;

    const loadFormResources = async () => {
      try {
        const res = await api.get(
          `project/form-resources-web?company_id=${user.company_id}`,
        );
        if (res.data?.info) {
          setShift(res.data.info.shifts || []);
          setTeam(res.data.info.teams || []);
          setGeofence(res.data.info.workzones || []);
        }
      } catch (err) {
        console.error("Failed to refresh project form resources", err);
      }
    };

    loadFormResources();
  }, [open, user?.company_id]);

  useEffect(() => {
    if (!open) {
      setSettingsOpen(false);
    }
  }, [open]);

  async function onHandleSetting() {
    await fetchBudgetSettings();
    setSettingsOpen(true);
  }

  return (
    <>
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 450,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 450,
          padding: 2,
          backgroundColor: "#f9f9f9",
        },
      }}
    >
      <Box display="flex" flexDirection="column" height="100%">
        <Box height={"100%"}>
          <form onSubmit={handleSubmit} className="address-form">
            {" "}
            <Grid container>
              <Grid size={{ xs: 12 }}>
                <Box
                  display={"flex"}
                  justifyContent={"space-between"}
                >
                    <Box 
                        display={"flex"}
                        alignContent={"center"}
                        alignItems={"center"}
                        flexWrap={"wrap"}
                    >
                          <IconButton onClick={onClose}>
                            <IconArrowLeft />
                          </IconButton>
                          <Typography variant="h6" fontWeight={700}>
                            Edit Project
                          </Typography>
                    </Box>
                    
                    <IconButton onClick={onHandleSetting}>
                        <IconSettings />
                    </IconButton>
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
                  inputProps={{ maxLength: 50 }}
                  fullWidth
                />
                <Typography variant="h5" mt={2}>
                  Select Shifts
                </Typography>
                <Autocomplete
                  fullWidth
                  multiple
                  id="shift_ids"
                  options={shift}
                  value={shift.filter((item) =>
                    formData.shift_ids?.split(",").includes(String(item.id))
                  )}
                  onChange={(event, newValue) => {
                    const selectedIds = newValue
                      .map((item) => item.id)
                      .filter(Boolean);
                    setFormData({
                      ...formData,
                      shift_ids: selectedIds.join(","),
                    });
                  }}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Select Shifts" />
                  )}
                />
                <Typography variant="h5" mt={2}>
                  Select Teams
                </Typography>
                <Autocomplete
                  fullWidth
                  multiple
                  id="team_ids"
                  options={team}
                  value={team.filter((item) =>
                    formData.team_ids?.split(",").includes(String(item.id))
                  )}
                  onChange={(event, newValue) => {
                    const selectedIds = newValue
                      .map((item) => item.id)
                      .filter(Boolean);
                    setFormData({
                      ...formData,
                      team_ids: selectedIds.join(","),
                    });
                  }}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Select Teams" />
                  )}
                />
                <Typography variant="h5" mt={2}>
                  Select Geofence
                </Typography>
                <Autocomplete
                  fullWidth
                  multiple
                  id="workzone_ids"
                  options={geofence}
                  value={geofence.filter((item) =>
                    formData.workzone_ids?.split(",").includes(String(item.id))
                  )}
                  onChange={(event, newValue) => {
                    const selectedIds = newValue
                      .map((item) => item.id)
                      .filter(Boolean);
                    setFormData({
                      ...formData,
                      workzone_ids: selectedIds.join(","),
                    });
                  }}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      placeholder="Select Geofences"
                    />
                  )}
                />
                <Typography variant="h5" mt={2}>
                  Site Address
                </Typography>
                <CustomTextField
                  id="address"
                  name="address"
                  placeholder="Site Address.."
                  value={formData.address}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                />
                <Typography variant="h5" mt={2}>
                  Budget
                </Typography>
                <CustomTextField
                  id="budget"
                  name="budget"
                  type="text"
                  placeholder="Enter Budget.."
                  value={formData.budget}
                  onChange={handleChange}
                  inputProps={{
                    inputMode: "decimal",
                    pattern: "^[0-9]+(\\.[0-9]{0,2})?$",
                  }}
                  variant="outlined"
                  fullWidth
                />
                <Typography variant="h5" mt={2}>
                  Project Code
                </Typography>
                <CustomTextField
                  id="code"
                  name="code"
                  placeholder="Project Code.."
                  value={formData.code}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                />
                <Typography variant="h5" mt={2}>
                  Description
                </Typography>
                <TextField
                  id="description"
                  name="description"
                  multiline
                  placeholder="Enter Description.."
                  value={formData.description}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                />
              </Grid>
            </Grid>
            <Box
              sx={{
                display: "flex",
                justifyContent: "start",
                gap: 2,
                marginTop: 3,
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
        <Drawer
            anchor="right"
            open={settingsOpen}
            onClose={handleBudgetClose}
            sx={{
                width: 450,
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                    width: 450,
                    padding: 2,
                    backgroundColor: "#f9f9f9",
                },
            }}
        >
            {/* Header */}
            <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}
            >
                <Typography variant="h6" fontWeight={700}>
                    {formData.name || project?.name}
                </Typography>
                <IconButton onClick={handleBudgetClose}>
                    <IconX size={20} />
                </IconButton>
            </Box>

            <Box
                component="form"
                onSubmit={handleBudgetSubmit}
                className="address-form"
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    pt: 3,
                    overflow: 'hidden',
                }}
            >
                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    gap={2}
                    mb={2}
                >
                    <Typography variant="subtitle2" color="text.secondary">
                        Total: {formatCurrency(usedBudget)}
                    </Typography>
                </Box>

                <Stack spacing={2} sx={{ overflowY: "auto", pr: 0.5 }}>
                    {budgetSettings.map((row) => (
                        <Box
                            key={row.localId}
                            display="flex"
                            alignItems="flex-start"
                            gap={1}
                        >
                            <CustomTextField
                                id={`budget-type-${row.localId}`}
                                name="type"
                                placeholder="Type"
                                value={row.type}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    handleBudgetSettingChange(
                                        row.localId,
                                        "type",
                                        e.target.value
                                    )
                                }
                                inputProps={{ maxLength: 50 }}
                                InputProps={{
                                    readOnly: isBudgetTypeReadOnly(row),
                                }}
                                fullWidth
                                disabled={isBudgetLoading}
                                sx={{
                                    "& .MuiInputBase-input.Mui-readOnly": {
                                        cursor: "default",
                                    },
                                }}
                            />
                            <CustomTextField
                                id={`budget-amount-${row.localId}`}
                                name="budget_amount"
                                type="text"
                                placeholder="0"
                                value={row.budget_amount}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    handleBudgetSettingChange(
                                        row.localId,
                                        "budget_amount",
                                        e.target.value
                                    )
                                }
                                inputProps={{
                                    inputMode: 'decimal',
                                    pattern: '^[0-9]+(\\.[0-9]{0,2})?$',
                                }}
                                sx={{ width: 125, flexShrink: 0 }}
                                disabled={isBudgetLoading}
                            />
                        </Box>
                    ))}
                </Stack>

                <Box
                    sx={{
                        mt: 'auto',       
                        pt: 2,
                        display: 'flex',
                        gap: 2,
                    }}
                >
                    <Button
                        color="primary"
                        variant="contained"
                        size="large"
                        type="submit"
                        disabled={isBudgetSaving}
                        sx={{ borderRadius: 3, flex: 1 }}
                    >
                        {isBudgetSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                        variant="outlined"
                        size="large"
                        onClick={handleBudgetClose}
                        sx={{ borderRadius: 3, flex: 1 }}
                    >
                        Close
                    </Button>
                </Box>
            </Box>
        </Drawer>
    </>
  );
};

export default EditProject;
