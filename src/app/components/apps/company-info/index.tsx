"use client";
import React, { useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { AxiosResponse } from "axios";

dayjs.extend(customParseFormat);

export interface CompanyList {
  id: number;
  created_by: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
}

const TablePagination = () => {
  const [data, setData] = useState<CompanyList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const rerender = React.useReducer(() => ({}), {})[1];

  const router = useRouter();
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  // Fetch data
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        setLoading(true);
        const res : AxiosResponse<any>= await api.get(
          `company/get-company?company_id=${user.company_id}`
        );
        if (res.data) {
          setData(res.data.info);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch company", err);
      }
    };
    fetchCompany();
  }, [api]);

  if (loading) {
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

  return <Box>{/* Render the search and table */}</Box>;
};

export default TablePagination;
