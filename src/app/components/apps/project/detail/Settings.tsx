"use client";

import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import EditProject from "@/app/components/apps/projects/edit";

type ProjectSettingsTabProps = {
  projectId: number;
  onProjectName?: (name: string) => void;
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
  company_id: 0,
  workzone_ids: "",
};

const ProjectSettingsTab: React.FC<ProjectSettingsTabProps> = ({
  projectId,
  onProjectName,
}) => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [formData, setFormData] = useState<any>(emptyFormData);

  const loadData = async (options?: { silent?: boolean }) => {
    if (!projectId || !user?.company_id) return;
    if (!options?.silent) setLoading(true);
    try {
      const projectRes = await api.get(
        `project/get?company_id=${user.company_id}&project_id=${projectId}`,
      );
      const projectRow = Array.isArray(projectRes.data?.info)
        ? projectRes.data.info[0]
        : projectRes.data?.info;
      setProject(projectRow || null);
      if (projectRow?.name) {
        onProjectName?.(projectRow.name);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !formData?.id) return;
    setIsSaving(true);
    try {
      const res = await api.put("project/update", formData);
      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Project updated successfully");
        if (formData.name) {
          onProjectName?.(formData.name);
        }
        await loadData({ silent: true });
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
      />
    </Box>
  );
};

export default ProjectSettingsTab;
