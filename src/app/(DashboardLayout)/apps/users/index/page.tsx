import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import { UserProvider } from "@/app/context/UserContext";
import UserIndex from "@/app/components/apps/users";

const UserListing = () => {
  return (
    <UserProvider>
      <PageContainer description="this is User List">
        <BlankCard>
          <UserIndex />
        </BlankCard>
      </PageContainer>
    </UserProvider>
  );
}
export default UserListing;
