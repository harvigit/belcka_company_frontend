import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import Leaves from "@/app/components/apps/leaves";

const LeavesListing = () => {
  return (
    <PageContainer title="Leaves" description="This is Leaves List">
      <PermissionGuard permission="Bookkeeper">
        <BlankCard>
          <Leaves />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
};

export default LeavesListing;
