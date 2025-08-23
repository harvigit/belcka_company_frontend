"use client";
import React, { createContext, useEffect, useState } from "react";

import useSWR from "swr";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { TeamList } from "@/app/components/apps/teams/list";

interface ClientContextType {
  teams: TeamList[];
  loading: boolean;
  error: Error | null;
  addTeam: (newTeam: TeamList) => Promise<void>;
  updateTeam: (updateTeam: TeamList) => Promise<void>;
}

export const ClientContext = createContext<ClientContextType>(
  {} as ClientContextType
);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({
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
    `company-clients/get?company_id=${user.company_id}`,
    async () => {
      const res = await api.get(`company-clients/get?company_id=${user.company_id}`);
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
  const addTeam = async (team: TeamList) => {
    try {
      const payload = {
        name: team.name,
        supervisor_id: team.supervisor_id,
        company_id: user.company_id,
        team_member_ids: team.team_member_ids.join(","),
      };
      const response = await api.post(`team/add`, payload);
      await mutate();
      return response.data;
    } catch (error) {
      console.log(error);
    }
  };

  //   // Update permission
  const updateTeam = async (team: TeamList) => {
    try {
      const payload = {
        id: team.id,
        name: team.name,
        supervisor_id: team.supervisor_id,
        company_id: user.company_id,
        team_member_ids: team.team_member_ids.join(",") ?? [],
      };
      await api.put(`team/update-team`, payload);
      await mutate();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <ClientContext.Provider
      value={{
        teams: teamData || [],
        loading,
        error: invoiceError || null,
        addTeam,
        updateTeam,
        
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};
