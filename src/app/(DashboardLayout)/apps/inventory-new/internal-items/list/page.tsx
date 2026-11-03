import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import InternalItemList from "@/app/components/apps/inventory-new/internal-items";

const InternalItemListing = () => {
  return (
    <PageContainer title="Internal Items" description="this is Internal Items">
      <BlankCard>
        <InternalItemList />
      </BlankCard>
    </PageContainer>
  );
};
export default InternalItemListing;
