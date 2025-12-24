import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import TeamList from "@/app/components/apps/teams/list";
import BlankCard from "@/app/components/shared/BlankCard";

const TeamListing = () => {
  return (
      <PageContainer title="Team List" description="this is Team List">
        <BlankCard>
          <TeamList />
        </BlankCard>
      </PageContainer>
  );
};
export default TeamListing;
