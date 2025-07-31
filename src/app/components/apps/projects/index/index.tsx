"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  CircularProgress,
  CardContent,
  Autocomplete,
  Typography,
} from "@mui/material";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import BlankCard from "@/app/components/shared/BlankCard";

import ProjectListing from "@/app/components/apps/projects/list";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import Cookies from "js-cookie";

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

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const [projectId, setProjectId] = useState<number | null>(null);
  const [address, setAddress] = useState<any[]>([]);

  const [budget, setBudget] = useState<number | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const res = await api.get(`project/get?company_id=${user.company_id}`);
        if (res.data?.info) {
          setData(res.data.info);

          const cookieProjectId = Cookies.get(COOKIE_PREFIX + user.id);
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

    if (user.company_id) {
      fetchProjects();
    }
  }, [user.company_id, user.id]);

  useEffect(() => {
    if (projectId && user?.id) {
      Cookies.set(COOKIE_PREFIX + user.id, projectId.toString(), {
        expires: 30,
      });
    }
  }, [projectId, user?.id]);

  useEffect(() => {
    setLoading(true);
    const fetchProjectData = async () => {
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
    setLoading(false);
    fetchProjectData();
  }, [projectId, user.company_id]);

  // Fetch addresses for selected project
  const fetchAddresses = async () => {
    try {
      const res = await api.get(`address/get?project_id=${projectId}`);
      if (res.data?.info) {
        setAddress(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch address", err);
    }
  };
  useEffect(() => {
    if (user.company_id && projectId) {
      fetchAddresses();
    }
  }, [user.company_id, projectId]);

  const formatDate = (date: string | undefined) => {
    return dayjs(date ?? "").isValid() ? dayjs(date).format("DD/MM/YYYY") : "-";
  };
  if (loading == true) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid
        size={{
          xs: 12,
          lg: 2,
        }}
      >
        <Box textAlign="center">
          <Box
            textAlign="center"
            display="flex"
            justifyContent="start"
            alignItems={"center"}
            mt={4}
            gap={2}
          >
            <Autocomplete
              fullWidth
              id="project_id"
              options={data}
              value={data.find((project) => project.id === projectId) ?? null}
              onChange={(event, newValue) => {
                setProjectId(newValue ? newValue.id : null);
              }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  placeholder="Projects"
                  className="project-selection"
                />
              )}
            />
          </Box>
          <Box mt={3}>
            <Typography textAlign={"start"} mb={2} ml={1} fontWeight={700}>
              Cashflow
            </Typography>
            <Box
              mb={1}
              pr={2}
              pl={2}
              display={"flex"}
              justifyContent={"space-between"}
              alignItems={"center"}
              textAlign={"center"}
              sx={{
                lineHeight: "16px",
                height: "35px",
                borderRadius: "25px",
                border: "1px solid #CCCCCC",
              }}
            >
              <Typography>Budget</Typography>
              <Typography color="#000000" fontWeight={700}>
                {data[0]?.currency ?? "£"}
                {budget ? budget : data[0]?.budget ?? 0}
              </Typography>
            </Box>
            <Box
              mb={1}
              pr={2}
              pl={2}
              display={"flex"}
              justifyContent={"space-between"}
              alignItems={"center"}
              textAlign={"center"}
              sx={{
                lineHeight: "16px",
                height: "35px",
                borderRadius: "25px",
                border: "1px solid #CCCCCC",
              }}
            >
              <Typography>Salary:</Typography>
              <Typography color="#FF484B" fontWeight={700}>
                {data[0]?.currency ?? "£"}
                {data[0]?.salary ?? 0}
              </Typography>
            </Box>
            <Box
              mb={1}
              pr={2}
              pl={2}
              display={"flex"}
              justifyContent={"space-between"}
              alignItems={"center"}
              textAlign={"center"}
              sx={{
                lineHeight: "16px",
                height: "35px",
                borderRadius: "25px",
                border: "1px solid #CCCCCC",
              }}
            >
              <Typography>Materials:</Typography>
              <Typography color="#FF7F00" fontWeight={700}>
                {data[0]?.currency ?? "£"}
                {data[0]?.materials ?? 0}
              </Typography>
            </Box>
            <Box
              mb={1}
              pr={2}
              pl={2}
              display={"flex"}
              justifyContent={"space-between"}
              alignItems={"center"}
              textAlign={"center"}
              sx={{
                lineHeight: "16px",
                height: "35px",
                borderRadius: "25px",
                border: "1px solid #CCCCCC",
              }}
            >
              <Typography>Profit:</Typography>
              <Typography color="#32A852" fontWeight={700}>
                {data[0]?.currency ?? "£"}
                {data[0]?.profit ?? budget ? budget : data[0]?.budget ?? 0}
              </Typography>
            </Box>
          </Box>

          {address.length > 0 && (
            <Box mt={3}>
              <Typography textAlign="start" mb={2} ml={1} fontWeight={700}>
                Activity
              </Typography>
              <Box
                sx={{
                  maxHeight: address.length > 3 ? "310px" : "350px",
                  overflow: address.length > 3 ? "auto" : "visible",
                  pr: 0,
                }}
              >
                {address.map((addr, index) => {
                  let label = "";
                  let color = "";

                  switch (addr.status_int) {
                    case 13:
                      label = "New Address";
                      color = "#A600FF";
                      break;
                    case 3:
                      label = "In Progress";
                      color = "#FF7F00";
                      break;
                    case 4:
                      label = "Completed";
                      color = "#32A852";
                      break;
                    default:
                      label = "Unknown";
                      color = "#999";
                  }

                  return (
                    <Box
                      key={addr.id ?? index}
                      mb={index === address.length - 1 ? 0 : 2}
                      pl={2}
                      pr={2}
                      mt={2}
                      position="relative"
                      display="flex"
                      alignItems="center"
                      sx={{
                        width: "100%",
                        lineHeight: "10px",
                        height: "100px",
                        borderRadius: "25px",
                        boxShadow: "rgb(33 33 33 / 12%) 0px 4px 4px 0px",
                        border: "1px solid rgb(240 240 240)",
                      }}
                    >
                      <Box
                        position="absolute"
                        top="-10px"
                        left="15px"
                        bgcolor={color}
                        px={1.5}
                        py={0.5}
                        borderRadius="10px"
                        zIndex={1}
                      >
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          color="#fff"
                        >
                          {label}
                        </Typography>
                      </Box>
                      <Box
                        display="initial"
                        width="100%"
                        textAlign="start"
                        mt={1}
                      >
                        <Typography fontSize="14px" className="multi-ellipsis">
                          {addr.name ?? `Address ${index + 1}`}
                        </Typography>
                        <Typography
                          color="textSecondary"
                          fontSize="14px"
                          textAlign="end"
                        >
                          {formatDate(addr.date_added)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      </Grid>
      <Grid
        size={{
          xs: 12,
          lg: 10,
        }}
      >
        <BlankCard>
          <CardContent sx={{ flex: 1 }}>
            <ProjectListing projectId={projectId} onProjectUpdated={fetchAddresses}/>
          </CardContent>
        </BlankCard>
      </Grid>
    </Grid>
  );
};

export default TablePagination;
