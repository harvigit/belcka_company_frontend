"use client";
import React, { createContext, useEffect, useState } from "react";
// import { UserList } from '@/app/(DashboardLayout)/types/apps/permission';
import { UserList } from "@/app/components/apps/users/list";
import useSWR from "swr";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

interface TeamContextType {
  users: UserList[];
  loading: boolean;
  error: Error | null;
//   addPermission: (permission: UserList) => Promise<void>;
//   updatePermission: (updatedPermission: UserList) => Promise<void>;
//   deletePermission: (permissionId: number) => Promise<void>;
}

export const TeamContext = createContext<TeamContextType>(
  {} as TeamContextType
);

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({
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

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

//   // Add permission
//   const addPermission = async (permission: UserList) => {
//     try {
//       const payload = {
//         name: permission.name,
//         slug: permission.slug,
//         icon: permission.icon,
//         description: permission.description,
//         color: permission.color,
//         is_admin: permission.is_admin == 1 ? true : false,
//       };
//       const response = await api.post(`admin/permission-add`, payload);

//       await mutate();
//       return response.data;
//     } catch (error) {
//      console.log(error)
//     }
//   };

//   // Update permission
//   const updatePermission = async (permission: UserList) => {
//     try {
//       const payload = {
//         name: permission.name,
//         slug: permission.slug,
//         icon: permission.icon,
//         description: permission.description,
//         color: permission.color,
//         is_admin: permission.is_admin == 1 ? true : false
//       };
//       await api.post(`admin/permission-edit/${permission.id}`, payload);
//       await mutate();
//     } catch (error) {
//       console.log(error)
//     }
//   };

//   // Delete permission
//   const deletePermission = async (permissionId: number) => {
//     try {
//       await api.delete(`admin/permission-delete/${permissionId}`);

//       await mutate();
//     } catch (error) {
//       console.error("Error deleting permission:", error);
//     }
//   };

  return (
    <TeamContext.Provider
      value={{
        users: permissionData || [],
        loading,
        error: invoiceError || null,
        // addPermission,
        // updatePermission,
        // deletePermission,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};
