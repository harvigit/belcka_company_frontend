import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import { CardContent } from "@mui/material";
import { TeamProvider } from "@/app/context/TeamContext";
import EditTeamPage from "@/app/components/apps/teams/edit";

const TradeEdit = () => {
  return (
    <TeamProvider>
      <PageContainer title="Edit Trade" description="this is Edit Trade">
        <BlankCard>
          <CardContent sx={{width: "70%"}}>
            <EditTeamPage />
          </CardContent>
        </BlankCard>
      </PageContainer>
    </TeamProvider>
  );
};

export default TradeEdit;
