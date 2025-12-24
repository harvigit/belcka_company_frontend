import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import UserList from "@/app/components/apps/users/[id]";

const UserListing = () => {
  return (
    <PageContainer title="User" description="this is User">
      <UserList />
    </PageContainer>
  );
};
export default UserListing;
