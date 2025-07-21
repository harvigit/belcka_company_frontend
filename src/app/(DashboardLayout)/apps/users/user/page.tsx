import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import UserList from "@/app/components/apps/users/user";
import { UserProvider } from "@/app/context/UserContext";

const UserListing = () => {
  return (
    <UserProvider>
      <PageContainer title="User" description="this is User">
        <UserList />
      </PageContainer>
    </UserProvider>
  );
};
export default UserListing;
