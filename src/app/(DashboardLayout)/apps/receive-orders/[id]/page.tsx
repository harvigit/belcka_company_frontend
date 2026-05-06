import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import ReceivePurchaseOrder from "@/app/components/apps/receive-orders/index";

const receivePurchaseOrder = () => {
  return (
    <PageContainer
      title="Receive purchase order"
      description="this is receive purchase order"
    >
      <BlankCard>
        <ReceivePurchaseOrder />
      </BlankCard>
    </PageContainer>
  );
};

export default receivePurchaseOrder;
