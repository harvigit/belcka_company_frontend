"use client";
import React, { createContext, useEffect, useState } from "react";

import useSWR from "swr";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { ProjectList } from "@/app/components/apps/projects/list";

interface ProjectContextType {
  teams: ProjectList[];
  loading: boolean;
  error: Error | null;
  addTeam: (newTeam: ProjectList) => Promise<void>;
  updateTeam: (updateTeam: ProjectList) => Promise<void>;
}

export const TeamContext = createContext<ProjectContextType>(
  {} as ProjectContextType
);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const {
    data: teamData,
    error: invoiceError,
    isLoading,
    mutate,
  } = useSWR(
    `project/get?company_id=${user.company_id}`,
    async () => {
      const res = await api.get(`project/get?company_id=${user.company_id}`);
      return res.data.info || [];
    },
    {
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  //   // Add permission
  const addTeam = async (team: ProjectList) => {
    try {
      const payload = {
        name: team.name,
        company_id: user.company_id,
      };
      const response = await api.post(`team/add`, payload);
      await mutate();
      return response.data;
    } catch (error) {
      console.log(error);
    }
  };

  //   // Update permission
  const updateTeam = async (team: ProjectList) => {
    try {
      const payload = {
        id: team.id,
        name: team.name,
        company_id: user.company_id,
      };
      await api.put(`team/update-team`, payload);
      await mutate();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <TeamContext.Provider
      value={{
        teams: teamData || [],
        loading,
        error: invoiceError || null,
        addTeam,
        updateTeam,
        
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};
