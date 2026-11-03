import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import StoreItemList from "@/app/components/apps/inventory-new/store-items";

const StoreItemListing = () => {
  return (
    <PageContainer title="Store Items" description="this is Store Items">
      <BlankCard>
        <StoreItemList />
      </BlankCard>
    </PageContainer>
  );
};
export default StoreItemListing;
