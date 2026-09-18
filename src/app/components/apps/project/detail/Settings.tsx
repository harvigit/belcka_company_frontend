"use client";

import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import EditProject from "@/app/components/apps/projects/edit";

type AssignedProjectUser = {
  id: number;
  name: string;
  role_id?: number | null;
  role_name?: string | null;
};

type ProjectSettingsTabProps = {
  projectId: number;
  onProjectName?: (name: string) => void;
  onAssignedUsers?: (users: AssignedProjectUser[]) => void;
  assignedUsers?: AssignedProjectUser[];
};

const emptyFormData = {
  name: "",
  address: "",
  budget: "",
  description: "",
  code: 0,
  team_ids: "",
  user_ids: "",
  setting_user_ids: "",
  user_roles: [],
  company_id: 0,
  workzone_ids: "",
};

const ProjectSettingsTab: React.FC<ProjectSettingsTabProps> = ({
  projectId,
  onProjectName,
  onAssignedUsers,
  assignedUsers,
}) => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [formData, setFormData] = useState<any>(emptyFormData);

  const loadData = async (options?: { silent?: boolean; preferServer?: boolean }) => {
    if (!projectId || !user?.company_id) return;
    if (!options?.silent) setLoading(true);
    try {
      const projectRes = await api.get(
        `project/get?company_id=${user.company_id}&project_id=${projectId}`,
      );
      const projectRow = Array.isArray(projectRes.data?.info)
        ? projectRes.data.info[0]
        : projectRes.data?.info;
      const nextAssignedUsers =
        !options?.preferServer && assignedUsers && assignedUsers.length
          ? assignedUsers
          : projectRow?.assigned_users || [];
      setProject(
        projectRow
          ? { ...projectRow, assigned_users: nextAssignedUsers }
          : null,
      );
      if (projectRow?.name) {
        onProjectName?.(projectRow.name);
      }
      if (
        (options?.preferServer || !assignedUsers?.length) &&
        Array.isArray(projectRow?.assigned_users)
      ) {
        onAssignedUsers?.(projectRow.assigned_users);
      }
    } catch (error) {
      console.error("Failed to load project settings", error);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user?.company_id]);

  useEffect(() => {
    if (!assignedUsers) return;
    const nextRoles = assignedUsers.map((item) => ({
      user_id: Number(item.id),
      project_role_id: item.role_id ? Number(item.role_id) : null,
    }));
    setFormData((prev) => {
      const prevKey = (prev.user_roles || [])
        .map((item: any) => `${item.user_id}:${item.project_role_id ?? ""}`)
        .join("|");
      const nextKey = nextRoles
        .map((item) => `${item.user_id}:${item.project_role_id ?? ""}`)
        .join("|");
      if (prevKey === nextKey) return prev;
      return { ...prev, user_roles: nextRoles };
    });
  }, [assignedUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !formData?.id) return;
    setIsSaving(true);
    try {
      const res = await api.put("project/update", {
        ...formData,
        user_roles: formData.user_roles || [],
      });
      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Project updated successfully");
        if (formData.name) {
          onProjectName?.(formData.name);
        }
        const savedUsers = Array.isArray(res.data?.info?.assigned_users)
          ? res.data.info.assigned_users
          : res.data?.info;
        if (Array.isArray(savedUsers)) {
          onAssignedUsers?.(savedUsers);
        }
        await loadData({ silent: true, preferServer: true });
      } else {
        toast.error(res.data?.message || "Failed to update project");
      }
    } catch (error) {
      console.error("Failed to update project", error);
      toast.error("Failed to update project");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={8}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!project) {
    return (
      <Box p={3}>
        <Typography color="text.secondary">Project not found.</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1100,
        p: { xs: 1.5, md: 2 },
        pb: 4,
      }}
    >
      <EditProject
        embedded
        showSettingsAccess
        open
        onClose={() => undefined}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        isSaving={isSaving}
        project={project}
        assignedUsers={assignedUsers}
        onAssigneeRoleChange={onAssignedUsers}
      />
    </Box>
  );
};

export default ProjectSettingsTab;
