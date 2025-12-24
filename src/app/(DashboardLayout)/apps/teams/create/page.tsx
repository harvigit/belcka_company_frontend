import PageContainer from "@/app/components/container/PageContainer";
import React from "react";
import BlankCard from "@/app/components/shared/BlankCard";
import { CardContent } from "@mui/material";
import CreateTeam from "@/app/components/apps/teams/create";

const CreateTrade = () => {
  return (
    <PageContainer title="Create Team" description="this is Trade">
      <BlankCard>
        <CardContent sx={{ width: "70%" }}>
          <CreateTeam open={true} onClose={() => {}} />
        </CardContent>
      </BlankCard>
    </PageContainer>
  );
};
export default CreateTrade;
