import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import { TeamProvider } from "@/app/context/TeamContext";
import ArchiveTeam from "@/app/components/apps/teams/archive";

const ArchiveTeamListing = () => {
  return (
    <TeamProvider>
      <PageContainer title="Archive List" description="this is Archive List">
        <ArchiveTeam onWorkUpdated={() => {}} open={true} onClose={() => {}} />
      </PageContainer>
    </TeamProvider>
  );
};
export default ArchiveTeamListing;
