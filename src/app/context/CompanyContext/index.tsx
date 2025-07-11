"use client";
import React, { createContext, useEffect, useState } from "react";
import { UserList } from "@/app/components/apps/users/list";
import useSWR from "swr";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

interface CompanyContextType {
  users: UserList[];
  loading: boolean;
  error: Error | null;
}

export const CompanyContext = createContext<CompanyContextType>(
  {} as CompanyContextType
);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({
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
    `company/get-company?company_id=${user.company_id}`,
    async () => {
      const res = await api.get(`company/get-company?company_id=${user.company_id}`);
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
    <CompanyContext.Provider
      value={{
        users: permissionData || [],
        loading,
        error: invoiceError || null,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};
