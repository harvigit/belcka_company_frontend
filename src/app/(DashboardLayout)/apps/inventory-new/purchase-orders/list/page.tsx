import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PurchaseOrderList from "@/app/components/apps/inventory-new/purchase-orders";

const PurchaseOrderListListing = () => {
  return (
    <PageContainer
      title="Purchase Orders"
      description="this is Purchase Orders"
    >
      <BlankCard>
        <PurchaseOrderList />
      </BlankCard>
    </PageContainer>
  );
};
export default PurchaseOrderListListing;
