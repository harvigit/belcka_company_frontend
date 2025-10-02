"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Grid,
  Autocomplete,
} from "@mui/material";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import { User } from "next-auth";

export type ProjectList = {
  id: number;
  name: string;
};

export type ClientList = {
  id: number;
  company_id?: number;
  name?: string;
  email: string;
  status: string;
  invite_date: string;
  expired_on: string;
  projects: string;
  company_name: string;
  phone: number;
  first_name?: string;
  last_name?: string;
  extension?: string;
  project_ids: string;
  expire_date: string;
};

interface Props {
  open: boolean;
  id: number | null;
  onClose: () => void;
  onWorkUpdated?: () => void;
}

const EditClient = ({ open, onClose, onWorkUpdated, id }: Props) => {
  const [data, setData] = useState<ClientList[]>([]);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [firstName, setfirstName] = useState("");
  const [lastName, setlastName] = useState("");
  const [expireDate, setExpireDate] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<ProjectList[]>([]);
  const [projects, setProjects] = useState<ProjectList[]>([]);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  // Fetch all projects
  const fetchProjects = async () => {
    try {
      const res = await api.get(`project/get?company_id=${user.company_id}`);
      if (res.data?.info) {
        setProjects(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  // Fetch unique client
  const fetchClients = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(
        `company-clients/get?company_id=${user.company_id}&client_id=${id}`
      );
      if (res.data?.info?.length > 0) {
        const client = res.data.info[0];
        setData([client]);

        setfirstName(client.first_name || "");
        setlastName(client.last_name || "");
        setEmail(client.email || "");
        // When setting expireDate from API
        setExpireDate(
          client.expire_date ? client.expire_date.split("T")[0] : ""
        );

        const clientProjectIds = client.project_ids
          .split(",")
          .map((idStr: any) => parseInt(idStr.trim()))
          .filter((id: any) => !isNaN(id));

        const matchedProjects = projects.filter((project) =>
          clientProjectIds.includes(project.id)
        );

        setSelectedProjects(matchedProjects);
      }
    } catch (err) {
      console.error("Failed to fetch clients", err);
    } finally {
    }
  }, [id, projects]);

  useEffect(() => {
    if (user.company_id) {
      fetchProjects();
    }
  }, [user.company_id]);

  useEffect(() => {
    if (projects.length > 0 && id) {
      fetchClients();
    }
  }, [projects, id]);

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedIds = selectedProjects.map((p) => p.id).join(",");
      const payload = {
        id,
        first_name: firstName,
        last_name: lastName,
        email,
        user_role_id: 3,
        company_id: user.company_id,
        project_ids: selectedIds,
        expire_date: expireDate
      };

      const response = await api.post("company-clients/edit", payload);

      if (response.data.IsSuccess) {
        onWorkUpdated?.();
        toast.success(response.data.message);
        onClose();
      }
    } catch (error) {
      console.error("Error saving client:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, pt: 1,marginBottom: 4 }}>
      <Grid size={{ xs: 12, lg: 12 }}>
        <Box>
          <form onSubmit={handleEditClient}>
            <Stack mb={3}>
              <Box display={"flex"} gap={3}>
                <Box className="form_inputs">
                  <Typography variant="caption" mt={2}>
                    First Name
                  </Typography>
                  <CustomTextField
                    variant="outlined"
                    fullWidth
                    value={firstName}
                    onChange={(e: any) => setfirstName(e.target.value)}
                  />
                </Box>
                <Box className="form_inputs">
                  <Typography variant="caption" mt={2}>
                    Last Name
                  </Typography>
                  <CustomTextField
                    variant="outlined"
                    fullWidth
                    value={lastName}
                    onChange={(e: any) => setlastName(e.target.value)}
                  />
                </Box>
              </Box>

              <Box display={"flex"} gap={3}>
                <Box className="form_inputs" mt={3}>
                  <Typography variant="caption">Email Address</Typography>
                  <CustomTextField
                    variant="outlined"
                    fullWidth
                    value={email}
                    onChange={(e: any) => setEmail(e.target.value)}
                  />
                </Box>
                <Box className="form_inputs" mt={3}>
                  <Typography>Select Projects</Typography>
                  <Autocomplete
                    fullWidth
                    multiple
                    id="project_id"
                    options={projects}
                    open={dialogOpen}
                    onOpen={() => setDialogOpen(true)}
                    onClose={() => setDialogOpen(false)}
                    value={selectedProjects}
                    onChange={(event, newValue) =>
                      setSelectedProjects(newValue)
                    }
                    getOptionLabel={(option) => option?.name || ""}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    renderInput={(params) => (
                      <CustomTextField
                        {...params}
                        placeholder="Select Projects"
                        onClick={() => setDialogOpen(true)}
                      />
                    )}
                  />
                </Box>
              </Box>
              <Box display={"flex"} gap={3}>
                <Box className="form_inputs" mt={3}>
                  <Typography>Select Expiry time</Typography>
                  <CustomTextField
                    type="date"
                    id="invite_date"
                    placeholder="Choose Expiry date"
                    fullWidth
                    value={expireDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const newDate = e.target.value;
                      setExpireDate(newDate);

                      setData((prev) => {
                        const updated = [...prev];
                        if (updated[0]) {
                          updated[0].expire_date = newDate;
                        }
                        return updated;
                      });
                    }}
                  />
                </Box>
                <Box className="form_inputs" mt={3}></Box>
              </Box>
            </Stack>
            <Button
              color="primary"
              variant="contained"
              size="large"
              type="submit"
              disabled={loading}
              sx={{ width: "20%" }}
            >
              {loading ? "Saving..." : "Update Client"}
            </Button>
          </form>
        </Box>
      </Grid>
    </Box>
  );
};

export default EditClient;
