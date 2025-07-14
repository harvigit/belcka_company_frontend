import React from "react";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import UserList from "@/app/components/apps/users/user";
import { UserProvider } from "@/app/context/UserContext";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "User",
  },
];

const UserListing = () => {
  return (
    <UserProvider>
      <PageContainer title="User" description="this is User">
        <Breadcrumb title="User" items={BCrumb} />
          {/* <CardContent> */}
            <UserList />
          {/* </CardContent> */}
      </PageContainer>
    </UserProvider>
  );
}
export default UserListing;
