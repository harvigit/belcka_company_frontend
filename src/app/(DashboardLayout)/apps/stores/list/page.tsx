import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import StoreList from "@/app/components/apps/stores/list";

const StoreListing = () => {
  return (
    <PageContainer title="Store List" description="this is Store List">
      <BlankCard>
        <StoreList />
      </BlankCard>
    </PageContainer>
  );
};
export default StoreListing;
