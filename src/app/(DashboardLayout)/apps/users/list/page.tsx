import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import UserList from "@/app/components/apps/users/list";
import BlankCard from "@/app/components/shared/BlankCard";

const UserListing = () => {
  return (
    <PageContainer description="this is User List">
      <BlankCard>
        <UserList />
      </BlankCard>
    </PageContainer>
  );
};
export default UserListing;
