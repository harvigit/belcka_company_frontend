import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import TeamList from "@/app/components/apps/teams/team";

const TeamListing = () => {
  return (
    <PageContainer title="Team" description="this is Team">
      <TeamList />
    </PageContainer>
  );
};
export default TeamListing;
