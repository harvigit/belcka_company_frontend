import React from "react";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import TeamList from "@/app/components/apps/teams/list";
import BlankCard from "@/app/components/shared/BlankCard";
import { TeamProvider } from "@/app/context/TeamContext";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Team List",
  },
];

const TeamListing = () => {
  return (
    <TeamProvider>
      <PageContainer title="Team List" description="this is Team List">
        <Breadcrumb title="" items={BCrumb} />
        <BlankCard>
          {/* <CardContent> */}
            <TeamList />
          {/* </CardContent> */}
        </BlankCard>
      </PageContainer>
    </TeamProvider>
  );
}
export default TeamListing;
