import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  Box,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Avatar,
  AvatarGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { IconEdit, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import Image from "next/image";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import GroupDrawer, { GroupFormData, UserGroup } from "./group-drawer";

export default function UserGroupSettings() {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<UserGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `user-groups/list?company_id=${user.company_id}`,
      );
      if (res.data?.info) setGroups(res.data.info);
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.company_id) fetchGroups();
  }, [user?.company_id]);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(term));
  }, [groups, searchTerm]);

  const openDrawer = (group: UserGroup | null) => {
    setEditingGroup(group);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingGroup(null);
  };

  const saveGroup = async (data: GroupFormData) => {
    setIsSaving(true);
    try {
      const payload = {
        company_id: user.company_id,
        name: data.name.trim(),
        description: data.description.trim(),
        user_ids: data.members.map((m) => m.id),
      };
      const response = editingGroup
        ? await api.put(`user-groups/update`, {
            ...payload,
            id: editingGroup.id,
          })
        : await api.post(`user-groups/create`, payload);

      if (response.data.IsSuccess) {
        toast.success(response.data.message);
        closeDrawer();
        fetchGroups();
      }
    } catch (err) {
      console.error("Failed to save group", err);
    }
    setIsSaving(false);
  };

  const deleteGroup = async () => {
    if (!groupToDelete) return;
    setIsDeleting(true);
    try {
      const response = await api.delete(
        `user-groups/delete/${groupToDelete.id}?company_id=${user.company_id}`,
      );
      if (response.data.IsSuccess) {
        toast.success(response.data.message);
        fetchGroups();
      }
    } catch (err) {
      console.error("Failed to delete group", err);
    }
    setIsDeleting(false);
    setGroupToDelete(null);
  };

  return (
    <Box>
      <Box
        display={"flex"}
        justifyContent={"space-between"}
        alignItems={"center"}
        p={2}
        pb={1}
      >
        <Stack direction="row" alignItems="center" spacing={2} ml={2}>
          <Typography fontWeight={500}>Groups</Typography>
          <TextField
            size="small"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconSearch size={16} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>
        <Button
          variant="contained"
          startIcon={<IconPlus size={18} />}
          onClick={() => openDrawer(null)}
        >
          Add Group
        </Button>
      </Box>

      <TableContainer
        component={Paper}
        sx={{ p: 2, pt: 0, height: "calc(93vh - 100px)" }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="subtitle1">Name</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle1">Description</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle1">Users</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle1">Actions</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonLoader
                columns={[
                  { name: "Name" },
                  { name: "Description" },
                  { name: "Users" },
                  { name: "Actions" },
                ]}
                rowCount={5}
              />
            ) : filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "calc(50vh - 100px)",
                    }}
                  >
                    <Image
                      src="/images/no-data.png"
                      alt="No data"
                      style={{ maxWidth: "100%", maxHeight: "100%" }}
                      width={200}
                      height={200}
                    />
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredGroups.map((group) => (
                <TableRow key={group.id} hover>
                  <TableCell sx={{ padding: "10px" }}>
                    <Typography className="f-14" fontWeight={500}>
                      {group.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ padding: "10px", maxWidth: 320 }}>
                    <Typography className="f-14" color="textSecondary" noWrap>
                      {group.description || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ padding: "10px" }}>
                    {group.members_count === 0 ? (
                      <Typography className="f-14" color="textSecondary">
                        No users
                      </Typography>
                    ) : (
                      <Tooltip
                        title={group.members.map((m) => m.name).join(", ")}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <AvatarGroup
                            max={5}
                            sx={{
                              "& .MuiAvatar-root": {
                                width: 28,
                                height: 28,
                                fontSize: 12,
                              },
                            }}
                          >
                            {group.members.map((m) => (
                              <Avatar
                                key={m.id}
                                src={m.image ?? ""}
                                alt={m.name}
                              />
                            ))}
                          </AvatarGroup>
                          <Typography className="f-14" color="textSecondary">
                            {group.members_count}
                          </Typography>
                        </Stack>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ padding: "10px" }}>
                    <Tooltip title="Edit">
                      <IconButton
                        color="primary"
                        onClick={() => openDrawer(group)}
                      >
                        <IconEdit size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        color="error"
                        onClick={() => setGroupToDelete(group)}
                      >
                        <IconTrash size={18} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <GroupDrawer
        open={drawerOpen}
        group={editingGroup}
        onClose={closeDrawer}
        onSubmit={saveGroup}
        isSaving={isSaving}
      />

      <Dialog open={!!groupToDelete} onClose={() => setGroupToDelete(null)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to delete the group &quot;
            {groupToDelete?.name}&quot;?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setGroupToDelete(null)}
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={deleteGroup}
            variant="outlined"
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
