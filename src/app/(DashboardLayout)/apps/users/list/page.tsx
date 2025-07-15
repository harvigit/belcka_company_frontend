import React from "react";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import UserList from "@/app/components/apps/users/list";
import BlankCard from "@/app/components/shared/BlankCard";
import { UserProvider } from "@/app/context/UserContext";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "User List",
  },
];

const UserListing = () => {
  return (
    <UserProvider>
      <PageContainer description="this is User List">
        <BlankCard>
          <UserList />
        </BlankCard>
      </PageContainer>
    </UserProvider>
  );
}
export default UserListing;
