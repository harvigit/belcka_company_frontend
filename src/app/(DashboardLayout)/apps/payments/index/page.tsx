import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PaymentList from "@/app/components/apps/payments/list";

const PaymentListing = () => {
  return (
    <PageContainer title="Payment List" description="this is Payment List">
      <BlankCard>
        <PaymentList />
      </BlankCard>
    </PageContainer>
  );
};
export default PaymentListing;
