"use client";
import api from "@/utils/axios";
import {
    Box,
    Button,
    Divider,
    MenuItem,
    Select,
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
import IOSSwitch from '@/app/components/common/IOSSwitch';

const UserSettings = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [data, setData] = useState<any>([]);
    const [openModal, setOpenModal] = useState<boolean>(false);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [permission, setPermission] = useState<string>("view");
    const [loading, setLoading] = useState<boolean>(false);
    const { data: session } = useSession();
    const user = session?.user as User & { company_id?: string | null } & {
        currency_id?: number | null;
    };

    // Get all users
    const fetchCompanyUsers = async () => {
        try {
            const res = await api.get(
                `get-company-resources?company_id=${user.company_id}&flag=usersList`
            );
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

    // Fetch users who have Users module permission access
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get(
                `setting/permission-setting-users?company_id=${user.company_id}&permission_for=users`
            );
            if (res.data.IsSuccess) {
                setData(res.data.info);
            } else {
                toast.error(res.data.message);
            }
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
        setLoading(false);
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
                permission_for: "users",
            };
            const response = await api.post("setting/user-permission-setting", payload);

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
            String(user.user_id ?? user.id) === String(userId)
                ? { ...user, permission: newPermission }
                : user
        );
        setData(updatedData);
        try {
            const payload = {
                user_id: userId,
                company_id: user.company_id,
                user_permission: newPermission,
                permission_for: "users",
            };
            const response = await api.post("setting/user-permission-setting", payload);

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
        setLoading(true);
        try {
            const payload = {
                id: id,
                permission_for: "users",
            };
            const response = await api.post(`setting/delete-permission-user`, payload);
            if (response.data.IsSuccess) {
                toast.success(response.data.message);
                fetchUsers();
            }
        } catch (err) {
            console.error("Error deleting user", err);
        }
        setLoading(false);
    };

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
                            Users Permissions
                        </Typography>
                    </Box>
                    <Divider sx={{ borderWidth: 1 }} />
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        mt={3}
                    >
                        <Box display="flex" alignItems="center" gap={1} sx={{ height: 32 }}>
                            <Typography variant="h1" fontSize={"20px !important"}>
                                Access List
                            </Typography>
                        </Box>
                        <Box>
                            <Button
                                variant="contained"
                                startIcon={<IconPlus size={16} />}
                                sx={{ borderRadius: 30 }}
                                color="primary"
                                onClick={() => setOpenModal(true)}
                                disabled={loading}
                            >
                                Add
                            </Button>
                        </Box>
                    </Box>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        mb={3}
                    >
                        Select users who can open Users permissions and assign either
                        view-only or view & edit access.
                    </Typography>
                </Box>

                {/* Displaying Users Permissions */}
                <List>
                    {data.map((user: any) => (
                        <Box key={user.id}>
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
                                    {!loading && (
                                        <IconButton
                                            edge="end"
                                            disabled={loading}
                                            aria-label="delete"
                                            onClick={() => handleDeleteUser(user.id)}
                                        >
                                            <IconTrash />
                                        </IconButton>
                                    )}
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

export default UserSettings;
