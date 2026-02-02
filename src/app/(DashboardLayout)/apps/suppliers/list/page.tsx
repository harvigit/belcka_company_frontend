import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import SupplierList from "@/app/components/apps/suppliers/list";

const SupplierListing = () => {
  return (
    <PageContainer title="Supplier List" description="this is Supplier List">
      <BlankCard>
        <SupplierList />
      </BlankCard>
    </PageContainer>
  );
};
export default SupplierListing;
