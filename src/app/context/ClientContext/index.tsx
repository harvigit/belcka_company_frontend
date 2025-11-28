"use client";
import React, { createContext, useEffect, useState } from "react";

import useSWR from "swr";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
interface ClientContextType {
  clients: any[];
  loading: boolean;
  error: Error | null;
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
      const res = await api.get(
        `company-clients/get?company_id=${user.company_id}`
      );
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
    <ClientContext.Provider
      value={{
        clients: teamData || [],
        loading,
        error: invoiceError || null,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};
