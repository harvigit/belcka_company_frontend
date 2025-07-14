"use client";
import React, { createContext, useEffect, useState } from "react";
// import { TimesheetList } from '@/app/(DashboardLayout)/types/apps/permission';
import { TimesheetList } from "@/app/components/apps/timesheet/page";
import useSWR from "swr";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

interface TimesheetContextType {
  users: TimesheetList[];
  loading: boolean;
  error: Error | null;
}

export const TimesheetContext = createContext<TimesheetContextType>(
  {} as TimesheetContextType
);

export const TimesheetProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null } ;
  const {
    data: permissionData,
    error: invoiceError,
    isLoading,
    mutate,
  } = useSWR(
    "user/get-user-lists",
    async () => {
      const res = await api.get(`user/get-user-lists`);
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
  
  return (
    <UserContext.Provider
      value={{
        users: permissionData || [],
        loading,
        error: invoiceError || null,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
