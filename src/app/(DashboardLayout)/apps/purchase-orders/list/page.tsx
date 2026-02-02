import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PurchaseOrderList from "@/app/components/apps/purchase-orders/list";

const OrderListing = () => {
  return (
    <PageContainer
      title="Purchase Order List"
      description="this is Purchase Order List"
    >
      <BlankCard>
        <PurchaseOrderList />
      </BlankCard>
    </PageContainer>
  );
};
export default OrderListing;
