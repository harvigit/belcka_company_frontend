"use client";

import React, { useEffect, useState } from "react";
import { Grid, CardContent } from "@mui/material";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import BlankCard from "@/app/components/shared/BlankCard";

import ProjectListing from "@/app/components/apps/projects/list";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

dayjs.extend(customParseFormat);

export type ProjectList = {
  id: number;
  name: string;
  currency: string | null;
  address: string;
  budget: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  progress: string;
  check_ins: number;
  salary: number | null;
  materials: number | null;
  profit: number | null;
  date_added: string;
};
const COOKIE_PREFIX = "project_";

const TablePagination = () => {
  const [data, setData] = useState<ProjectList[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [projectId, setProjectId] = useState<number | null>(null);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [address, setAddress] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [budget, setBudget] = useState<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<any>({
    name: "",
    address: "",
    budget: "",
    description: "",
    code: "",
    shift_ids: "",
    team_ids: "",
    company_id: user.company_id,
  });

  useEffect(() => {
    const queryProjectId = searchParams ? searchParams.get("id") : "";
    if (queryProjectId) {
      setProjectId(Number(queryProjectId));
      if (user?.id && user?.company_id) {
        Cookies.set(COOKIE_PREFIX + user.id + user.company_id, queryProjectId, {
          expires: 30,
        });
      }
      router.push("/apps/projects/index");
    }
  }, [searchParams, user?.id, user?.company_id]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get(`project/get?company_id=${user.company_id}`);
      if (res.data?.info) {
        setData(res.data.info);

        const cookieProjectId = Cookies.get(
          COOKIE_PREFIX + user.id + user.company_id
        );
        const validProjectId = res.data.info.some(
          (p: any) => p.id === Number(cookieProjectId)
        )
          ? Number(cookieProjectId)
          : res.data.info[0]?.id;

        setProjectId(validProjectId);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
    setLoading(false);
  };
  useEffect(() => {
    if (user.company_id) {
      fetchProjects();
    }
  }, [user.company_id, user.id]);

  useEffect(() => {
    if (projectId && user?.id) {
      Cookies.set(
        COOKIE_PREFIX + user.id + user.company_id,
        projectId.toString(),
        {
          expires: 30,
        }
      );
    }
  }, [projectId, user?.id]);

  const fetchProjectData = async () => {
    setLoading(false);

    if (!projectId) return;
    try {
      const res = await api.get(`project/get?company_id=${user.company_id}`);
      if (res.data?.info) {
        const projectList = res.data.info;
        const selectedProject = projectList.find(
          (p: any) => p.id === projectId
        );
        if (selectedProject) {
          setBudget(selectedProject.budget);
        }
      }
    } catch (err) {
      console.error("Failed to refresh project data", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchProjectData();
  }, [projectId, user.company_id]);

  // Fetch addresses for selected project
  const fetchAddresses = async () => {
    try {
      const res = await api.get(`project/get-history?project_id=${projectId}`);
      if (res.data?.info) {
        setAddress(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch address", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        company_id: user.company_id,
        budget: Number(formData.budget),
      };

      const result = await api.post("project/create", payload);
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          name: "",
          address: "",
          budget: "",
          description: "",
          code: 0,
          shift_ids: "",
          team_ids: "",
          company_id: user.company_id,
          is_pricework: false,
          repeatable_job: false,
        });
        fetchProjects();
        setProjectOpen(false);
      } else {
        toast.error(result.data.message);
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (user.company_id && !Number.isNaN(projectId) && projectId !== null) {
      fetchAddresses();
    }
  }, [user.company_id, projectId]);

  // if (loading == true) {
  //   return (
  //     <Box
  //       display="flex"
  //       justifyContent="center"
  //       alignItems="center"
  //       minHeight="300px"
  //     >
  //       <CircularProgress />
  //     </Box>
  //   );
  // }

  return (
    <Grid container spacing={3}>
      <Grid
        size={{
          xs: 12,
          lg: 12,
        }}
      >
        <BlankCard>
          <CardContent sx={{ flex: 1 }}>
            <ProjectListing
              projectId={projectId}
              onProjectUpdated={fetchAddresses}
            />
          </CardContent>
        </BlankCard>
      </Grid>
    </Grid>
  );
};

export default TablePagination;
