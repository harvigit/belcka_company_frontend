import React from "react";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import ArchiveList from "@/app/components/apps/teams/archive";
import BlankCard from "@/app/components/shared/BlankCard";
import { TeamProvider } from "@/app/context/TeamContext";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Archive List",
  },
];

const ArchiveTeamListing = () => {
  return (
    <TeamProvider>
      <PageContainer title="Archive List" description="this is Archive List">
        <Breadcrumb title="Archive List" items={BCrumb} />
        {/* <BlankCard> */}
          {/* <CardContent> */}
            <ArchiveList />
          {/* </CardContent> */}
        {/* </BlankCard> */}
      </PageContainer>
    </TeamProvider>
  );
}
export default ArchiveTeamListing;
