import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import InternalOrderList from "@/app/components/apps/inventory-new/internal-orders";

const InternalOrderListListing = () => {
  return (
    <PageContainer
      title="Internal Orders"
      description="this is Internal Orders"
    >
      <BlankCard>
        <InternalOrderList />
      </BlankCard>
    </PageContainer>
  );
};
export default InternalOrderListListing;
