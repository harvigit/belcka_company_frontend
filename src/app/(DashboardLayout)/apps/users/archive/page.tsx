import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import ArchiveUserList from "@/app/components/apps/users/archive";

const ArchiveUserListing = () => {
  return (
    <PageContainer description="this is User List">
      <BlankCard>
        <ArchiveUserList />
      </BlankCard>
    </PageContainer>
  );
};
export default ArchiveUserListing;
