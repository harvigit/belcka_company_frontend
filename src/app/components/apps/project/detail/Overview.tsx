"use client";

import React from "react";
import {
  Box,
} from "@mui/material";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
dayjs.extend(customParseFormat);

const Overview = ({
  projectId,
  onProjectName,
  onNavigateTab,
}: {
  projectId: number;
  onProjectName?: (name: string) => void;
  onNavigateTab?: (tab: string) => void;
}) => {
  const { data: session } = useSession();
  const user = session?.user as User & { company_id?: number | null };

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 2 },
        bgcolor: "#F4F7FB",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      
    </Box>
  );
};

export default Overview;
