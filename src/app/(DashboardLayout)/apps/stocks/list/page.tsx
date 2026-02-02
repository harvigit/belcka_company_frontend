import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import StockList from "@/app/components/apps/stocks/list";

const StockListing = () => {
  return (
    <PageContainer title="Stock List" description="this is Stock List">
      <BlankCard>
        <StockList />
      </BlankCard>
    </PageContainer>
  );
};
export default StockListing;
