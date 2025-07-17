import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import React from "react";
import BlankCard from "@/app/components/shared/BlankCard";
import { CardContent } from "@mui/material";
import { TeamProvider } from "@/app/context/TeamContext";
import CreateTeam from "@/app/components/apps/teams/create";


const CreateTrade = () => {
  return (
    <TeamProvider>
      <PageContainer title="Create Team" description="this is Trade"> 
        <BlankCard>
          <CardContent sx={{width: "70%"}}>
            <CreateTeam />
          </CardContent>
        </BlankCard>
      </PageContainer>
    </TeamProvider>
  );
};
export default CreateTrade;
