import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  Autocomplete,
  Avatar,
  Chip,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";

export interface GroupMember {
  id: number;
  name: string;
  image?: string | null;
  group_id?: number | null;
  group_name?: string | null;
}

export interface UserGroup {
  id: number;
  name: string;
  description: string | null;
  members_count: number;
  members: GroupMember[];
}

export interface GroupFormData {
  name: string;
  description: string;
  members: GroupMember[];
}

interface GroupDrawerProps {
  open: boolean;
  group: UserGroup | null;
  onClose: () => void;
  onSubmit: (data: GroupFormData) => void;
  isSaving: boolean;
}

const emptyForm: GroupFormData = { name: "", description: "", members: [] };

const GroupDrawer: React.FC<GroupDrawerProps> = ({
  open,
  group,
  onClose,
  onSubmit,
  isSaving,
}) => {
  const [formData, setFormData] = useState<GroupFormData>(emptyForm);
  const [users, setUsers] = useState<GroupMember[]>([]);

  useEffect(() => {
    if (!open) return;
    setFormData(
      group
        ? {
            name: group.name,
            description: group.description ?? "",
            members: group.members,
          }
        : emptyForm,
    );

    const fetchUsers = async () => {
      try {
        const res = await api.get(`user/get-user-lists`);
        if (res.data?.info) {
          setUsers(
            res.data.info.map((u: any) => ({
              id: u.id,
              name: u.name,
              image: u.user_thumb_image || u.user_image || null,
              group_id: u.group_id ?? null,
              group_name: u.group_name ?? null,
            })),
          );
        }
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    fetchUsers();
  }, [open, group]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 400,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 400,
          padding: 2,
          backgroundColor: "#f9f9f9",
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <Box display={"flex"} alignItems={"center"} flexWrap={"wrap"}>
          <IconButton onClick={onClose}>
            <IconArrowLeft />
          </IconButton>
          <Typography variant="h6" color="inherit" fontWeight={700}>
            {group ? "Edit group" : "Add group"}
          </Typography>
        </Box>

        <Typography variant="body2" mt={2}>
          Name
        </Typography>
        <CustomTextField
          id="name"
          name="name"
          className="custom_input"
          placeholder="Enter group name.."
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, name: e.target.value })
          }
          inputProps={{ maxLength: 100 }}
          variant="outlined"
          fullWidth
        />

        <Typography variant="body2" mt={2}>
          Description
        </Typography>
        <CustomTextField
          id="description"
          name="description"
          className="custom_input"
          placeholder="Enter description.."
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, description: e.target.value })
          }
          variant="outlined"
          fullWidth
          multiline
          minRows={2}
        />

        <Typography variant="body2" mt={2}>
          Users
        </Typography>
        <Autocomplete
          multiple
          fullWidth
          disableCloseOnSelect
          filterSelectedOptions
          options={users}
          value={formData.members}
          onChange={(_, newValue) =>
            setFormData({ ...formData, members: newValue })
          }
          getOptionLabel={(option) => option.name || ""}
          slotProps={{ listbox: { sx: { maxHeight: 260 } } }}
          getOptionDisabled={(option) =>
            !!option.group_id && option.group_id !== group?.id
          }
          isOptionEqualToValue={(option, value) =>
            Number(option.id) === Number(value.id)
          }
          renderOption={({ key, ...props }, option) => (
            <li {...props} key={option.id}>
              <Avatar
                src={option.image ?? ""}
                alt={option.name}
                sx={{ width: 24, height: 24, mr: 1 }}
              />
              {option.name}
              {option.group_id && option.group_id !== group?.id && (
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ ml: "auto", pl: 1, whiteSpace: "nowrap" }}
                >
                  In: {option.group_name}
                </Typography>
              )}
            </li>
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index });
              return (
                <Chip
                  {...tagProps}
                  key={option.id}
                  size="small"
                  avatar={<Avatar src={option.image ?? ""} alt={option.name} />}
                  label={option.name}
                  sx={{ maxWidth: "100%" }}
                />
              );
            })
          }
          renderInput={(params) => (
            <CustomTextField
              {...params}
              placeholder={formData.members.length ? "" : "Select users"}
              sx={{
                "& .MuiAutocomplete-inputRoot": {
                  flexWrap: "wrap",
                  alignItems: "center",
                  height: "auto",
                  minHeight: 44,
                  paddingTop: "6px",
                  paddingBottom: "6px",
                  paddingRight: "65px !important",
                  // Many selected users would otherwise grow the box over the
                  // whole drawer and push the options list off screen. Static
                  // positioning keeps the end buttons anchored to the
                  // FormControl so they don't scroll with the chips.
                  position: "static",
                  maxHeight: 160,
                  overflowY: "auto",
                },
                "& .MuiAutocomplete-input": {
                  minWidth: "80px !important",
                  flexGrow: 1,
                },
                "& .MuiAutocomplete-tag": { margin: "3px", maxWidth: "100%" },
                "& .MuiAutocomplete-endAdornment": {
                  right: "8px",
                  top: "22px",
                  transform: "translateY(-50%)",
                },
              }}
            />
          )}
        />

        <Typography
          variant="caption"
          color="textSecondary"
          display="block"
          mt={0.5}
        >
          A user can be in only one group. Users already in another group can't
          be selected; remove them from that group first.
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "start", gap: 2, mt: 3 }}>
          <Button
            color="primary"
            variant="contained"
            size="large"
            type="submit"
            disabled={isSaving || !formData.name.trim()}
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
    </Drawer>
  );
};

export default GroupDrawer;
