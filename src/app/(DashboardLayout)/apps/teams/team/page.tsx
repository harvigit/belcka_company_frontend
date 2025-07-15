import React from "react";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import TeamList from "@/app/components/apps/teams/team";
import BlankCard from "@/app/components/shared/BlankCard";
import { TeamProvider } from "@/app/context/TeamContext";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Team",
  },
];

const TeamListing = () => {
  return (
    <TeamProvider>
      <PageContainer title="Team" description="this is Team">
          {/* <CardContent> */}
            <TeamList />
          {/* </CardContent> */}
      </PageContainer>
    </TeamProvider>
  );
}
export default TeamListing;
