"use client";
import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import ArchiveTeam from "@/app/components/apps/teams/archive";

const ArchiveTeamListing = () => {
  return (
    <PageContainer title="Archive List" description="this is Archive List">
      <ArchiveTeam onWorkUpdated={() => {}} open={true} onClose={() => {}} />
    </PageContainer>
  );
};
export default ArchiveTeamListing;
