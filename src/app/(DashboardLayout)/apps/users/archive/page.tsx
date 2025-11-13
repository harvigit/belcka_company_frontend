import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import { UserProvider } from "@/app/context/UserContext";
import ArchiveUserList from "@/app/components/apps/users/archive";

const ArchiveUserListing = () => {
  return (
    <UserProvider>
      <PageContainer description="this is User List">
        <BlankCard>
          <ArchiveUserList />
        </BlankCard>
      </PageContainer>
    </UserProvider>
  );
}
export default ArchiveUserListing;
