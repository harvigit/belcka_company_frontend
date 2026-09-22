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
import { IconSettings, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import ProjectUserMultiSelect from "@/app/components/apps/projects/UserMultiSelect";
import IOSSwitch from "@/app/components/common/IOSSwitch";

interface FormData {
  id?: number;
  name: string;
  address: string;
  budget: string;
  description?: string;
  code: number;
  // shift_ids: string;
  team_ids: string;
  user_ids?: string;
  setting_user_ids?: string;
  user_roles?: { user_id: number; project_role_id: number | null }[];
  company_id: number;
  workzone_ids?: string;
  project_limit?: string | number;
  allow_work?: boolean;
}

// interface Shift {
//   id: number | null;
//   name: string;
// }

interface Team {
  id: number | null;
  name: string;
}

interface AssignedUser {
  id: number;
  name: string;
  user_image?: string | null;
  user_thumb_image?: string | null;
}

interface ProjectRoleOption {
  id: number;
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
  assignedUsers?: {
    id: number;
    name?: string;
    role_id?: number | null;
    role_name?: string | null;
  }[];
  onAssigneeRoleChange?: (
    users: {
      id: number;
      name: string;
      role_id?: number | null;
      role_name?: string | null;
    }[],
  ) => void;
  embedded?: boolean;
  showSettingsAccess?: boolean;
}

const EditProject: React.FC<EditProjectProps> = ({
  open,
  onClose,
  onBudgetSaved,
  formData,
  setFormData,
  handleSubmit,
  project,
  assignedUsers,
  onAssigneeRoleChange,
  isSaving,
  embedded = false,
  showSettingsAccess = false,
}) => {
  const router = useRouter();

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
        (setting) => setting.type.toLowerCase() === type.toLowerCase(),
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
          (type) => type.toLowerCase() === setting.type.toLowerCase(),
        ),
    );

    return [...defaultRows, ...customRows];
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    if (
      (name === "budget" || name === "project_limit") &&
      !/^\d*$/.test(value)
    ) {
      return;
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const mapAssignedRoles = (
    users: { id: number; role_id?: number | null }[] = [],
  ) =>
    users.map((u) => ({
      user_id: Number(u.id),
      project_role_id: u.role_id ? Number(u.role_id) : null,
    }));

  useEffect(() => {
    if (project) {
      const roleUsers = assignedUsers ?? project.assigned_users ?? [];
      setFormData({
        id: project.id,
        name: project.name || "",
        address: project.address || "",
        budget: String(project.budget || ""),
        description: project.description || "",
        code: project.code || "",
        company_id: project.company_id || 0,
        project_limit:
          project.project_limit === 0 || project.project_limit
            ? String(project.project_limit)
            : "",
        allow_work: project.allow_work !== false,
        // shift_ids: (project.shifts || []).map((s: any) => s.id).join(","),
        team_ids: (project.teams || []).map((t: any) => t.id).join(","),
        user_ids: (project.assigned_users || [])
          .map((u: any) => u.id)
          .join(","),
        user_roles: mapAssignedRoles(roleUsers),
        ...(showSettingsAccess
          ? {
              setting_user_ids: (project.setting_users || [])
                .map((u: any) => u.id)
                .join(","),
            }
          : {}),
        workzone_ids: (project.project_address || [])
          .map((g: any) => g.workzone_id)
          .join(","),
      });
      const defaultSettings = createDefaultBudgetSettings();
      setBudgetSettings(defaultSettings);
      setSavedBudgetSettings(defaultSettings);
    }
  }, [project, showSettingsAccess, setFormData]);

  useEffect(() => {
    if (!assignedUsers) return;
    setFormData((prevData) => ({
      ...prevData,
      user_roles: mapAssignedRoles(assignedUsers),
    }));
  }, [assignedUsers, setFormData]);

  // const [shift, setShift] = useState<Shift[]>([]);
  const [team, setTeam] = useState<Team[]>([]);
  const [users, setUsers] = useState<AssignedUser[]>([]);
  const [roles, setRoles] = useState<ProjectRoleOption[]>([]);
  const [geofence, setGeofence] = useState<Geofence[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currency, setCurrency] = useState("");

  const [budgetSettings, setBudgetSettings] = useState<BudgetSettingRow[]>([
    ...createDefaultBudgetSettings(),
  ]);
  const [savedBudgetSettings, setSavedBudgetSettings] = useState<
    BudgetSettingRow[]
  >(createDefaultBudgetSettings());

  const [isBudgetSaving, setIsBudgetSaving] = useState(false);
  const [isBudgetLoading, setIsBudgetLoading] = useState(false);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const usedBudget = budgetSettings.reduce(
    (total, row) =>
      total + Number(normalizeBudgetValue(row.budget_amount) || 0),
    0,
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
      const res = await api.get(
        `project/get-budget-settings?project_id=${project.id}`,
      );
      const nextSettings = normalizeBudgetSettings(res.data?.info || []);
      if (res.data.IsSuccess) {
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
    value: string,
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
          : row,
      ),
    );
  };

  const isBudgetTypeReadOnly = (row: BudgetSettingRow) =>
    Boolean(row.id) ||
    defaultBudgetTypes.some(
      (type) => type.toLowerCase() === row.type.toLowerCase(),
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

  // useEffect(() => {
  //   const getShifts = async () => {
  //     try {
  //       const res = await api.get(
  //         `get-company-resources?flag=shiftList&company_id=${user.company_id}`
  //       );
  //       if (res.data?.info) {
  //         setShift(res.data.info);
  //       }
  //     } catch (err) {
  //       console.error("Failed to refresh project data", err);
  //     }
  //   };
  //   if (open == true) {
  //     getShifts();
  //   }
  // }, [open, user?.company_id]);

  useEffect(() => {
    if (!open) {
      setSettingsOpen(false);
    }
  }, [open]);

  useEffect(() => {
    const getTeams = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=teamList&company_id=${user.company_id}`,
        );
        if (res.data?.info) {
          setTeam(res.data.info);
        }
      } catch (err) {
        console.error("Failed to refresh project data", err);
      }
    };
    if (open || embedded) {
      getTeams();
    }
  }, [open, embedded, user?.company_id]);

  useEffect(() => {
    const getUsers = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=usersList&company_id=${user.company_id}`,
        );
        if (res.data?.info) {
          const uniqueUsers = Array.from(
            new Map(
              (res.data.info as AssignedUser[])
                .filter((item) => item?.id != null)
                .map((item) => [item.id, item]),
            ).values(),
          );
          setUsers(uniqueUsers);
        }
      } catch (err) {
        console.error("Failed to load users", err);
      }
    };
    if (open || embedded) {
      getUsers();
    }
  }, [open, embedded, user?.company_id]);

  useEffect(() => {
    const getRoles = async () => {
      try {
        const res = await api.get(
          `project-roles/get?company_id=${user.company_id}`,
        );
        if (res.data?.info) {
          setRoles(
            (res.data.info as ProjectRoleOption[])
              .filter((item) => item?.id != null)
              .map((item) => ({ id: item.id, name: item.name })),
          );
        }
      } catch (err) {
        console.error("Failed to load project roles", err);
      }
    };
    if (open || embedded) {
      getRoles();
    }
  }, [open, embedded, user?.company_id]);

  const handleAssigneeRoleChange = async (
    userId: number,
    newRole: ProjectRoleOption | null,
    assignedRows: { id: number; name: string }[],
  ) => {
    const roleId = newRole?.id ? Number(newRole.id) : null;
    setFormData((prevData) => {
      const nextRoles = (prevData.user_roles || []).filter(
        (role) => Number(role.user_id) !== Number(userId),
      );
      nextRoles.push({
        user_id: Number(userId),
        project_role_id: roleId,
      });
      return { ...prevData, user_roles: nextRoles };
    });

    const nextAssigned = assignedRows.map((row) => {
      const isTarget = Number(row.id) === Number(userId);
      const parentRow = assignedUsers?.find(
        (item) => Number(item.id) === Number(row.id),
      );
      const currentRole = (formData.user_roles || []).find(
        (role) => Number(role.user_id) === Number(row.id),
      );
      const currentRoleOption = roles.find(
        (role) => Number(role.id) === Number(currentRole?.project_role_id),
      );
      return {
        id: Number(row.id),
        name: row.name,
        role_id: isTarget
          ? roleId
          : (parentRow?.role_id ?? currentRoleOption?.id ?? null),
        role_name: isTarget
          ? (newRole?.name ?? null)
          : (parentRow?.role_name ?? currentRoleOption?.name ?? null),
      };
    });
    onAssigneeRoleChange?.(nextAssigned);

    if (!onAssigneeRoleChange || !project?.id || !user?.company_id) return;

    try {
      const res = await api.post("project/update-assignee-role", {
        company_id: user.company_id,
        project_id: project.id,
        user_id: userId,
        project_role_id: roleId,
      });
      if (res.data?.IsSuccess) {
        if (Array.isArray(res.data.info)) {
          onAssigneeRoleChange(res.data.info);
        }
      } else {
        toast.error(res.data?.message || "Failed to update role");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update role");
    }
  };

  useEffect(() => {
    const getGeofence = async () => {
      try {
        const res = await api.get(
          `work-zone/get?company_id=${user.company_id}`,
        );
        if (res.data?.info) {
          const zones: Geofence[] = res.data.info.map((z: any) => ({
            id: z.id,
            name: z.name,
          }));
          setGeofence(zones);
        }
      } catch (err) {
        console.error("Failed to refresh project data", err);
      }
    };
    if (open || embedded) {
      getGeofence();
    }
  }, [open, embedded, user?.company_id]);

  async function onHandleSetting() {
    await fetchBudgetSettings();
    setSettingsOpen(true);
  }

  const handleShiftManagementClick = () => {
    const projectId = project?.id || formData.id;

    if (!projectId) {
      toast.error("Project is required to open shift management");
      return;
    }

    sessionStorage.setItem(
      "shift_management_project",
      JSON.stringify({
        project_id: Number(projectId),
        project_name: formData.name || project?.name || "",
      }),
    );

    onClose();
    router.push("/apps/time-clock/list");
  };

  const formContent = (
    <Box
      display="flex"
      flexDirection="column"
      height={embedded ? "auto" : "100%"}
    >
      <Box height={embedded ? "auto" : "100%"}>
        <form onSubmit={handleSubmit} className="address-form">
          {" "}
          <Grid container>
            <Grid size={{ xs: 12 }}>
              {!embedded && (
                <Box
                  display={"flex"}
                  alignItems={"center"}
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

                  <Box display={"flex"} alignItems={"center"}>
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      onClick={handleShiftManagementClick}
                      sx={{
                        cursor: "pointer",
                        color: "primary.main",
                      }}
                    >
                      Shift Management
                    </Typography>

                    <IconButton onClick={onHandleSetting}>
                      <IconSettings />
                    </IconButton>
                  </Box>
                </Box>
              )}
              {(() => {
                const selectedTeamIds = (formData.team_ids || "")
                  .split(",")
                  .filter(Boolean);
                const nameField = (
                  <>
                    <Typography
                      variant="h5"
                      mt={embedded ? 0 : 2}
                      className="f-14"
                    >
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
                  </>
                );
                const teamsField = (
                  <>
                    <Typography
                      variant="h5"
                      mt={embedded ? 0 : 2}
                      className="f-14"
                    >
                      Select Teams
                    </Typography>
                    <Autocomplete
                      fullWidth
                      multiple
                      id="team_ids"
                      options={team}
                      value={team.filter((item) =>
                        formData.team_ids?.split(",").includes(String(item.id)),
                      )}
                      onChange={(event, newValue) => {
                        let selectedIds = newValue
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
                        <CustomTextField
                          {...params}
                          placeholder="Select Teams"
                        />
                      )}
                    />
                  </>
                );
                const usersField = (
                  <ProjectUserMultiSelect
                    id="user_ids"
                    label="Assigned Users"
                    placeholder="Select Assigned Users"
                    options={users}
                    selectedIds={formData.user_ids || ""}
                    onChange={(ids) => {
                      const idSet = new Set(
                        String(ids)
                          .split(",")
                          .map((value) => Number(value.trim()))
                          .filter(
                            (value) => Number.isInteger(value) && value > 0,
                          ),
                      );
                      setFormData({
                        ...formData,
                        user_ids: ids,
                        user_roles: (formData.user_roles || []).filter((item) =>
                          idSet.has(Number(item.user_id)),
                        ),
                      });
                    }}
                    labelMt={embedded ? 0 : 2}
                  />
                );
                const assignedIdList = String(formData.user_ids || "")
                  .split(",")
                  .map((value) => Number(value.trim()))
                  .filter((value) => Number.isInteger(value) && value > 0);
                const assignedUserRows = assignedIdList.map((id) => {
                  const fromUsers = users.find(
                    (item) => Number(item.id) === id,
                  );
                  const fromProject = (project?.assigned_users || []).find(
                    (item: any) => Number(item.id) === id,
                  );
                  const fromAssigned = assignedUsers?.find(
                    (item) => Number(item.id) === id,
                  );
                  return (
                    fromUsers ||
                    fromAssigned ||
                    fromProject || { id, name: `User ${id}` }
                  );
                });
                const assignRoleField = (
                  <>
                    <Typography
                      variant="h5"
                      mt={embedded ? 0 : 2}
                      className="f-14"
                    >
                      Assign Role
                    </Typography>
                    {assignedUserRows.length === 0 ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        mt={0.5}
                      >
                        Select assigned users first.
                      </Typography>
                    ) : (
                      <Stack spacing={1.25} mt={1}>
                        {assignedUserRows.map((item) => {
                          const selectedRoleId =
                            (formData.user_roles || []).find(
                              (role) =>
                                Number(role.user_id) === Number(item.id),
                            )?.project_role_id ?? null;
                          const selectedRole =
                            roles.find(
                              (role) =>
                                Number(role.id) === Number(selectedRoleId),
                            ) || null;

                          return (
                            <Stack
                              key={item.id}
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1.5}
                              alignItems={{ xs: "stretch", sm: "center" }}
                            >
                              <Typography
                                className="f-14"
                                sx={{ minWidth: { sm: 180 }, fontWeight: 500 }}
                              >
                                {item.name}
                              </Typography>
                              <Autocomplete
                                size="small"
                                fullWidth
                                options={roles}
                                value={selectedRole}
                                onChange={(_, newValue) => {
                                  handleAssigneeRoleChange(
                                    Number(item.id),
                                    newValue,
                                    assignedUserRows,
                                  );
                                }}
                                getOptionLabel={(option) => option.name}
                                isOptionEqualToValue={(option, value) =>
                                  option.id === value.id
                                }
                                renderInput={(params) => (
                                  <CustomTextField
                                    {...params}
                                    placeholder="Select role"
                                  />
                                )}
                              />
                            </Stack>
                          );
                        })}
                      </Stack>
                    )}
                  </>
                );
                // const showSettingsField = (
                //   <ProjectUserMultiSelect
                //     id="setting_user_ids"
                //     label="Project setting visible to"
                //     placeholder="Select users who can see Settings"
                //     options={users}
                //     selectedIds={formData.setting_user_ids || ""}
                //     onChange={(ids) =>
                //       setFormData({
                //         ...formData,
                //         setting_user_ids: ids,
                //       })
                //     }
                //     // helperText="These users can open this project's Settings tab. Admins can always see it, with or without being assigned."
                //     labelMt={embedded ? 0 : 2}
                //   />
                // );
                const addressField = (
                  <>
                    <Typography
                      variant="h5"
                      mt={embedded ? 0 : 2}
                      className="f-14"
                    >
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
                  </>
                );
                const budgetField = (
                  <>
                    <Typography
                      variant="h5"
                      mt={embedded ? 0 : 2}
                      className="f-14"
                    >
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
                  </>
                );
                const codeField = (
                  <>
                    <Typography
                      variant="h5"
                      mt={embedded ? 0 : 2}
                      className="f-14"
                    >
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
                  </>
                );
                const descriptionField = (
                  <>
                    <Typography
                      variant="h5"
                      mt={embedded ? 0 : 2}
                      className="f-14"
                    >
                      Description
                    </Typography>
                    <TextField
                      id="description"
                      name="description"
                      multiline
                      minRows={embedded ? 2 : 1}
                      placeholder="Enter Description.."
                      value={formData.description}
                      onChange={handleChange}
                      variant="outlined"
                      fullWidth
                    />
                  </>
                );

                const projectLimitField = (
                  <>
                    <Typography
                      variant="h5"
                      mt={embedded ? 0 : 2}
                      className="f-14"
                    >
                      Project Limit
                    </Typography>
                    <CustomTextField
                      id="project_limit"
                      name="project_limit"
                      placeholder="Enter project limit..."
                      value={formData.project_limit ?? ""}
                      onChange={handleChange}
                      inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                      variant="outlined"
                      fullWidth
                    />
                  </>
                );
                const allowWorkField = (
                  <>
                    <Typography color="text.secondary" className="f-14">
                      Allow to start work
                    </Typography>
                    <IOSSwitch
                      color="primary"
                      checked={formData.allow_work !== false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allow_work: e.target.checked,
                        })
                      }
                    />
                  </>
                );

                if (embedded) {
                  return (
                    <Grid container spacing={2.5}>
                      <Grid size={{ xs: 12, md: 6 }}>{nameField}</Grid>
                      <Grid size={{ xs: 12, md: 6 }}>{codeField}</Grid>
                      <Grid size={{ xs: 12, md: 6 }}>{teamsField}</Grid>
                      <Grid size={{ xs: 12, md: 6 }}>{usersField}</Grid>
                      <Grid size={{ xs: 12, md: 6 }}>{projectLimitField}</Grid>
                      <Grid size={{ xs: 12, md: 6 }}>{allowWorkField}</Grid>
                      <Grid size={{ xs: 12, md: 6 }}>{addressField}</Grid>
                      <Grid size={{ xs: 12, md: 6 }}>{assignRoleField}</Grid>
                      <Grid size={{ xs: 12, md: 6 }}>{descriptionField}</Grid>
                    </Grid>
                  );
                }

                return (
                  <>
                    {nameField}
                    {teamsField}
                    {usersField}
                    {/* {assignRoleField} */}
                    {/* {geofenceField} */}
                    {addressField}
                    {budgetField}
                    {codeField}
                    {/* {projectLimitField} */}
                    {descriptionField}
                    {/* {allowWorkField} */}
                  </>
                );
              })()}
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

            {!embedded && (
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
            )}
          </Box>
        </form>
      </Box>
    </Box>
  );

  return (
    <>
      {embedded ? (
        formContent
      ) : (
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
          {formContent}
        </Drawer>
      )}
      {!embedded && (
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
            sx={{
              borderBottom: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
            }}
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
              display: "flex",
              flexDirection: "column",
              pt: 3,
              overflow: "hidden",
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
                        e.target.value,
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
                        e.target.value,
                      )
                    }
                    inputProps={{
                      inputMode: "decimal",
                      pattern: "^[0-9]+(\\.[0-9]{0,2})?$",
                    }}
                    sx={{ width: 125, flexShrink: 0 }}
                    disabled={isBudgetLoading}
                  />
                </Box>
              ))}
            </Stack>

            <Box
              sx={{
                mt: "auto",
                pt: 2,
                display: "flex",
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
                {isBudgetSaving ? "Saving..." : "Save"}
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
      )}
    </>
  );
};

export default EditProject;
