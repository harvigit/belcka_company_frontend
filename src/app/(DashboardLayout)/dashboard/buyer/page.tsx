"use client";
import { Box } from "@mui/material";
import PageContainer from "@/app/components/container/PageContainer";
import BuyerDashboard from "@/app/components/apps/dashboard/index/buyer";

export default function Dashboard() {
  return (
    <PageContainer title="Dashboard" description="this is Dashboard">
      <Box>
        <BuyerDashboard />
      </Box>
    </PageContainer>
  );
}
