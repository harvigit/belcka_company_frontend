"use client";

import React, { useState } from "react";
import { Chip, Menu, MenuItem, Stack } from "@mui/material";
import toast from "react-hot-toast";
import api from "@/utils/axios";

export type AssignedProjectUser = {
  id: number;
  name: string;
  role_id?: number | null;
  role_name?: string | null;
};

export type ProjectRoleOption = {
  id: number;
  name: string;
};

type AssigneeRoleChipsProps = {
  projectId: number;
  companyId?: number | null;
  users: AssignedProjectUser[];
  roles: ProjectRoleOption[];
  canEdit?: boolean;
  onUsersChange?: (users: AssignedProjectUser[]) => void;
};

const AssigneeRoleChips: React.FC<AssigneeRoleChipsProps> = ({
  projectId,
  companyId,
  users,
  roles,
  canEdit = false,
  onUsersChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);

  const activeUser = users.find((item) => item.id === activeUserId) || null;

  const saveRole = async (userId: number, roleId: number | null) => {
    if (!companyId || !projectId) return;
    setSavingUserId(userId);
    try {
      const res = await api.post("project/update-assignee-role", {
        company_id: companyId,
        project_id: projectId,
        user_id: userId,
        project_role_id: roleId,
      });
      if (res.data?.IsSuccess) {
        onUsersChange?.(res.data.info || []);
        toast.success(res.data.message || "Role updated");
      } else {
        toast.error(res.data?.message || "Failed to update role");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update role");
    } finally {
      setSavingUserId(null);
      setAnchorEl(null);
      setActiveUserId(null);
    }
  };

  if (!users.length) return null;

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        useFlexGap
        flexWrap="wrap"
        sx={{ minWidth: 0, flex: 1 }}
      >
        {users.map((item) => {
          const label = item.role_name
            ? `${item.name} · ${item.role_name}`
            : item.name;
          return (
            <Chip
              key={item.id}
              size="small"
              variant="outlined"
              color="primary"
              label={label}
              disabled={savingUserId === item.id}
              onClick={
                canEdit
                  ? (event) => {
                      setAnchorEl(event.currentTarget);
                      setActiveUserId(item.id);
                    }
                  : undefined
              }
              onDelete={
                canEdit && item.role_id
                  ? () => saveRole(item.id, null)
                  : undefined
              }
              sx={{
                fontWeight: 500,
                borderRadius: "6px",
                maxWidth: "100%",
                "& .MuiChip-label": {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              }}
            />
          );
        })}
      </Stack>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && activeUserId != null}
        onClose={() => {
          setAnchorEl(null);
          setActiveUserId(null);
        }}
      >
        <MenuItem disabled>{activeUser?.name || "Select role"}</MenuItem>
        {roles.map((role) => (
          <MenuItem
            key={role.id}
            selected={Number(activeUser?.role_id) === Number(role.id)}
            onClick={() => {
              if (activeUserId != null) {
                saveRole(activeUserId, role.id);
              }
            }}
          >
            {role.name}
          </MenuItem>
        ))}
        {activeUser?.role_id ? (
          <MenuItem
            onClick={() => {
              if (activeUserId != null) {
                saveRole(activeUserId, null);
              }
            }}
          >
            Remove role
          </MenuItem>
        ) : null}
      </Menu>
    </>
  );
};

export default AssigneeRoleChips;
