"use client";
import api from "@/utils/axios";
import {
  Box,
  Button,
  Divider,
  MenuItem,
  Select,
  Switch,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";
import { IconPlus, IconX, IconTrash } from "@tabler/icons-react";
import { User } from "next-auth";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const RateSetting = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [data, setData] = useState<any>([]);
  const [currency, setCurrency] = useState<number>();
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [permission, setPermission] = useState<string>("view");
  const [loading, setLoading] = useState<boolean>(false);
  const [enabled, setEnabled] = useState<boolean>(true);

  const [timeZone, setTimeZone] = useState<any>(0);
  const { data: session, update } = useSession();
  const user = session?.user as User & { company_id?: string | null } & {
    currency_id?: number | null;
  };

  // Get all users
  const fetchCompanyUsers = async () => {
    try {
      const res = await api.get("user/get-user-lists");
      if (res.data) {
        setUsers(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  useEffect(() => {
    fetchCompanyUsers();
  }, [user.company_id]);

  // Fetch users with pay rates
  const fetchUsers = async () => {
    try {
      const res = await api.get(
        `setting/payrate-users?company_id=${user.company_id}`
      );
      if (res.data.IsSuccess) {
        setData(res.data.info);
        setTimeZone(res.data.info[0].timezone_id);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  useEffect(() => {
    if (user?.company_id) {
      fetchUsers();
    }
  }, [user?.company_id]);

  useEffect(() => {
    if (openModal) {
      setSelectedUser("");
    }
  }, [openModal]);

  const handleSave = async () => {
    if (!selectedUser) return;
    try {
      const payload = {
        user_id: selectedUser,
        company_id: user.company_id,
        user_permission: permission,
      };
      const response = await api.post("setting/save-user-permission", payload);

      if (response.data.IsSuccess) {
        toast.success(response.data.message);
        setOpenModal(false);
        fetchUsers();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      console.error("Failed to save settings", err);
    } finally {
    }
  };

  const handlePermissionChange = async (
    userId: string,
    newPermission: string
  ) => {
    const updatedData = data.map((user: any) =>
      user.id === userId ? { ...user, permission: newPermission } : user
    );
    setData(updatedData);
    try {
      const payload = {
        user_id: userId,
        company_id: user.company_id,
        user_permission: newPermission,
      };
      const response = await api.post("setting/save-user-permission", payload);

      if (response.data.IsSuccess) {
        toast.success(response.data.message);
        fetchUsers();
      } else {
        fetchUsers();
      }
    } catch (err) {
      console.error("Error updating permission", err);
      fetchUsers();
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const payload = {
        id: id,
      };
      const response = await api.post(`setting/delete-payrate-user`, payload);
      if (response.data.IsSuccess) {
        toast.success(response.data.message);
        fetchUsers();
      }
    } catch (err) {
      console.error("Error deleting user", err);
    }
  };

  const handleCurrencyChange = async (
    e: React.ChangeEvent<{ value: unknown }>
  ) => {
    const selectedCurrency = e.target.value as string;
    setCurrency(Number(selectedCurrency));
    setLoading(true);
    const payload = {
      id: Number(user.company_id),
      currency_id: Number(selectedCurrency),
    };
    try {
      const response = await api.post("company/edit-company", payload);

      if (response.data.IsSuccess == true) {
        toast.success(response.data.message);
        setCurrency(Number(response.data.info.currency));
      }
    } catch (error) {
      console.error("API call failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    const newStatus = !enabled;
    setEnabled(newStatus);
    setLoading(true);
    const payload = {
      pay_rate_permission: newStatus,
      timeZone: timeZone,
    };

    try {
      const res = await api.post("setting/save-general-setting", payload);

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        setEnabled(res.data.info.pay_rate_permission);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneralSetting = async () => {
    try {
      const res = await api.get(`setting/general-settings`);
      if (res.data.IsSuccess && res.data.data) {
        setEnabled(!!res.data.data.pay_rate_permission);
        setTimeZone(res.data.data.timezone_id);
      }
    } catch (error) {
      console.error("Error fetching general setting:", error);
    }
  };

  useEffect(() => {
    if (user?.company_id) {
      fetchGeneralSetting();
    }
  }, [user?.company_id]);

  useEffect(() => {
    if (user?.company_id) {
      (async () => {
        try {
          const res = await api.get(
            `company/get-company?company_id=${user.company_id}`
          );
          if (res.data.IsSuccess && res.data.info.currency_id) {
            setCurrency(Number(res.data.info.currency_id));
          } 
        } catch (err) {
          console.error("Failed to fetch company currency", err);
        }
      })();
    }
  }, [user?.company_id]);

  return (
    <Box display={"flex"} overflow="auto">
      <Box sx={{ p: 3 }} m="auto" width={"60%"}>
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="space-between"
        >
          <Box
            display="flex"
            alignItems="center"
            gap={1}
            justifyContent={"space-between"}
            mb={3}
          >
            <Typography variant="h1" fontSize={"20px !important"}>
              Enable pay rates
            </Typography>
            {enabled !== null && (
              <Switch
                color="primary"
                checked={enabled}
                onChange={handleToggle}
                disabled={loading}
              />
            )}
          </Box>
          <Divider sx={{ borderWidth: 1 }} />
          <Box
            display="flex"
            justifyContent="space-between"
            mt={3}
            className={enabled ? "" : "disabled_location"}
          >
            <Box display="flex" alignItems="center" gap={1} sx={{ height: 32 }}>
              <Typography variant="h1" fontSize={"20px !important"}>
                Pay rate currency
              </Typography>
            </Box>
            <Box>
              <Select
                size="small"
                sx={{
                  width: 130,
                  "& .MuiOutlinedInput-root": {
                    height: 40,
                    fontSize: "0.875rem",
                  },
                  "& .MuiSelect-select": {
                    padding: "8px 12px",
                  },
                }}
                value={currency ?? ""}
                onChange={(e: any) => handleCurrencyChange(e)}
              >
                <MenuItem value={1}>£ - British Pound Sterling</MenuItem>
                <MenuItem value={2}>$ - USD Dollar</MenuItem>
              </Select>
            </Box>
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            mb={3}
            className={enabled ? "" : "disabled_location"}
          >
            Select the currency in which you pay your employees
          </Typography>
          <Divider sx={{ borderWidth: 1 }} />
          <Box
            display="flex"
            justifyContent="space-between"
            mt={3}
            className={enabled ? "" : "disabled_location"}
          >
            <Box display="flex" alignItems="center" gap={1} sx={{ height: 32 }}>
              <Typography variant="h1" fontSize={"20px !important"}>
                Admin Permissions
              </Typography>
            </Box>
            <Box>
              <Button
                variant="contained"
                startIcon={<IconPlus size={16} />}
                sx={{ borderRadius: 30 }}
                color="primary"
                onClick={() => setOpenModal(true)}
              >
                Add
              </Button>
            </Box>
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            mb={3}
            className={enabled ? "" : "disabled_location"}
          >
            Select which admin or users will have permissions to the pay rate,
            and what level of permission
          </Typography>
        </Box>

        {/* Displaying Pay Rate Users */}
        <List className={enabled ? "" : "disabled_location"}>
          {data.map((user: any) => (
            <Box>
              <ListItem
                key={user.id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                  mt: 2,
                }}
              >
                <ListItemAvatar>
                  <Avatar alt={user.name} src={user.user_image}>
                    {user.name ? user.name.charAt(0) : ""}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={user.name} />
                <ListItemSecondaryAction sx={{ mb: 2 }}>
                  <Select
                    value={user.permission}
                    onChange={(e) =>
                      handlePermissionChange(user.user_id, e.target.value)
                    }
                  >
                    <MenuItem value="view">View only</MenuItem>
                    <MenuItem value="view_edit">View & Edit</MenuItem>
                  </Select>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    <IconTrash />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider sx={{ borderWidth: 1 }} />
            </Box>
          ))}
        </List>
      </Box>

      {/* Modal for adding users */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        className="permission_dialog"
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography>Select User and Permission</Typography>
          <IconButton aria-label="close" onClick={() => setOpenModal(false)}>
            <IconX />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Select User</InputLabel>
            <Select
              value={selectedUser || ""}
              onChange={(e) => setSelectedUser(e.target.value)}
              label="Select User"
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Permission</InputLabel>
            <Select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              label="Permission"
            >
              <MenuItem value="view">Only view</MenuItem>
              <MenuItem value="view_edit">View & Edit</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            color="primary"
            disabled={loading || !selectedUser}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RateSetting;
