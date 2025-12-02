"use client";
import React, { createContext, useEffect, useState } from "react";

import useSWR from "swr";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { TeamList } from "@/app/components/apps/teams/list";

interface TeamContextType {
  teams: TeamList[];
  // loading: boolean;
  error: Error | null;
  addTeam: (newTeam: TeamList) => Promise<void>;
  updateTeam: (updateTeam: TeamList) => Promise<void>;
}

export const TeamContext = createContext<TeamContextType>(
  {} as TeamContextType
);

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const {
    data: teamData,
    error: invoiceError,
    // isLoading,
    mutate,
  } = useSWR(
    "team/get-team-member-list",
    async () => {
      const res = await api.get(`team/get-team-member-list`);
      return res.data.info || [];
    },
    {
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // const [loading, setLoading] = useState<boolean>(true);

  // useEffect(() => {
  //   setLoading(isLoading);
  // }, [isLoading]);

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
    <TeamContext.Provider
      value={{
        teams: teamData || [],
        // loading,
        error: invoiceError || null,
        addTeam,
        updateTeam,
        
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};
