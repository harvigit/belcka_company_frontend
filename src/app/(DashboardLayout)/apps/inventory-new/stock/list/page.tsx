import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import StockList from "@/app/components/apps/inventory-new/stock";

const StockListListing = () => {
  return (
    <PageContainer
      title="Stock & Reorder"
      description="this is Stock & Reorder"
    >
      <BlankCard>
        <StockList />
      </BlankCard>
    </PageContainer>
  );
};
export default StockListListing;
